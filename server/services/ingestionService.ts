import { query, pool, isDbConnected } from "../config/db";
import { analyzeComplaint, ComplaintAnalysisResult } from "./geminiService";
import { detectRepeatedIssue } from "./repeatedIssueService";
import { assignEmployeeForComplaint } from "./taskAssignmentService";
import { addMemoryEntry } from "./memoryStore";
import { broadcastRealtimeUpdate } from "./realtimeService";

export interface IncomingComplaintPayload {
  source: "Website" | "Gmail" | "WhatsApp" | "E-Commerce" | "Manual" | string;
  externalMessageId?: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  subject?: string;
  message: string;
  rating?: number | null;
  product?: string | null;
  attachmentUrl?: string | null;
  rawData?: any;
}

export interface IngestionResult {
  success: boolean;
  messageId: number | null;
  complaintId?: number | null;
  taskId?: number | null;
  isComplaint?: boolean;
  assignedEmployeeName?: string | null;
  analysis?: ComplaintAnalysisResult;
  error?: string;
  duplicate?: boolean;
  message?: string;
}

export async function processIncomingMessage(payload: IncomingComplaintPayload): Promise<IngestionResult> {
  const startTime = Date.now();
  console.log(`[Ingestion] Received incoming message from source: "${payload.source}" - Subject: "${payload.subject || 'N/A'}"`);

  // 1. Basic validation
  if (!payload.message || typeof payload.message !== "string" || !payload.message.trim()) {
    throw new Error("Message content cannot be empty.");
  }

  const normalizedSource = payload.source || "Website";

  // Step 1: Run AI analysis and repeated check OUTSIDE of any database transaction
  const repeatedCheck = await Promise.race([
    detectRepeatedIssue({
      product: payload.product,
      senderEmail: payload.senderEmail,
      subject: payload.subject,
      messageContent: payload.message,
    }),
    new Promise<{ isRepeated: boolean; matchCount: number }>((resolve) =>
      setTimeout(() => resolve({ isRepeated: false, matchCount: 0 }), 1500)
    ),
  ]).catch(() => ({ isRepeated: false, matchCount: 0 }));

  const analysis = await analyzeComplaint(
    payload.message,
    payload.subject,
    payload.rating,
    repeatedCheck.isRepeated
  );

  const isComplaint =
    normalizedSource === "WhatsApp" ||
    normalizedSource === "Gmail" ||
    normalizedSource === "Website" ||
    normalizedSource === "Manual" ||
    analysis.sentiment === "Negative" ||
    analysis.sentiment === "Neutral" ||
    (payload.rating !== undefined && payload.rating !== null && payload.rating <= 3);

  let assignment = { employeeId: 1, employeeName: "Keya" };
  if (isComplaint) {
    try {
      assignment = await assignEmployeeForComplaint(analysis.category, analysis.severity);
    } catch (e) {
      // fallback to default assignee
    }
  }

  // Step 2: Try fast PostgreSQL persistence
  let client;
  try {
    client = await pool.connect();
  } catch (connErr: any) {
    console.warn("[Ingestion] Database connection failed, falling back to live memory store:", connErr.message);
    const { messageId, complaintId, taskId } = addMemoryEntry({
      source: normalizedSource,
      senderName: payload.senderName,
      senderEmail: payload.senderEmail,
      senderPhone: payload.senderPhone,
      subject: payload.subject,
      message: payload.message,
      rating: payload.rating,
      product: payload.product,
      analysis,
      assignedEmployeeName: assignment.employeeName,
    });
    broadcastRealtimeUpdate({ type: "NEW_TICKET", complaintId, taskId, source: normalizedSource });
    return {
      success: true,
      messageId,
      complaintId,
      taskId,
      isComplaint,
      assignedEmployeeName: assignment.employeeName,
      analysis,
    };
  }

  try {
    // Deduplication check
    if (payload.externalMessageId) {
      const existing = await client.query(
        `SELECT message_id FROM source_messages WHERE external_message_id = $1 LIMIT 1`,
        [payload.externalMessageId]
      );
      if (existing.rows.length > 0) {
        return {
          success: true,
          duplicate: true,
          messageId: existing.rows[0].message_id,
          message: "Message already ingested; skipped duplicate.",
        };
      }
    }

    if (payload.senderPhone || payload.senderEmail) {
      const senderCol = payload.senderPhone ? "sender_phone" : "sender_email";
      const senderVal = payload.senderPhone || payload.senderEmail;
      const dupMsg = await client.query(
        `SELECT message_id FROM source_messages 
         WHERE ${senderCol} = $1 AND TRIM(message_content) = TRIM($2)
         LIMIT 1`,
        [senderVal, payload.message.trim()]
      );
      if (dupMsg.rows.length > 0) {
        return {
          success: true,
          duplicate: true,
          messageId: dupMsg.rows[0].message_id,
          message: "Duplicate message from this sender already exists; skipped duplicate.",
        };
      }
    }

    // 2. Identify or register SOURCE (outside transaction to avoid lock contention)
    let sourceId: number = 1;
    const sourceLookup = await client.query(
      `SELECT source_id FROM sources WHERE LOWER(source_name) = LOWER($1) LIMIT 1`,
      [normalizedSource]
    );

    if (sourceLookup.rows.length > 0) {
      sourceId = sourceLookup.rows[0].source_id;
    } else {
      let sourceType = "manual";
      const sLower = normalizedSource.toLowerCase();
      if (sLower.includes("gmail") || sLower.includes("email")) sourceType = "email";
      else if (sLower.includes("whatsapp")) sourceType = "messaging";
      else if (sLower.includes("commerce")) sourceType = "ecommerce";
      else if (sLower.includes("web")) sourceType = "web";

      const insertSource = await client.query(
        `INSERT INTO sources (source_name, source_type, connection_status, last_sync)
         VALUES ($1, $2, 'connected', CURRENT_TIMESTAMP)
         ON CONFLICT (source_name) DO UPDATE SET last_sync = CURRENT_TIMESTAMP
         RETURNING source_id`,
        [normalizedSource, sourceType]
      );
      sourceId = insertSource.rows[0].source_id;
    }

    await client.query("BEGIN");

    // 3. Store SOURCE_MESSAGE
    const insertMessage = await client.query(
      `INSERT INTO source_messages (
        source_id, external_message_id, sender_name, sender_email, sender_phone,
        subject, message_content, rating, product, attachment_url, raw_data, processing_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
      RETURNING message_id`,
      [
        sourceId,
        payload.externalMessageId || null,
        payload.senderName || null,
        payload.senderEmail || null,
        payload.senderPhone || null,
        payload.subject || null,
        payload.message.trim(),
        payload.rating !== undefined ? payload.rating : null,
        payload.product || null,
        payload.attachmentUrl || null,
        payload.rawData ? JSON.stringify(payload.rawData) : null,
      ]
    );
    const messageId = insertMessage.rows[0].message_id;

    // 4. Store AI_ANALYSIS
    await client.query(
      `INSERT INTO ai_analyses (
        message_id, sentiment, category, severity_level, repeated_issue,
        summary, ai_recommendation, confidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        messageId,
        analysis.sentiment,
        analysis.category,
        analysis.severity,
        analysis.repeatedIssue,
        analysis.summary,
        analysis.recommendation,
        analysis.confidence,
      ]
    );

    let complaintId: number | null = null;
    let taskId: number | null = null;

    if (isComplaint) {
      // 5. Find or create Category
      let categoryId: number | null = null;
      const catQuery = await client.query(
        `SELECT category_id FROM categories WHERE LOWER(category_name) = LOWER($1) LIMIT 1`,
        [analysis.category]
      );
      if (catQuery.rows.length > 0) {
        categoryId = catQuery.rows[0].category_id;
      } else {
        const catInsert = await client.query(
          `INSERT INTO categories (category_name, description) 
           VALUES ($1, $2)
           ON CONFLICT (category_name) DO UPDATE SET description = EXCLUDED.description
           RETURNING category_id`,
          [analysis.category, `Complaints regarding ${analysis.category}`]
        );
        categoryId = catInsert.rows[0].category_id;
      }

      // 6. Create COMPLAINT record
      const complaintSubject = payload.subject || `${analysis.category} issue reported via ${normalizedSource}`;
      const insertComplaint = await client.query(
        `INSERT INTO complaints (
          message_id, category_id, subject, description, severity, status
        ) VALUES ($1, $2, $3, $4, $5, 'Pending')
        RETURNING complaint_id`,
        [messageId, categoryId, complaintSubject, payload.message, analysis.severity]
      );
      complaintId = insertComplaint.rows[0].complaint_id;

      // Determine task priority
      let taskPriority: "Low" | "Medium" | "High" = "Medium";
      if (analysis.severity === "Critical" || analysis.severity === "High") taskPriority = "High";
      else if (analysis.severity === "Low") taskPriority = "Low";

      const slaHours = analysis.severity === "Critical" ? 4 : analysis.severity === "High" ? 12 : 24;
      const dueDate = new Date(Date.now() + slaHours * 60 * 60 * 1000);

      const insertTask = await client.query(
        `INSERT INTO tasks (
          complaint_id, assigned_employee_id, priority, status, due_date
        ) VALUES ($1, $2, $3, 'Pending', $4)
        RETURNING task_id`,
        [complaintId, assignment.employeeId, taskPriority, dueDate]
      );
      taskId = insertTask.rows[0].task_id;

      // 7. Create STATUS_HISTORY audit entry
      await client.query(
        `INSERT INTO status_history (
          complaint_id, status, remarks
        ) VALUES ($1, 'Pending', $2)`,
        [
          complaintId,
          `Auto-ingested from ${normalizedSource}. AI classified as "${analysis.category}" (${analysis.severity} severity). Assigned to ${assignment.employeeName || 'unassigned queue'}.`
        ]
      );

      // 8. Update SOURCE_MESSAGE processing status
      await client.query(
        `UPDATE source_messages SET processing_status = 'converted_to_complaint' WHERE message_id = $1`,
        [messageId]
      );
    } else {
      await client.query(
        `UPDATE source_messages SET processing_status = 'ignored' WHERE message_id = $1`,
        [messageId]
      );
    }

    await client.query("COMMIT");
    // Asynchronously update source last sync outside the transaction without holding locks
    pool.query("UPDATE sources SET last_sync = CURRENT_TIMESTAMP WHERE source_id = $1", [sourceId]).catch(() => {});
    broadcastRealtimeUpdate({ type: "NEW_TICKET", complaintId, taskId, source: normalizedSource });

    console.log(`[Ingestion Complete] Message #${messageId} processed in ${Date.now() - startTime}ms -> Complaint #${complaintId || 'none'}, Task #${taskId || 'none'}`);

    return {
      success: true,
      messageId,
      complaintId,
      taskId,
      isComplaint,
      assignedEmployeeName: assignment.employeeName,
      analysis,
    };
  } catch (error: any) {
    try {
      await client.query("ROLLBACK");
    } catch (rbErr) {}
    console.error("[Ingestion DB Error, using memory fallback]:", error.message);
    const { messageId, complaintId, taskId } = addMemoryEntry({
      source: normalizedSource,
      senderName: payload.senderName,
      senderEmail: payload.senderEmail,
      senderPhone: payload.senderPhone,
      subject: payload.subject,
      message: payload.message,
      rating: payload.rating,
      product: payload.product,
      analysis,
      assignedEmployeeName: assignment.employeeName,
    });
    broadcastRealtimeUpdate({ type: "NEW_TICKET", complaintId, taskId, source: normalizedSource });
    return {
      success: true,
      messageId,
      complaintId,
      taskId,
      isComplaint,
      assignedEmployeeName: assignment.employeeName,
      analysis,
    };
  } finally {
    client.release();
  }
}

import { Router, Request, Response } from "express";
import { processIncomingMessage } from "../services/ingestionService";
import { query, isDbConnected } from "../config/db";
import { getMemoryComplaints, getMemoryComplaintById } from "../services/memoryStore";

const router = Router();

// 1. Common Ingestion Endpoint
router.post("/incoming", async (req: Request, res: Response) => {
  try {
    const { source, externalMessageId, senderName, senderEmail, senderPhone, subject, message, rating, product, attachmentUrl, rawData } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Field 'message' is required and must be a string." });
    }

    const result = await processIncomingMessage({
      source: source || "Website",
      externalMessageId,
      senderName,
      senderEmail,
      senderPhone,
      subject,
      message,
      rating: rating !== undefined ? Number(rating) : null,
      product,
      attachmentUrl,
      rawData,
    });

    return res.status(201).json({
      message: "Complaint successfully ingested into ResolveAI pipeline.",
      data: result,
    });
  } catch (error: any) {
    console.error("Error in POST /api/complaints/incoming:", error);
    return res.status(500).json({
      error: "Failed to process incoming complaint.",
      details: error.message,
    });
  }
});

// 2. Query All Complaints with Filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, severity, category, limit = "50", offset = "0" } = req.query;

    if (!isDbConnected()) {
      let memList = getMemoryComplaints(parseInt(limit as string, 10) || 50);
      if (status) memList = memList.filter(c => c.status === status);
      if (severity) memList = memList.filter(c => c.severity === severity);
      if (category) memList = memList.filter(c => c.category_name === category);
      return res.json({ complaints: memList, total: memList.length });
    }

    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      params.push(status);
      conditions.push(`c.status = $${params.length}`);
    }
    if (severity) {
      params.push(severity);
      conditions.push(`c.severity = $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(`cat.category_name = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT 
        c.complaint_id, c.subject, c.description, c.severity, c.status, c.created_at, c.updated_at,
        cat.category_name,
        sm.sender_name, sm.sender_email, sm.product, sm.rating,
        s.source_name,
        ai.sentiment, ai.repeated_issue, ai.summary as ai_summary, ai.ai_recommendation,
        t.task_id, t.status as task_status, t.priority as task_priority, t.notes as task_notes,
        u.name as assigned_employee_name
      FROM complaints c
      LEFT JOIN categories cat ON c.category_id = cat.category_id
      LEFT JOIN source_messages sm ON c.message_id = sm.message_id
      LEFT JOIN sources s ON sm.source_id = s.source_id
      LEFT JOIN ai_analyses ai ON sm.message_id = ai.message_id
      LEFT JOIN tasks t ON c.complaint_id = t.complaint_id
      LEFT JOIN employees e ON t.assigned_employee_id = e.employee_id
      LEFT JOIN users u ON e.user_id = u.user_id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

    const result = await query(sql, params);
    return res.json({ complaints: result.rows, total: result.rowCount });
  } catch (error: any) {
    console.error("Error in GET /api/complaints:", error);
    return res.status(500).json({ error: "Failed to retrieve complaints." });
  }
});

// 3. Get Single Complaint Details
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid complaint ID." });

    if (!isDbConnected()) {
      const memItem = getMemoryComplaintById(id);
      if (!memItem) return res.status(404).json({ error: "Complaint not found." });
      return res.json(memItem);
    }

    const complaintRes = await query(
      `SELECT c.*, cat.category_name, sm.sender_name, sm.sender_email, sm.sender_phone, sm.product, sm.rating, s.source_name
       FROM complaints c
       LEFT JOIN categories cat ON c.category_id = cat.category_id
       LEFT JOIN source_messages sm ON c.message_id = sm.message_id
       LEFT JOIN sources s ON sm.source_id = s.source_id
       WHERE c.complaint_id = $1`,
      [id]
    );

    if (complaintRes.rows.length === 0) {
      return res.status(404).json({ error: "Complaint not found." });
    }

    const complaint = complaintRes.rows[0];

    // Fetch AI Analysis
    const aiRes = await query(
      `SELECT * FROM ai_analyses WHERE message_id = $1`,
      [complaint.message_id]
    );

    // Fetch Linked Tasks
    const taskRes = await query(
      `SELECT t.*, u.name as employee_name, d.department_name
       FROM tasks t
       LEFT JOIN employees e ON t.assigned_employee_id = e.employee_id
       LEFT JOIN users u ON e.user_id = u.user_id
       LEFT JOIN departments d ON e.department_id = d.department_id
       WHERE t.complaint_id = $1`,
      [id]
    );

    // Fetch Status History
    const historyRes = await query(
      `SELECT sh.*, u.name as updated_by_name
       FROM status_history sh
       LEFT JOIN users u ON sh.updated_by = u.user_id
       WHERE sh.complaint_id = $1
       ORDER BY sh.updated_at ASC`,
      [id]
    );

    return res.json({
      complaint,
      analysis: aiRes.rows[0] || null,
      tasks: taskRes.rows,
      history: historyRes.rows,
    });
  } catch (error: any) {
    console.error("Error in GET /api/complaints/:id:", error);
    return res.status(500).json({ error: "Failed to retrieve complaint details." });
  }
});

// 4. Update Complaint Status
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, remarks, updatedBy } = req.body;

    const validStatuses = ["Pending", "In Progress", "Resolved", "Escalated", "Closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    await query(
      `UPDATE complaints SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE complaint_id = $2`,
      [status, id]
    );

    // Synchronize task if resolved or in progress
    if (status === "Resolved" || status === "In Progress") {
      await query(
        `UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE complaint_id = $2`,
        [status, id]
      );
    }

    // Add status history
    await query(
      `INSERT INTO status_history (complaint_id, status, updated_by, remarks)
       VALUES ($1, $2, $3, $4)`,
      [id, status, updatedBy || null, remarks || `Status changed to ${status}`]
    );

    return res.json({ message: "Status updated successfully.", status });
  } catch (error: any) {
    console.error("Error in PATCH /api/complaints/:id/status:", error);
    return res.status(500).json({ error: "Failed to update complaint status." });
  }
});

// POST /api/complaints/draft-reply - Generate 1-click tailored AI reply for agent to send
router.post("/draft-reply", async (req: Request, res: Response) => {
  try {
    const { customerName, message, channel } = req.body;
    const { generateResolutionDraft } = await import("../services/geminiService");
    const draft = await generateResolutionDraft(
      customerName || "Customer",
      message || "Support inquiry",
      channel || "WhatsApp"
    );
    return res.json({ success: true, draft });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to generate draft." });
  }
});

export default router;

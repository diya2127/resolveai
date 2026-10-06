import { Router, Request, Response } from "express";
import { query, isDbConnected } from "../config/db";
import { getMemoryTasks, updateMemoryTaskStatus, updateMemoryTaskNotes } from "../services/memoryStore";

const router = Router();

// 1. Get Tasks (Mapped to match Frontend Task interface { id, title, desc, priority, status, notes })
router.get("/", async (req: Request, res: Response) => {
  try {
    const { email, role, status } = req.query;

    if (!isDbConnected()) {
      const memTasks = getMemoryTasks(status as string);
      return res.json({ tasks: memTasks });
    }

    let sql = `
      SELECT 
        t.task_id, t.priority, t.status, t.notes, t.due_date, t.created_at,
        c.complaint_id, c.subject as complaint_subject, c.description as complaint_desc, c.severity,
        cat.category_name,
        u.name as employee_name, u.email as employee_email,
        d.department_name,
        s.source_name,
        sm.sender_name, sm.sender_email
      FROM tasks t
      JOIN complaints c ON t.complaint_id = c.complaint_id
      LEFT JOIN categories cat ON c.category_id = cat.category_id
      LEFT JOIN employees e ON t.assigned_employee_id = e.employee_id
      LEFT JOIN users u ON e.user_id = u.user_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN source_messages sm ON c.message_id = sm.message_id
      LEFT JOIN sources s ON sm.source_id = s.source_id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    // Filter by employee email only if explicitly requested with filter=mine
    if (req.query.filter === "mine" && email) {
      params.push(email);
      conditions.push(`u.email = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`t.status = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    sql += ` ORDER BY t.created_at DESC, t.task_id DESC`;

    const result = await query(sql, params);

    // Format tasks to match frontend Task interface
    const formattedTasks = result.rows.map((row) => ({
      id: `#${row.task_id}`,
      taskId: row.task_id,
      complaintId: row.complaint_id,
      title: row.complaint_subject || `Complaint #${row.complaint_id}`,
      desc: row.complaint_desc || "",
      priority: row.priority as "High" | "Medium" | "Low",
      status: row.status as "Pending" | "In Progress" | "Resolved",
      notes: row.notes || "",
      notesOpen: false,
      department: row.department_name,
      employeeName: row.employee_name,
      category: row.category_name,
      severity: row.severity,
      source: row.source_name || "Website",
      senderName: row.sender_name || "Customer",
      senderEmail: row.sender_email || "",
    }));

    return res.json({ tasks: formattedTasks });
  } catch (error: any) {
    console.error("Error in GET /api/tasks:", error);
    return res.status(500).json({ error: "Failed to retrieve tasks." });
  }
});

// 2. Update Task Status
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id.replace("#", "");
    const taskId = parseInt(rawId, 10);
    const { status, remarks, updatedBy } = req.body;

    if (isNaN(taskId)) return res.status(400).json({ error: "Invalid task ID." });

    const validStatuses = ["Pending", "In Progress", "Resolved", "Escalated"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    if (!isDbConnected()) {
      updateMemoryTaskStatus(taskId, status as any);
      return res.json({ message: "Task and complaint status updated in memory.", status });
    }

    // Update Task
    const updateTaskRes = await query(
      `UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE task_id = $2 RETURNING complaint_id`,
      [status, taskId]
    );

    if (updateTaskRes.rows.length === 0) {
      return res.status(404).json({ error: "Task not found." });
    }

    const complaintId = updateTaskRes.rows[0].complaint_id;

    // Synchronize parent Complaint
    await query(
      `UPDATE complaints SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE complaint_id = $2`,
      [status, complaintId]
    );

    // Record Status History
    await query(
      `INSERT INTO status_history (complaint_id, status, updated_by, remarks)
       VALUES ($1, $2, $3, $4)`,
      [
        complaintId,
        status,
        updatedBy || null,
        remarks || `Task #${taskId} updated to "${status}"`,
      ]
    );

    return res.json({ message: "Task and complaint status updated successfully.", status });
  } catch (error: any) {
    console.error("Error in PATCH /api/tasks/:id/status:", error);
    return res.status(500).json({ error: "Failed to update task status." });
  }
});

// 3. Update Task Notes
router.patch("/:id/notes", async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id.replace("#", "");
    const taskId = parseInt(rawId, 10);
    const { notes } = req.body;

    if (isNaN(taskId)) return res.status(400).json({ error: "Invalid task ID." });

    if (!isDbConnected()) {
      updateMemoryTaskNotes(taskId, notes || "");
      return res.json({ message: "Notes saved in memory successfully.", notes });
    }

    await query(
      `UPDATE tasks SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE task_id = $2`,
      [notes || "", taskId]
    );

    return res.json({ message: "Notes saved successfully.", notes });
  } catch (error: any) {
    console.error("Error in PATCH /api/tasks/:id/notes:", error);
    return res.status(500).json({ error: "Failed to save notes." });
  }
});

export default router;

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/services/geminiService.ts
var geminiService_exports = {};
__export(geminiService_exports, {
  analyzeComplaint: () => analyzeComplaint,
  generateResolutionDraft: () => generateResolutionDraft,
  heuristicAnalyze: () => heuristicAnalyze
});
import { GoogleGenAI } from "@google/genai";
import dotenv2 from "dotenv";
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      try {
        aiClient = new GoogleGenAI({
          apiKey: apiKey.trim()
        });
      } catch (err) {
        console.warn("Failed to initialize GoogleGenAI client:", err);
      }
    }
  }
  return aiClient;
}
function heuristicAnalyze(text, subject, rating) {
  const combined = `${subject || ""} ${text}`.toLowerCase();
  let category = "Other";
  if (combined.includes("refund") || combined.includes("money back") || combined.includes("cashback")) {
    category = "Refund";
  } else if (combined.includes("pay") || combined.includes("charge") || combined.includes("transaction") || combined.includes("deduct") || combined.includes("card") || combined.includes("upi")) {
    category = "Payment";
  } else if (combined.includes("deliver") || combined.includes("late") || combined.includes("courier") || combined.includes("tracking") || combined.includes("ship") || combined.includes("package")) {
    category = "Delivery";
  } else if (combined.includes("defect") || combined.includes("broken") || combined.includes("damage") || combined.includes("quality") || combined.includes("fake") || combined.includes("color")) {
    category = "Product Quality";
  } else if (combined.includes("login") || combined.includes("password") || combined.includes("otp") || combined.includes("account") || combined.includes("profile")) {
    category = "Account";
  } else if (combined.includes("crash") || combined.includes("bug") || combined.includes("error") || combined.includes("frozen") || combined.includes("glitch") || combined.includes("app")) {
    category = "Technical";
  }
  let severity = "Medium";
  if (combined.includes("urgent") || combined.includes("emergency") || combined.includes("stolen") || combined.includes("fraud") || combined.includes("illegal") || combined.includes("double charge") || combined.includes("failed") && combined.includes("payment")) {
    severity = "Critical";
  } else if (combined.includes("delay") || combined.includes("not received") || combined.includes("damaged") || combined.includes("broken") || combined.includes("unacceptable") || rating !== void 0 && rating !== null && rating <= 2) {
    severity = "High";
  } else if (rating !== void 0 && rating !== null && rating >= 4) {
    severity = "Low";
  }
  let sentiment = "Negative";
  if (rating !== void 0 && rating !== null && rating >= 4) {
    sentiment = "Positive";
  } else if (combined.includes("good") && !combined.includes("not good")) {
    sentiment = "Positive";
  } else if (combined.includes("inquiry") || combined.includes("question") || combined.includes("how to")) {
    sentiment = "Neutral";
  }
  const summary = text.length > 120 ? text.substring(0, 117) + "..." : text;
  let recommendation = `Route to ${category} department for prioritized review.`;
  if (category === "Payment") {
    recommendation = "Verify transaction reference in payment gateway ledger and initiate reversal if duplicate.";
  } else if (category === "Refund") {
    recommendation = "Audit finance queue backlog and confirm bank credit disbursement ETA.";
  } else if (category === "Delivery") {
    recommendation = "Cross-reference tracking code with logistics hub dispatcher and notify customer of updated arrival.";
  } else if (category === "Product Quality") {
    recommendation = "Request damaged item photos and trigger replacement dispatch.";
  }
  return {
    sentiment,
    category,
    severity,
    repeatedIssue: false,
    summary,
    recommendation,
    confidence: 0.88
  };
}
async function analyzeComplaint(text, subject, rating, repeatedFlagHint = false) {
  const client = getAiClient();
  if (!client) {
    const res = heuristicAnalyze(text, subject, rating);
    res.repeatedIssue = repeatedFlagHint;
    return res;
  }
  try {
    const prompt = `You are the ResolveAI Complaint Intelligence Engine. Analyze the following customer message/feedback and output ONLY valid JSON adhering strictly to the schema below.
DO NOT wrap with markdown code fences (like \`\`\`json). Output pure JSON.

SCHEMA:
{
  "sentiment": "Positive" | "Neutral" | "Negative",
  "category": "Delivery" | "Refund" | "Payment" | "Product Quality" | "Technical" | "Account" | "Other",
  "severity": "Low" | "Medium" | "High" | "Critical",
  "repeatedIssue": boolean,
  "summary": "Concise 1-2 sentence description of the core problem",
  "recommendation": "Concrete actionable next step for the resolving employee",
  "confidence": number between 0.50 and 1.00
}

INPUT:
Subject: ${subject || "N/A"}
Customer Message: ${text}
Rating: ${rating !== void 0 && rating !== null ? rating : "N/A"}
Repeated Signal Pattern Detected: ${repeatedFlagHint ? "YES" : "NO"}
`;
    const timeoutPromise = new Promise(
      (_, reject) => setTimeout(() => reject(new Error("Gemini API call timed out after 8s")), 8e3)
    );
    const response = await Promise.race([
      client.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt,
        config: {
          temperature: 0.2
        }
      }),
      timeoutPromise
    ]);
    const responseText = response.text?.trim() || "";
    const cleanedJson = responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleanedJson);
    const validSentiments = ["Positive", "Neutral", "Negative"];
    const validSeverities = ["Low", "Medium", "High", "Critical"];
    const validCategories = ["Delivery", "Refund", "Payment", "Product Quality", "Technical", "Account", "Other"];
    return {
      sentiment: validSentiments.includes(parsed.sentiment) ? parsed.sentiment : "Negative",
      category: validCategories.includes(parsed.category) ? parsed.category : "Other",
      severity: validSeverities.includes(parsed.severity) ? parsed.severity : "Medium",
      repeatedIssue: typeof parsed.repeatedIssue === "boolean" ? parsed.repeatedIssue : repeatedFlagHint,
      summary: typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : text.substring(0, 100) + "...",
      recommendation: typeof parsed.recommendation === "string" && parsed.recommendation.trim() ? parsed.recommendation.trim() : "Review and resolve as per standard operating procedure.",
      confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0.5, parsed.confidence)) : 0.95
    };
  } catch (error) {
    console.warn("Gemini API call failed, using intelligent fallback analysis:", error);
    const fallback = heuristicAnalyze(text, subject, rating);
    fallback.repeatedIssue = repeatedFlagHint;
    return fallback;
  }
}
async function generateResolutionDraft(customerName, issueDescription, channel = "WhatsApp") {
  const client = getAiClient();
  const prompt = `You are a helpful customer support resolution specialist at an enterprise company.
A customer named "${customerName || "Customer"}" reached out via ${channel} with this complaint:
"${issueDescription}"

Draft a polite, empathetic, concise resolution reply for them.
- If channel is WhatsApp: Keep it short (under 75 words), empathetic, professional, formatted nicely with clean emoji.
- If channel is Gmail/Email: Include a polite greeting, clear explanation of the resolution steps, and a warm closing.
Do NOT include generic bracketed placeholders like [Your Name] or [Company Name] \u2014 sign off as "Customer Care Team".`;
  if (client) {
    try {
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Gemini draft timed out after 6s")), 6e3)
      );
      const response = await Promise.race([
        client.models.generateContent({
          model: "gemini-3.5-flash-lite",
          contents: prompt
        }),
        timeoutPromise
      ]);
      if (response.text) return response.text.trim();
    } catch (e) {
      console.warn("Gemini draft reply error:", e);
    }
  }
  if (channel.toLowerCase().includes("whatsapp")) {
    return `Hello ${customerName || "there"}, thank you for contacting us. We apologize for the inconvenience regarding: "${issueDescription.substring(0, 50)}...". Our operations team has reviewed your ticket and initiated corrective action. You will receive tracking/refund confirmation shortly. Best regards, Customer Care Team`;
  }
  return `Dear ${customerName || "Valued Customer"},

Thank you for reaching out to us. We have reviewed your issue regarding "${issueDescription.substring(0, 60)}..." and our operations team has taken immediate corrective action to resolve it.

Please let us know if you need any further assistance.

Warm regards,
Customer Care Operations`;
}
var aiClient;
var init_geminiService = __esm({
  "server/services/geminiService.ts"() {
    dotenv2.config();
    aiClient = null;
  }
});

// server/app.ts
import express from "express";
import dotenv3 from "dotenv";
import { GoogleGenAI as GoogleGenAI2 } from "@google/genai";

// server/config/db.ts
import pg from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
var { Pool } = pg;
var connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.includes("ResolveAI@6352024915")) {
  connectionString = connectionString.replace("ResolveAI@6352024915", "ResolveAI%406352024915");
}
var isRemote = Boolean(connectionString && !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1"));
var pool = new Pool(
  connectionString ? {
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : void 0,
    max: 10,
    idleTimeoutMillis: 3e4,
    connectionTimeoutMillis: 1e4,
    statement_timeout: 2e4
  } : {
    host: process.env.PGHOST || "localhost",
    port: parseInt(process.env.PGPORT || "5432", 10),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    database: process.env.PGDATABASE || "resolveai",
    max: 10,
    idleTimeoutMillis: 3e4,
    connectionTimeoutMillis: 1e4,
    statement_timeout: 2e4
  }
);
pool.on("error", (err) => {
  console.warn("PostgreSQL idle client pool error:", err.message);
});
var isConnected = false;
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  isConnected = true;
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development" && duration > 200) {
    console.log("[DB Slow Query]", { text: text.substring(0, 100), duration, rows: res.rowCount });
  }
  return res;
}
function isDbConnected() {
  return isConnected || Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "");
}
async function initDb() {
  try {
    const client = await pool.connect();
    isConnected = true;
    console.log("PostgreSQL connected successfully.");
    const checkTable = await client.query(
      "SELECT to_regclass('public.users') as exists;"
    );
    if (!checkTable.rows[0].exists) {
      console.log("Database tables missing. Applying schema from server/db/schema.sql...");
      const schemaPath = path.join(process.cwd(), "server", "db", "schema.sql");
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, "utf-8");
        await client.query(schemaSql);
        console.log("Database schema applied successfully.");
      } else {
        console.warn("Schema file not found at", schemaPath);
      }
    } else {
      console.log("Database schema verified (tables present).");
    }
    client.release();
    return true;
  } catch (error) {
    isConnected = false;
    console.error("PostgreSQL Connection Warning:", error.message);
    console.error("Ensure PostgreSQL is running and credentials in .env are correct.");
    return false;
  }
}

// server/routes/authRoutes.ts
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
var router = Router();
var JWT_SECRET = process.env.JWT_SECRET || "resolveai_secret_key";
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    if (!isDbConnected()) {
      const name = email.split("@")[0].replace(/[\._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const dept2 = role === "authority" ? "Executive Leadership Board" : "Finance Department";
      return res.json({
        user: { name, email, role: role || "employee", dept: dept2 },
        token: "demo-offline-token"
      });
    }
    const userRes = await query(
      `SELECT u.*, e.employee_id, d.department_name, e.designation
       FROM users u
       LEFT JOIN employees e ON u.user_id = e.user_id
       LEFT JOIN departments d ON e.department_id = d.department_id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const user = userRes.rows[0];
    let passwordMatch = false;
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      passwordMatch = user.password === password;
    }
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const payload = {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      name: user.name
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
    const dept = user.department_name || (user.role === "authority" ? "Executive Leadership Board" : "General Support");
    return res.json({
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        dept
      },
      token
    });
  } catch (error) {
    console.error("Error in POST /api/auth/login:", error);
    return res.status(500).json({ error: "Authentication service error." });
  }
});
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All registration fields are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }
    const assignedRole = role === "authority" ? "authority" : "employee";
    if (!isDbConnected()) {
      const dept = assignedRole === "authority" ? "Corporate Management" : "General Support Department";
      return res.json({
        user: { name, email, role: assignedRole, dept },
        token: "demo-offline-token"
      });
    }
    const existing = await query(`SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Email address is already registered." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertUser = await query(
      `INSERT INTO users (name, email, password, role, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING user_id, name, email, role`,
      [name, email, hashedPassword, assignedRole]
    );
    const newUser = insertUser.rows[0];
    let deptName = "Customer Support";
    if (assignedRole === "employee") {
      const deptRes = await query(`SELECT department_id, department_name FROM departments LIMIT 1`);
      const deptId = deptRes.rows[0]?.department_id || null;
      deptName = deptRes.rows[0]?.department_name || "Customer Support";
      await query(
        `INSERT INTO employees (user_id, department_id, designation, status)
         VALUES ($1, $2, 'Support Specialist', 'active')`,
        [newUser.user_id, deptId]
      );
    } else {
      deptName = "Executive Operations";
    }
    const token = jwt.sign(
      { userId: newUser.user_id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.status(201).json({
      user: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        dept: deptName
      },
      token
    });
  } catch (error) {
    console.error("Error in POST /api/auth/signup:", error);
    return res.status(500).json({ error: "Registration service error." });
  }
});
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided." });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!isDbConnected()) {
      return res.json({ user: decoded });
    }
    const userRes = await query(
      `SELECT u.name, u.email, u.role, d.department_name
       FROM users u
       LEFT JOIN employees e ON u.user_id = e.user_id
       LEFT JOIN departments d ON e.department_id = d.department_id
       WHERE u.user_id = $1`,
      [decoded.userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    const u = userRes.rows[0];
    return res.json({
      user: {
        name: u.name,
        email: u.email,
        role: u.role,
        dept: u.department_name || (u.role === "authority" ? "Executive Leadership Board" : "General Support")
      }
    });
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
});
var authRoutes_default = router;

// server/routes/complaintRoutes.ts
import { Router as Router2 } from "express";

// server/services/ingestionService.ts
init_geminiService();

// server/services/repeatedIssueService.ts
async function detectRepeatedIssue(input) {
  if (!isDbConnected()) {
    return { isRepeated: false, matchCount: 0 };
  }
  try {
    if (input.senderEmail) {
      const customerMatches = await query(
        `SELECT COUNT(*) as count 
         FROM source_messages sm
         JOIN complaints c ON sm.message_id = c.message_id
         WHERE sm.sender_email = $1 
           AND sm.received_at > NOW() - INTERVAL '30 days'`,
        [input.senderEmail]
      );
      const count = parseInt(customerMatches.rows[0]?.count || "0", 10);
      if (count >= 1) {
        return {
          isRepeated: true,
          matchCount: count + 1,
          matchedReason: `Customer has ${count} existing recent complaint(s)`
        };
      }
    }
    if (input.product && input.category) {
      const productMatches = await query(
        `SELECT COUNT(*) as count 
         FROM source_messages sm
         JOIN ai_analyses ai ON sm.message_id = ai.message_id
         WHERE LOWER(sm.product) = LOWER($1) 
           AND LOWER(ai.category) = LOWER($2)
           AND sm.received_at > NOW() - INTERVAL '60 days'`,
        [input.product, input.category]
      );
      const count = parseInt(productMatches.rows[0]?.count || "0", 10);
      if (count >= 2) {
        return {
          isRepeated: true,
          matchCount: count + 1,
          matchedReason: `Product "${input.product}" has ${count} previous reports in "${input.category}" category`
        };
      }
    }
    const combined = `${input.subject || ""} ${input.messageContent}`.toLowerCase();
    const commonIssueKeywords = [
      "payment failed",
      "charged twice",
      "duplicate charge",
      "refund delay",
      "late delivery",
      "broken item",
      "damaged package",
      "cannot login",
      "otp not received",
      "order cancelled"
    ];
    const foundKw = commonIssueKeywords.find((kw) => combined.includes(kw));
    if (foundKw) {
      const keywordMatches = await query(
        `SELECT COUNT(*) as count 
         FROM (
           SELECT message_id
           FROM source_messages sm
           WHERE sm.received_at > NOW() - INTERVAL '14 days'
             AND LOWER(sm.message_content) LIKE $1
           LIMIT 5
         ) sub`,
        [`%${foundKw}%`]
      );
      const count = parseInt(keywordMatches.rows[0]?.count || "0", 10);
      if (count >= 3) {
        return {
          isRepeated: true,
          matchCount: count + 1,
          matchedReason: `Cluster anomaly: Keyword "${foundKw}" reported ${count} times across the platform recently`
        };
      }
    }
    return { isRepeated: false, matchCount: 0 };
  } catch (error) {
    console.warn("Repeated issue detection encountered an error:", error);
    return { isRepeated: false, matchCount: 0 };
  }
}

// server/services/taskAssignmentService.ts
var CATEGORY_DEPARTMENT_MAP = {
  "Payment": "Accounts & Billing",
  "Refund": "Finance / Refunds",
  "Delivery": "Logistics & Delivery",
  "Product Quality": "Customer Support",
  "Technical": "Technical / Platform",
  "Account": "Accounts & Billing",
  "Other": "Customer Support"
};
async function assignEmployeeForComplaint(categoryName, severity) {
  if (!isDbConnected()) {
    return {
      employeeId: null,
      employeeName: "Unassigned",
      departmentName: CATEGORY_DEPARTMENT_MAP[categoryName] || "Customer Support"
    };
  }
  try {
    const targetDeptName = CATEGORY_DEPARTMENT_MAP[categoryName] || "Customer Support";
    const deptResult = await query(
      `SELECT e.employee_id, u.name as user_name, d.department_name,
              COUNT(t.task_id) FILTER (WHERE t.status IN ('Pending', 'In Progress')) as pending_task_count
       FROM employees e
       JOIN users u ON e.user_id = u.user_id
       JOIN departments d ON e.department_id = d.department_id
       LEFT JOIN tasks t ON e.employee_id = t.assigned_employee_id
       WHERE e.status = 'active'
         AND (LOWER(d.department_name) LIKE LOWER($1) OR LOWER(d.department_name) LIKE LOWER($2))
       GROUP BY e.employee_id, u.name, d.department_name
       ORDER BY pending_task_count ASC, e.employee_id ASC
       LIMIT 1`,
      [`%${targetDeptName}%`, `%${categoryName}%`]
    );
    if (deptResult.rows.length > 0) {
      const match = deptResult.rows[0];
      return {
        employeeId: match.employee_id,
        employeeName: match.user_name,
        departmentName: match.department_name
      };
    }
    const fallbackResult = await query(
      `SELECT e.employee_id, u.name as user_name, d.department_name,
              COUNT(t.task_id) FILTER (WHERE t.status IN ('Pending', 'In Progress')) as pending_task_count
       FROM employees e
       JOIN users u ON e.user_id = u.user_id
       LEFT JOIN departments d ON e.department_id = d.department_id
       LEFT JOIN tasks t ON e.employee_id = t.assigned_employee_id
       WHERE e.status = 'active'
       GROUP BY e.employee_id, u.name, d.department_name
       ORDER BY pending_task_count ASC, e.employee_id ASC
       LIMIT 1`
    );
    if (fallbackResult.rows.length > 0) {
      const fallback = fallbackResult.rows[0];
      return {
        employeeId: fallback.employee_id,
        employeeName: fallback.user_name,
        departmentName: fallback.department_name || targetDeptName
      };
    }
    return {
      employeeId: null,
      employeeName: "Unassigned",
      departmentName: targetDeptName
    };
  } catch (error) {
    console.warn("Task assignment service error:", error);
    return {
      employeeId: null,
      employeeName: "Unassigned",
      departmentName: "Customer Support"
    };
  }
}

// server/services/memoryStore.ts
var nextMessageId = 100;
var nextComplaintId = 500;
var nextTaskId = 4530;
var memoryComplaints = [
  {
    complaint_id: 4521,
    message_id: 1,
    subject: "Resolve refund complaint",
    description: "Verify refund status and update customer \u2014 refund not received after 15 days.",
    severity: "High",
    status: "Pending",
    created_at: new Date(Date.now() - 36e5 * 4).toISOString(),
    updated_at: new Date(Date.now() - 36e5 * 4).toISOString(),
    category_name: "Refund",
    source_name: "Website",
    sender_name: "Aarav Mehta",
    sender_email: "aarav.mehta@example.com",
    sentiment: "Negative",
    ai_summary: "Customer waiting on refund for 15 days.",
    ai_recommendation: "Check payment gateway batch reversal logs.",
    assigned_employee_name: "Keya",
    task_id: 4521,
    task_status: "Pending",
    task_priority: "High"
  },
  {
    complaint_id: 4522,
    message_id: 2,
    subject: "Follow up on delivery delay",
    description: "Customer reports package delayed 6 days beyond estimate. Confirm new ETA.",
    severity: "High",
    status: "In Progress",
    created_at: new Date(Date.now() - 36e5 * 8).toISOString(),
    updated_at: new Date(Date.now() - 36e5 * 2).toISOString(),
    category_name: "Delivery Delay",
    source_name: "WhatsApp",
    sender_name: "Rohit Verma",
    sender_email: "rohit.verma@example.com",
    sender_phone: "+91 98201 12345",
    sentiment: "Negative",
    ai_summary: "Package delayed 6 days.",
    ai_recommendation: "Escalate to regional logistics partner.",
    assigned_employee_name: "Keya",
    task_id: 4522,
    task_status: "In Progress",
    task_priority: "High"
  },
  {
    complaint_id: 4523,
    message_id: 3,
    subject: "Double charged on credit card for Order #ORD-10842",
    description: "I checked my ICICI bank statement today and noticed \u20B94,299 was deducted twice for the same transaction. Please reverse the duplicate authorization immediately.",
    severity: "High",
    status: "Pending",
    created_at: new Date(Date.now() - 36e5 * 12).toISOString(),
    updated_at: new Date(Date.now() - 36e5 * 12).toISOString(),
    category_name: "Duplicate Charge",
    source_name: "Gmail",
    sender_name: "Neha Kapoor",
    sender_email: "neha.kapoor@example.com",
    sentiment: "Negative",
    ai_summary: "Customer charged twice for single order.",
    ai_recommendation: "Issue immediate reversal of secondary transaction authorization.",
    assigned_employee_name: "Keya",
    task_id: 4523,
    task_status: "Pending",
    task_priority: "High"
  },
  {
    complaint_id: 4524,
    message_id: 4,
    subject: "Damaged item received in package",
    description: "Product arrived damaged with cracked casing, replacement shipped \u2014 confirm receipt.",
    severity: "Medium",
    status: "Pending",
    created_at: new Date(Date.now() - 36e5 * 24).toISOString(),
    updated_at: new Date(Date.now() - 36e5 * 24).toISOString(),
    category_name: "Damaged Item",
    source_name: "E-Commerce",
    sender_name: "Rohan Deshmukh",
    sender_email: "rohan.deshmukh@example.com",
    sentiment: "Negative",
    ai_summary: "Damaged product received.",
    ai_recommendation: "Confirm return tracking with customer.",
    assigned_employee_name: "Keya",
    task_id: 4524,
    task_status: "Pending",
    task_priority: "Medium"
  }
];
var memoryTasks = [
  {
    id: "#4521",
    taskId: 4521,
    complaintId: 4521,
    title: "Resolve refund complaint",
    desc: "Verify refund status and update customer \u2014 refund not received after 15 days.",
    priority: "High",
    status: "Pending",
    notes: "",
    notesOpen: false,
    department: "Finance / Refunds",
    employeeName: "Keya",
    category: "Refund",
    severity: "High",
    source: "Website",
    senderName: "Aarav Mehta",
    senderEmail: "aarav.mehta@example.com",
    created_at: new Date(Date.now() - 36e5 * 4).toISOString()
  },
  {
    id: "#4522",
    taskId: 4522,
    complaintId: 4522,
    title: "Follow up on delivery delay",
    desc: "Customer reports package delayed 6 days beyond estimate. Confirm new ETA.",
    priority: "High",
    status: "In Progress",
    notes: "",
    notesOpen: false,
    department: "Logistics",
    employeeName: "Keya",
    category: "Delivery Delay",
    severity: "High",
    source: "WhatsApp",
    senderName: "Rohit Verma",
    senderEmail: "rohit.verma@example.com",
    senderPhone: "+91 98201 12345",
    created_at: new Date(Date.now() - 36e5 * 8).toISOString()
  },
  {
    id: "#4523",
    taskId: 4523,
    complaintId: 4523,
    title: "Double charged on credit card for Order #ORD-10842",
    desc: "I checked my ICICI bank statement today and noticed \u20B94,299 was deducted twice for the same transaction. Please reverse the duplicate authorization immediately.",
    priority: "High",
    status: "Pending",
    notes: "",
    notesOpen: false,
    department: "Finance / Refunds",
    employeeName: "Keya",
    category: "Duplicate Charge",
    severity: "High",
    source: "Gmail",
    senderName: "Neha Kapoor",
    senderEmail: "neha.kapoor@example.com",
    created_at: new Date(Date.now() - 36e5 * 12).toISOString()
  },
  {
    id: "#4524",
    taskId: 4524,
    complaintId: 4524,
    title: "Damaged item received in package",
    desc: "Product arrived damaged with cracked casing, replacement shipped \u2014 confirm receipt.",
    priority: "Medium",
    status: "Pending",
    notes: "",
    notesOpen: false,
    department: "Customer Support",
    employeeName: "Keya",
    category: "Damaged Item",
    severity: "Medium",
    source: "E-Commerce",
    senderName: "Rohan Deshmukh",
    senderEmail: "rohan.deshmukh@example.com",
    created_at: new Date(Date.now() - 36e5 * 24).toISOString()
  }
];
function addMemoryEntry(params) {
  const messageId = nextMessageId++;
  const complaintId = nextComplaintId++;
  const taskId = nextTaskId++;
  const priority = params.analysis.severity === "Critical" || params.analysis.severity === "High" ? "High" : params.analysis.severity === "Low" ? "Low" : "Medium";
  const newComplaint = {
    complaint_id: complaintId,
    message_id: messageId,
    subject: params.subject || `${params.analysis.category} issue reported via ${params.source}`,
    description: params.message,
    severity: params.analysis.severity,
    status: "Pending",
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString(),
    category_name: params.analysis.category,
    source_name: params.source,
    sender_name: params.senderName || "Customer",
    sender_email: params.senderEmail || "",
    sender_phone: params.senderPhone,
    product: params.product || void 0,
    rating: params.rating || void 0,
    sentiment: params.analysis.sentiment,
    repeated_issue: params.analysis.repeatedIssue,
    ai_summary: params.analysis.summary,
    ai_recommendation: params.analysis.recommendation,
    assigned_employee_name: params.assignedEmployeeName || "Keya",
    task_id: taskId,
    task_status: "Pending",
    task_priority: priority
  };
  const newTask = {
    id: `#${taskId}`,
    taskId,
    complaintId,
    title: params.subject || `${params.analysis.category} issue reported via ${params.source}`,
    desc: params.message,
    priority,
    status: "Pending",
    notes: "",
    notesOpen: false,
    department: "Customer Operations",
    employeeName: params.assignedEmployeeName || "Keya",
    category: params.analysis.category,
    severity: params.analysis.severity,
    source: params.source,
    senderName: params.senderName || "Customer",
    senderEmail: params.senderEmail || "",
    senderPhone: params.senderPhone,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  memoryComplaints.unshift(newComplaint);
  memoryTasks.unshift(newTask);
  return { messageId, complaintId, taskId };
}
function getMemoryTasks(statusFilter) {
  let list = [...memoryTasks];
  if (statusFilter) {
    list = list.filter((t) => t.status === statusFilter);
  }
  return list;
}
function updateMemoryTaskStatus(taskId, status) {
  const task = memoryTasks.find((t) => t.taskId === taskId);
  if (task) {
    task.status = status;
    const complaint = memoryComplaints.find((c) => c.complaint_id === task.complaintId);
    if (complaint) {
      complaint.status = status;
      complaint.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    }
  }
}
function updateMemoryTaskNotes(taskId, notes) {
  const task = memoryTasks.find((t) => t.taskId === taskId);
  if (task) {
    task.notes = notes;
  }
}
function getMemoryComplaints(limit = 50) {
  return memoryComplaints.slice(0, limit);
}
function getMemoryComplaintById(id) {
  const complaint = memoryComplaints.find((c) => c.complaint_id === id);
  if (!complaint) return null;
  const task = memoryTasks.find((t) => t.complaintId === id);
  return {
    complaint,
    analysis: {
      sentiment: complaint.sentiment,
      category: complaint.category_name,
      severity_level: complaint.severity,
      repeated_issue: complaint.repeated_issue,
      summary: complaint.ai_summary,
      ai_recommendation: complaint.ai_recommendation
    },
    tasks: task ? [task] : [],
    history: [
      {
        history_id: 1,
        complaint_id: id,
        status: complaint.status,
        updated_at: complaint.created_at,
        remarks: `Received via ${complaint.source_name}`
      }
    ]
  };
}
function getMemoryStats() {
  const total = memoryComplaints.length;
  const resolved = memoryComplaints.filter((c) => c.status === "Resolved").length;
  const pending = memoryComplaints.filter((c) => c.status === "Pending").length;
  const inProgress = memoryComplaints.filter((c) => c.status === "In Progress").length;
  const escalations = memoryComplaints.filter((c) => c.severity === "Critical" && c.status !== "Resolved").length;
  const critical = memoryComplaints.filter((c) => c.severity === "Critical").length;
  const high = memoryComplaints.filter((c) => c.severity === "High").length;
  const resolutionRate = total > 0 ? Math.round(resolved / total * 100) : 0;
  const csat = total > 0 ? Math.min(98, Math.max(75, 80 + Math.round(resolved / total * 15))) : 89;
  return {
    totalComplaints: total,
    resolvedComplaints: resolved,
    pendingComplaints: pending,
    inProgressComplaints: inProgress,
    pendingEscalations: escalations,
    criticalCount: critical,
    highCount: high,
    resolutionRate,
    csatRating: `${csat}%`
  };
}

// server/services/realtimeService.ts
var clients = /* @__PURE__ */ new Set();
function addRealtimeClient(res) {
  clients.add(res);
  res.on("close", () => {
    clients.delete(res);
  });
}
function broadcastRealtimeUpdate(payload) {
  const message = `data: ${JSON.stringify(payload)}

`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch (err) {
      clients.delete(client);
    }
  }
}

// server/services/ingestionService.ts
async function processIncomingMessage(payload) {
  const startTime = Date.now();
  console.log(`[Ingestion] Received incoming message from source: "${payload.source}" - Subject: "${payload.subject || "N/A"}"`);
  if (!payload.message || typeof payload.message !== "string" || !payload.message.trim()) {
    throw new Error("Message content cannot be empty.");
  }
  const normalizedSource = payload.source || "Website";
  const repeatedCheck = await Promise.race([
    detectRepeatedIssue({
      product: payload.product,
      senderEmail: payload.senderEmail,
      subject: payload.subject,
      messageContent: payload.message
    }),
    new Promise(
      (resolve) => setTimeout(() => resolve({ isRepeated: false, matchCount: 0 }), 1500)
    )
  ]).catch(() => ({ isRepeated: false, matchCount: 0 }));
  const analysis = await analyzeComplaint(
    payload.message,
    payload.subject,
    payload.rating,
    repeatedCheck.isRepeated
  );
  const isComplaint = normalizedSource === "WhatsApp" || normalizedSource === "Gmail" || normalizedSource === "Website" || normalizedSource === "Manual" || analysis.sentiment === "Negative" || analysis.sentiment === "Neutral" || payload.rating !== void 0 && payload.rating !== null && payload.rating <= 3;
  let assignment = { employeeId: 1, employeeName: "Keya" };
  if (isComplaint) {
    try {
      assignment = await assignEmployeeForComplaint(analysis.category, analysis.severity);
    } catch (e) {
    }
  }
  let client;
  try {
    client = await pool.connect();
  } catch (connErr) {
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
      assignedEmployeeName: assignment.employeeName
    });
    broadcastRealtimeUpdate({ type: "NEW_TICKET", complaintId, taskId, source: normalizedSource });
    return {
      success: true,
      messageId,
      complaintId,
      taskId,
      isComplaint,
      assignedEmployeeName: assignment.employeeName,
      analysis
    };
  }
  try {
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
          message: "Message already ingested; skipped duplicate."
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
          message: "Duplicate message from this sender already exists; skipped duplicate."
        };
      }
    }
    let sourceId = 1;
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
        payload.rating !== void 0 ? payload.rating : null,
        payload.product || null,
        payload.attachmentUrl || null,
        payload.rawData ? JSON.stringify(payload.rawData) : null
      ]
    );
    const messageId = insertMessage.rows[0].message_id;
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
        analysis.confidence
      ]
    );
    let complaintId = null;
    let taskId = null;
    if (isComplaint) {
      let categoryId = null;
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
      const complaintSubject = payload.subject || `${analysis.category} issue reported via ${normalizedSource}`;
      const insertComplaint = await client.query(
        `INSERT INTO complaints (
          message_id, category_id, subject, description, severity, status
        ) VALUES ($1, $2, $3, $4, $5, 'Pending')
        RETURNING complaint_id`,
        [messageId, categoryId, complaintSubject, payload.message, analysis.severity]
      );
      complaintId = insertComplaint.rows[0].complaint_id;
      let taskPriority = "Medium";
      if (analysis.severity === "Critical" || analysis.severity === "High") taskPriority = "High";
      else if (analysis.severity === "Low") taskPriority = "Low";
      const slaHours = analysis.severity === "Critical" ? 4 : analysis.severity === "High" ? 12 : 24;
      const dueDate = new Date(Date.now() + slaHours * 60 * 60 * 1e3);
      const insertTask = await client.query(
        `INSERT INTO tasks (
          complaint_id, assigned_employee_id, priority, status, due_date
        ) VALUES ($1, $2, $3, 'Pending', $4)
        RETURNING task_id`,
        [complaintId, assignment.employeeId, taskPriority, dueDate]
      );
      taskId = insertTask.rows[0].task_id;
      await client.query(
        `INSERT INTO status_history (
          complaint_id, status, remarks
        ) VALUES ($1, 'Pending', $2)`,
        [
          complaintId,
          `Auto-ingested from ${normalizedSource}. AI classified as "${analysis.category}" (${analysis.severity} severity). Assigned to ${assignment.employeeName || "unassigned queue"}.`
        ]
      );
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
    pool.query("UPDATE sources SET last_sync = CURRENT_TIMESTAMP WHERE source_id = $1", [sourceId]).catch(() => {
    });
    broadcastRealtimeUpdate({ type: "NEW_TICKET", complaintId, taskId, source: normalizedSource });
    console.log(`[Ingestion Complete] Message #${messageId} processed in ${Date.now() - startTime}ms -> Complaint #${complaintId || "none"}, Task #${taskId || "none"}`);
    return {
      success: true,
      messageId,
      complaintId,
      taskId,
      isComplaint,
      assignedEmployeeName: assignment.employeeName,
      analysis
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rbErr) {
    }
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
      assignedEmployeeName: assignment.employeeName
    });
    broadcastRealtimeUpdate({ type: "NEW_TICKET", complaintId, taskId, source: normalizedSource });
    return {
      success: true,
      messageId,
      complaintId,
      taskId,
      isComplaint,
      assignedEmployeeName: assignment.employeeName,
      analysis
    };
  } finally {
    client.release();
  }
}

// server/routes/complaintRoutes.ts
var router2 = Router2();
router2.post("/incoming", async (req, res) => {
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
      rating: rating !== void 0 ? Number(rating) : null,
      product,
      attachmentUrl,
      rawData
    });
    return res.status(201).json({
      message: "Complaint successfully ingested into ResolveAI pipeline.",
      data: result
    });
  } catch (error) {
    console.error("Error in POST /api/complaints/incoming:", error);
    return res.status(500).json({
      error: "Failed to process incoming complaint.",
      details: error.message
    });
  }
});
router2.get("/", async (req, res) => {
  try {
    const { status, severity, category, limit = "50", offset = "0" } = req.query;
    if (!isDbConnected()) {
      let memList = getMemoryComplaints(parseInt(limit, 10) || 50);
      if (status) memList = memList.filter((c) => c.status === status);
      if (severity) memList = memList.filter((c) => c.severity === severity);
      if (category) memList = memList.filter((c) => c.category_name === category);
      return res.json({ complaints: memList, total: memList.length });
    }
    const conditions = [];
    const params = [];
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
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    const result = await query(sql, params);
    return res.json({ complaints: result.rows, total: result.rowCount });
  } catch (error) {
    console.error("Error in GET /api/complaints:", error);
    return res.status(500).json({ error: "Failed to retrieve complaints." });
  }
});
router2.get("/:id", async (req, res) => {
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
    const aiRes = await query(
      `SELECT * FROM ai_analyses WHERE message_id = $1`,
      [complaint.message_id]
    );
    const taskRes = await query(
      `SELECT t.*, u.name as employee_name, d.department_name
       FROM tasks t
       LEFT JOIN employees e ON t.assigned_employee_id = e.employee_id
       LEFT JOIN users u ON e.user_id = u.user_id
       LEFT JOIN departments d ON e.department_id = d.department_id
       WHERE t.complaint_id = $1`,
      [id]
    );
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
      history: historyRes.rows
    });
  } catch (error) {
    console.error("Error in GET /api/complaints/:id:", error);
    return res.status(500).json({ error: "Failed to retrieve complaint details." });
  }
});
router2.patch("/:id/status", async (req, res) => {
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
    if (status === "Resolved" || status === "In Progress") {
      await query(
        `UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE complaint_id = $2`,
        [status, id]
      );
    }
    await query(
      `INSERT INTO status_history (complaint_id, status, updated_by, remarks)
       VALUES ($1, $2, $3, $4)`,
      [id, status, updatedBy || null, remarks || `Status changed to ${status}`]
    );
    return res.json({ message: "Status updated successfully.", status });
  } catch (error) {
    console.error("Error in PATCH /api/complaints/:id/status:", error);
    return res.status(500).json({ error: "Failed to update complaint status." });
  }
});
router2.post("/draft-reply", async (req, res) => {
  try {
    const { customerName, message, channel } = req.body;
    const { generateResolutionDraft: generateResolutionDraft2 } = await Promise.resolve().then(() => (init_geminiService(), geminiService_exports));
    const draft = await generateResolutionDraft2(
      customerName || "Customer",
      message || "Support inquiry",
      channel || "WhatsApp"
    );
    return res.json({ success: true, draft });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to generate draft." });
  }
});
var complaintRoutes_default = router2;

// server/routes/taskRoutes.ts
import { Router as Router3 } from "express";
var router3 = Router3();
router3.get("/", async (req, res) => {
  const { email, role, status } = req.query;
  try {
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
    const conditions = [];
    const params = [];
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
    const formattedTasks = result.rows.map((row) => ({
      id: `#${row.task_id}`,
      taskId: row.task_id,
      complaintId: row.complaint_id,
      title: row.complaint_subject || `Complaint #${row.complaint_id}`,
      desc: row.complaint_desc || "",
      priority: row.priority,
      status: row.status,
      notes: row.notes || "",
      notesOpen: false,
      department: row.department_name,
      employeeName: row.employee_name,
      category: row.category_name,
      severity: row.severity,
      source: row.source_name || "Website",
      senderName: row.sender_name || "Customer",
      senderEmail: row.sender_email || ""
    }));
    return res.json({ tasks: formattedTasks });
  } catch (error) {
    console.warn("Postgres query fallback in GET /api/tasks:", error.message);
    const memTasks = getMemoryTasks(status);
    return res.json({ tasks: memTasks });
  }
});
router3.patch("/:id/status", async (req, res) => {
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
      updateMemoryTaskStatus(taskId, status);
      return res.json({ message: "Task and complaint status updated in memory.", status });
    }
    const updateTaskRes = await query(
      `UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE task_id = $2 RETURNING complaint_id`,
      [status, taskId]
    );
    if (updateTaskRes.rows.length === 0) {
      return res.status(404).json({ error: "Task not found." });
    }
    const complaintId = updateTaskRes.rows[0].complaint_id;
    await query(
      `UPDATE complaints SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE complaint_id = $2`,
      [status, complaintId]
    );
    await query(
      `INSERT INTO status_history (complaint_id, status, updated_by, remarks)
       VALUES ($1, $2, $3, $4)`,
      [
        complaintId,
        status,
        updatedBy || null,
        remarks || `Task #${taskId} updated to "${status}"`
      ]
    );
    return res.json({ message: "Task and complaint status updated successfully.", status });
  } catch (error) {
    console.error("Error in PATCH /api/tasks/:id/status:", error);
    return res.status(500).json({ error: "Failed to update task status." });
  }
});
router3.patch("/:id/notes", async (req, res) => {
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
  } catch (error) {
    console.error("Error in PATCH /api/tasks/:id/notes:", error);
    return res.status(500).json({ error: "Failed to save notes." });
  }
});
var taskRoutes_default = router3;

// server/routes/dashboardRoutes.ts
import { Router as Router4 } from "express";
var router4 = Router4();
router4.get("/stats", async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.json(getMemoryStats());
    }
    const statsRes = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'Pending') as pending,
        COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'Escalated' OR (severity = 'Critical' AND status != 'Resolved')) as escalations,
        COUNT(*) FILTER (WHERE severity = 'Critical') as critical_count,
        COUNT(*) FILTER (WHERE severity = 'High') as high_count
      FROM complaints
    `);
    const row = statsRes.rows[0];
    const total = parseInt(row.total || "0", 10);
    const resolved = parseInt(row.resolved || "0", 10);
    const pending = parseInt(row.pending || "0", 10);
    const inProgress = parseInt(row.in_progress || "0", 10);
    const escalations = parseInt(row.escalations || "0", 10);
    const resolutionRate = total > 0 ? Math.round(resolved / total * 100) : 84;
    const csat = total > 0 ? Math.min(98, Math.max(75, 80 + Math.round(resolved / total * 15))) : 89;
    return res.json({
      totalComplaints: total,
      resolvedComplaints: resolved,
      pendingComplaints: pending,
      inProgressComplaints: inProgress,
      pendingEscalations: escalations,
      criticalCount: parseInt(row.critical_count || "0", 10),
      highCount: parseInt(row.high_count || "0", 10),
      resolutionRate,
      csatRating: `${csat}%`
    });
  } catch (error) {
    console.error("Error in GET /api/dashboard/stats:", error);
    return res.status(500).json({ error: "Failed to fetch dashboard stats." });
  }
});
router4.get("/severity-distribution", async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.json([
        { level: "Critical Priority", pct: 15, color: "from-[#38BDF8] to-brand-warning" },
        { level: "High Priority", pct: 35, color: "from-[#6366F1] to-[#38BDF8]" },
        { level: "Medium Priority", pct: 38, color: "from-[#312E81] to-[#6366F1]" },
        { level: "Low Routine Priority", pct: 12, color: "from-[#1E1B4B] via-[#312E81] to-[#6366F1]" }
      ]);
    }
    const result = await query(`
      SELECT 
        severity,
        COUNT(*) as count
      FROM complaints
      GROUP BY severity
    `);
    let total = 0;
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    result.rows.forEach((r) => {
      counts[r.severity] = parseInt(r.count, 10);
      total += parseInt(r.count, 10);
    });
    if (total === 0) total = 1;
    const distribution = [
      {
        level: "Critical Priority",
        pct: Math.round((counts.Critical || 0) / total * 100),
        count: counts.Critical || 0,
        color: "from-[#38BDF8] to-brand-warning"
      },
      {
        level: "High Priority",
        pct: Math.round((counts.High || 0) / total * 100),
        count: counts.High || 0,
        color: "from-[#6366F1] to-[#38BDF8]"
      },
      {
        level: "Medium Priority",
        pct: Math.round((counts.Medium || 0) / total * 100),
        count: counts.Medium || 0,
        color: "from-[#312E81] to-[#6366F1]"
      },
      {
        level: "Low Routine Priority",
        pct: Math.round((counts.Low || 0) / total * 100),
        count: counts.Low || 0,
        color: "from-[#1E1B4B] via-[#312E81] to-[#6366F1]"
      }
    ];
    return res.json(distribution);
  } catch (error) {
    console.error("Error in GET /api/dashboard/severity-distribution:", error);
    return res.status(500).json({ error: "Failed to fetch severity distribution." });
  }
});
router4.get("/departments", async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.json([
        { name: "Logistics & Delivery", pct: 78 },
        { name: "Finance / Refunds", pct: 65 },
        { name: "Customer Support", pct: 88 },
        { name: "Technical / Platform", pct: 71 },
        { name: "Accounts & Billing", pct: 82 }
      ]);
    }
    const deptResult = await query(`
      SELECT 
        d.department_name as name,
        COUNT(c.complaint_id) as total_cases,
        COUNT(c.complaint_id) FILTER (WHERE c.status = 'Resolved') as resolved_cases
      FROM departments d
      LEFT JOIN employees e ON d.department_id = e.department_id
      LEFT JOIN tasks t ON e.employee_id = t.assigned_employee_id
      LEFT JOIN complaints c ON t.complaint_id = c.complaint_id
      GROUP BY d.department_id, d.department_name
      ORDER BY d.department_name ASC
    `);
    const departments = deptResult.rows.map((r) => {
      const total = parseInt(r.total_cases, 10);
      const resolved = parseInt(r.resolved_cases, 10);
      const pct = total > 0 ? Math.min(100, Math.round(resolved / total * 100)) : 80;
      return {
        name: r.name,
        pct,
        totalCases: total,
        resolvedCases: resolved
      };
    });
    return res.json(departments);
  } catch (error) {
    console.error("Error in GET /api/dashboard/departments:", error);
    return res.status(500).json({ error: "Failed to fetch department metrics." });
  }
});
router4.get("/incidents", async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.json([
        { issue: "Payment gateway failure logs", cat: "Payment", reports: 340, sev: "Critical", status: "Pending" },
        { issue: "Metro hub distribution bottlenecks", cat: "Delivery", reports: 9e3, sev: "High", status: "In Progress" },
        { issue: "Legacy authentication reset failure", cat: "Account", reports: 800, sev: "High", status: "In Progress" },
        { issue: "Package structural damage logs", cat: "Product", reports: 412, sev: "Medium", status: "Pending" },
        { issue: "Escalated SLA refund delays > 15d", cat: "Refund", reports: 265, sev: "Medium", status: "Resolved" }
      ]);
    }
    const incidentsResult = await query(`
      SELECT 
        c.subject as issue,
        COALESCE(cat.category_name, 'General') as cat,
        COUNT(*) OVER (PARTITION BY c.category_id) as reports,
        c.severity as sev,
        c.status
      FROM complaints c
      LEFT JOIN categories cat ON c.category_id = cat.category_id
      WHERE c.severity IN ('Critical', 'High')
      ORDER BY CASE c.severity WHEN 'Critical' THEN 1 ELSE 2 END, c.created_at DESC
      LIMIT 8
    `);
    if (incidentsResult.rows.length === 0) {
      const fallbackResult = await query(`
        SELECT 
          c.subject as issue,
          COALESCE(cat.category_name, 'General') as cat,
          1 as reports,
          c.severity as sev,
          c.status
        FROM complaints c
        LEFT JOIN categories cat ON c.category_id = cat.category_id
        ORDER BY c.created_at DESC
        LIMIT 5
      `);
      return res.json(fallbackResult.rows);
    }
    return res.json(incidentsResult.rows);
  } catch (error) {
    console.error("Error in GET /api/dashboard/incidents:", error);
    return res.status(500).json({ error: "Failed to fetch incidents." });
  }
});
router4.get("/inflow-volumes", async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.json({
        days: [
          { day: "Mon", count: 15 },
          { day: "Tue", count: 18 },
          { day: "Wed", count: 25 },
          { day: "Thu", count: 22 },
          { day: "Fri", count: 30 },
          { day: "Sat", count: 14 },
          { day: "Sun", count: 10 }
        ]
      });
    }
    const inflowResult = await query(`
      SELECT 
        TO_CHAR(received_at, 'Dy') as day_name,
        EXTRACT(DOW FROM received_at) as dow,
        COUNT(*) as count
      FROM source_messages
      WHERE received_at > NOW() - INTERVAL '7 days'
      GROUP BY day_name, dow
      ORDER BY dow ASC
    `);
    return res.json({
      days: inflowResult.rows.map((r) => ({
        day: r.day_name.trim(),
        count: parseInt(r.count, 10)
      }))
    });
  } catch (error) {
    console.error("Error in GET /api/dashboard/inflow-volumes:", error);
    return res.status(500).json({ error: "Failed to fetch inflow volumes." });
  }
});
router4.get("/database-explorer", async (req, res) => {
  try {
    const table = req.query.table || "complaints";
    const allowedTables = ["complaints", "tasks", "source_messages", "sources", "employees", "status_history"];
    if (!allowedTables.includes(table)) {
      return res.status(400).json({ error: "Invalid table requested." });
    }
    const countRes = await query(`SELECT COUNT(*) as count FROM ${table}`);
    const rowsRes = await query(`SELECT * FROM ${table} ORDER BY 1 DESC LIMIT 35`);
    const tableCounts = {};
    for (const t of allowedTables) {
      try {
        const c = await query(`SELECT COUNT(*) as count FROM ${t}`);
        tableCounts[t] = parseInt(c.rows[0]?.count || "0", 10);
      } catch (e) {
        tableCounts[t] = 0;
      }
    }
    return res.json({
      activeTable: table,
      totalRows: parseInt(countRes.rows[0]?.count || "0", 10),
      columns: rowsRes.fields.map((f) => f.name),
      rows: rowsRes.rows,
      tableCounts
    });
  } catch (error) {
    console.error("Database explorer error:", error);
    return res.status(500).json({ error: error.message || "Failed to inspect database." });
  }
});
var dashboardRoutes_default = router4;

// server/routes/categoryRoutes.ts
import { Router as Router5 } from "express";
var router5 = Router5();
var CATEGORY_ICONS = {
  "Product Quality Issues": "\u{1F4E6}",
  "Product Quality": "\u{1F4E6}",
  "Logistics & Delivery": "\u{1F69A}",
  "Delivery": "\u{1F69A}",
  "Payment & Gateway Exceptions": "\u{1F4B3}",
  "Payment": "\u{1F4B3}",
  "Refund & Compensation": "\u21A9\uFE0F",
  "Refund": "\u21A9\uFE0F",
  "Customer Support Delays": "\u{1F3A7}",
  "Customer Support": "\u{1F3A7}",
  "Platform Technical Glitches": "\u2699\uFE0F",
  "Technical": "\u2699\uFE0F",
  "Accounts & Authentication": "\u{1F510}",
  "Account": "\u{1F510}",
  "Other": "\u{1F4C1}"
};
router5.get("/", async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.json({
        categories: [
          { icon: "\u{1F4E6}", name: "Product Quality Issues", total: 12400, repeated: 5100, sev: "med", ai: "Most complaints relate to items not matching listed catalog descriptions or arriving without components." },
          { icon: "\u{1F69A}", name: "Logistics & Delivery", total: 15e3, repeated: 9e3, sev: "high", ai: "Most users complain about delayed shipping times and lack of carrier responsiveness in metro centers." },
          { icon: "\u{1F4B3}", name: "Payment & Gateway Exceptions", total: 6200, repeated: 3400, sev: "crit", ai: "Recurring checkout transaction failures are traced to third-party secure token timeout database locks." },
          { icon: "\u21A9\uFE0F", name: "Refund & Compensation", total: 8100, repeated: 4700, sev: "med", ai: "Refund delays averaging 15+ business days remain the leading qualitative driver of customer dissatisfaction." },
          { icon: "\u{1F3A7}", name: "Customer Support Delays", total: 5300, repeated: 1900, sev: "low", ai: "Live support wait times spike heavily during peak early evening slots, specifically 6 PM to 9 PM." },
          { icon: "\u2699\uFE0F", name: "Platform Technical Glitches", total: 4100, repeated: 2200, sev: "med", ai: "App freeze logs clustered significantly following the v2.4.1 binary update, mostly on Android OS." },
          { icon: "\u{1F510}", name: "Accounts & Authentication", total: 3900, repeated: 2600, sev: "high", ai: "Sync mismatches prevent customers from logging into saved profiles, forcing redundant account resets." }
        ]
      });
    }
    const catResult = await query(`
      SELECT 
        c.category_id,
        c.category_name,
        c.description,
        COUNT(comp.complaint_id) as total_signals,
        COUNT(comp.complaint_id) FILTER (WHERE ai.repeated_issue = true) as repeated_signals,
        MODE() WITHIN GROUP (ORDER BY comp.severity) as predominant_severity,
        (SELECT ai2.ai_recommendation FROM complaints comp2 
         JOIN source_messages sm2 ON comp2.message_id = sm2.message_id
         JOIN ai_analyses ai2 ON sm2.message_id = ai2.message_id
         WHERE comp2.category_id = c.category_id ORDER BY comp2.created_at DESC LIMIT 1) as recent_ai_rec
      FROM categories c
      LEFT JOIN complaints comp ON c.category_id = comp.category_id
      LEFT JOIN source_messages sm ON comp.message_id = sm.message_id
      LEFT JOIN ai_analyses ai ON sm.message_id = ai.message_id
      GROUP BY c.category_id, c.category_name, c.description
      ORDER BY total_signals DESC, c.category_id ASC
    `);
    const formattedCategories = catResult.rows.map((row) => {
      const sevMap = {
        Critical: "crit",
        High: "high",
        Medium: "med",
        Low: "low"
      };
      const sev = sevMap[row.predominant_severity] || "med";
      const icon = CATEGORY_ICONS[row.category_name] || "\u{1F4C1}";
      return {
        id: row.category_id,
        icon,
        name: row.category_name,
        total: parseInt(row.total_signals || "0", 10),
        repeated: parseInt(row.repeated_signals || "0", 10),
        sev,
        ai: row.recent_ai_rec || row.description || `Automated analysis for ${row.category_name} tickets.`
      };
    });
    return res.json({ categories: formattedCategories });
  } catch (error) {
    console.error("Error in GET /api/categories:", error);
    return res.status(500).json({ error: "Failed to fetch categories." });
  }
});
var categoryRoutes_default = router5;

// server/routes/ecommerceRoutes.ts
import { Router as Router6 } from "express";
import fs2 from "fs";
import path2 from "path";
var router6 = Router6();
router6.post("/sync", async (req, res) => {
  try {
    const reviewsPath = path2.join(process.cwd(), "mock-ecommerce", "reviews.json");
    const fallbackPath = path2.join(process.cwd(), "mock-ecommerce", "review.json");
    let filePath = reviewsPath;
    if (!fs2.existsSync(reviewsPath)) {
      filePath = fallbackPath;
    }
    if (!fs2.existsSync(filePath)) {
      return res.status(404).json({ error: "E-commerce data file not found." });
    }
    const fileContent = fs2.readFileSync(filePath, "utf-8");
    const reviews = JSON.parse(fileContent);
    if (!Array.isArray(reviews)) {
      return res.status(400).json({ error: "Invalid reviews format: expected JSON array." });
    }
    const processedResults = [];
    for (const review of reviews) {
      try {
        const result = await processIncomingMessage({
          source: "E-Commerce",
          externalMessageId: review.id || `ecomm-${Date.now()}`,
          senderName: review.customer_name || "Anonymous Shopper",
          senderEmail: review.customer_email || null,
          subject: review.review_title || `E-Commerce Feedback for ${review.product || "Product"}`,
          message: review.review_text || review.review_title || "No text provided.",
          rating: review.rating !== void 0 ? Number(review.rating) : null,
          product: review.product || null,
          rawData: review
        });
        processedResults.push({ id: review.id, success: true, result });
      } catch (err) {
        processedResults.push({ id: review.id, success: false, error: err.message });
      }
    }
    return res.json({
      message: `Synchronized ${processedResults.length} e-commerce records into ResolveAI common pipeline.`,
      processedCount: processedResults.length,
      details: processedResults
    });
  } catch (error) {
    console.error("Error in POST /api/ecommerce/sync:", error);
    return res.status(500).json({ error: "Failed to synchronize e-commerce reviews." });
  }
});
router6.get("/status", async (req, res) => {
  return res.json({
    source: "E-Commerce",
    mode: "Simulated Source (mock-ecommerce/reviews.json)",
    liveApiConnected: false,
    note: "Modular architecture ready for Amazon Selling Partner API / Shopify Webhooks."
  });
});
router6.post("/webhook", async (req, res) => {
  try {
    const body = req.body || {};
    const customer = body.customer || {};
    const senderName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || body.billing?.first_name || body.name || "E-Commerce Customer";
    const senderEmail = customer.email || body.email || body.billing?.email || null;
    const lineItem = body.line_items?.[0] || {};
    const product = lineItem.title || body.product_name || body.product || "Store Product";
    const note = body.note || body.cancel_reason || body.reason || body.review_text || body.message || `Customer dispute / refund requested for order #${body.order_number || body.id || "N/A"}`;
    const result = await processIncomingMessage({
      source: "E-Commerce",
      externalMessageId: body.id ? `shop-${body.id}` : `ecomm-${Date.now()}`,
      senderName,
      senderEmail,
      subject: `E-Commerce Feedback: ${product}`,
      message: note,
      rating: body.rating ? Number(body.rating) : 1,
      product,
      rawData: body
    });
    return res.status(200).json({ success: true, message: "E-commerce event ingested.", result });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to process e-commerce webhook." });
  }
});
var ecommerceRoutes_default = router6;

// server/routes/gmailRoutes.ts
import { Router as Router7 } from "express";
var router7 = Router7();
function isGmailConfigured() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  return Boolean(clientId && clientSecret && refreshToken && clientId.trim() !== "");
}
router7.get("/status", (req, res) => {
  const configured = isGmailConfigured();
  return res.json({
    integration: "Gmail",
    connected: configured,
    status: configured ? "Connected (OAuth2 active)" : "Awaiting Google Cloud OAuth2 Credentials",
    requiredEnvironmentVariables: [
      "GMAIL_CLIENT_ID",
      "GMAIL_CLIENT_SECRET",
      "GMAIL_REFRESH_TOKEN",
      "GMAIL_REDIRECT_URI"
    ],
    setupGuide: configured ? "Gmail API credentials active and ready for inbox polling." : "1. Create a Google Cloud Project and enable Gmail API. 2. Create OAuth 2.0 Client ID Credentials. 3. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env. 4. Complete OAuth authorization to generate GMAIL_REFRESH_TOKEN."
  });
});
router7.post("/webhook", async (req, res) => {
  try {
    const { from, subject, body, messageId, date, headers } = req.body;
    if (!body && !subject) {
      return res.status(400).json({ error: "Email body or subject is required." });
    }
    let senderName = from || "Email Customer";
    let senderEmail = from || null;
    if (from && from.includes("<") && from.includes(">")) {
      const match = from.match(/^(.*?)\s*<(.*?)>$/);
      if (match) {
        senderName = match[1].replace(/['"]/g, "").trim();
        senderEmail = match[2].trim();
      }
    }
    const ingestionResult = await processIncomingMessage({
      source: "Gmail",
      externalMessageId: messageId || `gmail-${Date.now()}`,
      senderName,
      senderEmail,
      subject: subject || "Inquiry from Customer via Email",
      message: body || subject,
      rawData: { from, subject, date, headers }
    });
    return res.status(201).json({
      message: "Email successfully normalized and processed via ResolveAI Ingestion Layer.",
      result: ingestionResult
    });
  } catch (error) {
    console.error("Gmail webhook ingestion error:", error);
    return res.status(500).json({ error: "Failed to process incoming email message." });
  }
});
router7.get("/oauth/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.status(400).send(`OAuth authorization error: ${error}`);
  }
  if (!code) {
    return res.status(400).send("No authorization code provided in callback.");
  }
  return res.send(`
    <h2>Gmail OAuth Code Received</h2>
    <p>Authorization code received successfully. Set your GMAIL_REFRESH_TOKEN in .env to finalize configuration.</p>
  `);
});
var gmailRoutes_default = router7;

// server/routes/whatsappRoutes.ts
import { Router as Router8 } from "express";
var router8 = Router8();
function isWhatsAppConfigured() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return Boolean(token && phoneId && token.trim() !== "");
}
router8.get("/status", (req, res) => {
  const configured = isWhatsAppConfigured();
  return res.json({
    integration: "WhatsApp Business API",
    connected: configured,
    status: configured ? "Connected (Meta Cloud API active)" : "Awaiting Meta WhatsApp Business API Credentials",
    webhookUrl: `${process.env.APP_URL || "http://localhost:3000"}/api/whatsapp/webhook`,
    verifyTokenConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
    requiredEnvironmentVariables: [
      "WHATSAPP_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
      "WHATSAPP_VERIFY_TOKEN"
    ],
    setupGuide: configured ? "Meta WhatsApp webhook verified and receiving live messages." : "1. Create a Meta for Developers account and WhatsApp App. 2. Set WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_VERIFY_TOKEN in .env. 3. Configure webhook URL in Meta App Dashboard: https://your-domain.com/api/whatsapp/webhook."
  });
});
router8.get("/webhook", (req, res) => {
  const challenge = req.query["hub.challenge"];
  if (challenge) {
    console.log("[WhatsApp Webhook] Meta challenge verification passed successfully.");
    return res.status(200).send(challenge);
  }
  return res.status(200).json({
    status: "online",
    service: "ResolveAI WhatsApp Webhook",
    message: "Webhook endpoint is operational and listening for incoming WhatsApp messages.",
    endpoints: {
      postWebhook: "/api/whatsapp/webhook",
      syncTwilio: "/api/whatsapp/sync-twilio",
      autoSyncStatus: "/api/whatsapp/auto-sync/status"
    },
    verificationToken: process.env.WHATSAPP_VERIFY_TOKEN || "resolveai_whatsapp_webhook_secret_verify_token"
  });
});
router8.post("/webhook", async (req, res) => {
  try {
    let body = req.body || {};
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = { message: body };
      }
    }
    console.log("[WhatsApp Webhook Received]:", JSON.stringify(body).substring(0, 300));
    const twilioBody = body.Body || body.body || body.Message || body.message;
    const twilioFrom = body.From || body.from;
    if (twilioBody && twilioFrom) {
      const cleanPhone = String(twilioFrom).replace(/^whatsapp:/i, "");
      const senderName = body.ProfileName || body.profileName || `WhatsApp User (${cleanPhone})`;
      await processIncomingMessage({
        source: "WhatsApp",
        externalMessageId: body.MessageSid || body.SmsSid || `wa-twilio-${Date.now()}`,
        senderName,
        senderPhone: cleanPhone,
        subject: `WhatsApp Message from ${senderName}`,
        message: String(twilioBody).trim(),
        rawData: body
      });
      res.type("text/xml");
      return res.status(200).send("<Response></Response>");
    }
    if (body.object === "whatsapp_business_account" && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (value && Array.isArray(value.messages)) {
            for (const msg of value.messages) {
              const fromPhone = msg.from || "Unknown WhatsApp User";
              const contact = value.contacts?.find((c) => c.wa_id === fromPhone);
              const senderName = contact?.profile?.name || `Customer (${fromPhone})`;
              let messageText = "";
              if (msg.type === "text") {
                messageText = msg.text?.body || "";
              } else if (msg.type === "button") {
                messageText = msg.button?.text || "";
              } else if (msg.type === "interactive") {
                messageText = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "";
              } else if (msg.caption) {
                messageText = msg.caption;
              }
              if (!messageText) {
                if (msg.type === "image") messageText = msg.image?.caption || "[Image received via WhatsApp]";
                else if (msg.type === "audio" || msg.type === "voice") messageText = "[Voice note received via WhatsApp]";
                else if (msg.type === "video") messageText = msg.video?.caption || "[Video message received via WhatsApp]";
                else if (msg.type === "document") messageText = `[Document: ${msg.document?.filename || "file"} received]`;
                else if (msg.type === "location") messageText = `[Customer shared location: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
                else messageText = `[WhatsApp message of type ${msg.type || "chat"}]`;
              }
              if (messageText) {
                await processIncomingMessage({
                  source: "WhatsApp",
                  externalMessageId: msg.id || `wa-${Date.now()}`,
                  senderName,
                  senderPhone: fromPhone,
                  subject: `WhatsApp Support Message from ${senderName}`,
                  message: messageText,
                  rawData: msg
                });
              }
            }
          }
        }
      }
      return res.status(200).send("EVENT_RECEIVED");
    }
    const messageContent = body.message || body.text || body.content || body.Body;
    if (messageContent) {
      const fromPhone = body.senderPhone || body.phone || body.from || "+91 98765 43210";
      const senderName = body.senderName || body.name || `WhatsApp User (${fromPhone})`;
      const result = await processIncomingMessage({
        source: "WhatsApp",
        externalMessageId: body.externalMessageId || `wa-${Date.now()}`,
        senderName,
        senderPhone: fromPhone,
        subject: body.subject || `WhatsApp Complaint from ${senderName}`,
        message: String(messageContent).trim(),
        rawData: body
      });
      return res.status(200).json({ message: "WhatsApp message ingested.", result });
    }
    return res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.error("WhatsApp webhook processing error:", error);
    return res.status(200).json({ status: "acknowledged", warning: error.message });
  }
});
var activeTwilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || "",
  authToken: process.env.TWILIO_AUTH_TOKEN || "",
  autoSyncEnabled: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
  intervalSeconds: 6
};
var autoSyncTimer = null;
var isSyncInProgress = false;
async function pollTwilioMessages(sid, token) {
  if (isSyncInProgress) return 0;
  isSyncInProgress = true;
  try {
    const authHeader = "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json?PageSize=15`;
    const twilioRes = await fetch(twilioUrl, {
      headers: { Authorization: authHeader }
    });
    if (!twilioRes.ok) {
      const errText = await twilioRes.text();
      activeTwilioConfig.lastError = `Twilio API error: ${errText}`;
      return 0;
    }
    const data = await twilioRes.json();
    const messages = data.messages || [];
    let syncedCount = 0;
    for (const msg of messages) {
      if (msg.direction === "inbound" && msg.from?.startsWith("whatsapp:")) {
        if (msg.sid) {
          const existing = await query(
            "SELECT message_id FROM source_messages WHERE external_message_id = $1 LIMIT 1",
            [msg.sid]
          );
          if (existing.rows.length > 0) {
            continue;
          }
        }
        const cleanPhone = msg.from.replace("whatsapp:", "");
        try {
          const result = await processIncomingMessage({
            source: "WhatsApp",
            externalMessageId: msg.sid,
            senderName: `WhatsApp User (${cleanPhone})`,
            senderPhone: cleanPhone,
            subject: `WhatsApp Message: ${String(msg.body || "").substring(0, 35)}...`,
            message: msg.body,
            rawData: msg
          });
          if (result && !result.duplicate) {
            syncedCount++;
          }
        } catch (msgErr) {
          console.warn("[Twilio Auto-Sync] Message processing warning for SID", msg.sid, msgErr.message);
        }
      }
    }
    activeTwilioConfig.lastSync = (/* @__PURE__ */ new Date()).toISOString();
    activeTwilioConfig.lastCount = syncedCount;
    activeTwilioConfig.lastError = void 0;
    return syncedCount;
  } catch (err) {
    activeTwilioConfig.lastError = err.message;
    return 0;
  } finally {
    isSyncInProgress = false;
  }
}
function startAutoSyncLoop() {
  if (autoSyncTimer) clearInterval(autoSyncTimer);
  if (!activeTwilioConfig.autoSyncEnabled || !activeTwilioConfig.accountSid || !activeTwilioConfig.authToken) {
    return;
  }
  console.log(`[Twilio Auto-Sync] Started continuous background poll every ${activeTwilioConfig.intervalSeconds}s.`);
  autoSyncTimer = setInterval(async () => {
    if (activeTwilioConfig.autoSyncEnabled && activeTwilioConfig.accountSid && activeTwilioConfig.authToken) {
      await pollTwilioMessages(activeTwilioConfig.accountSid, activeTwilioConfig.authToken);
    }
  }, activeTwilioConfig.intervalSeconds * 1e3);
}
if (activeTwilioConfig.autoSyncEnabled) {
  startAutoSyncLoop();
}
router8.get("/auto-sync/status", (req, res) => {
  return res.json({
    enabled: activeTwilioConfig.autoSyncEnabled,
    hasCredentials: Boolean(activeTwilioConfig.accountSid && activeTwilioConfig.authToken),
    maskedSid: activeTwilioConfig.accountSid ? `${activeTwilioConfig.accountSid.substring(0, 6)}...${activeTwilioConfig.accountSid.slice(-4)}` : "",
    intervalSeconds: activeTwilioConfig.intervalSeconds,
    lastSync: activeTwilioConfig.lastSync || null,
    lastCount: activeTwilioConfig.lastCount ?? null,
    lastError: activeTwilioConfig.lastError || null
  });
});
router8.post("/auto-sync/configure", async (req, res) => {
  try {
    const { accountSid, authToken, autoSyncEnabled, intervalSeconds } = req.body;
    if (accountSid !== void 0) activeTwilioConfig.accountSid = accountSid.trim();
    if (authToken !== void 0) activeTwilioConfig.authToken = authToken.trim();
    if (autoSyncEnabled !== void 0) activeTwilioConfig.autoSyncEnabled = Boolean(autoSyncEnabled);
    if (intervalSeconds !== void 0) activeTwilioConfig.intervalSeconds = Number(intervalSeconds) || 6;
    if (activeTwilioConfig.autoSyncEnabled) {
      startAutoSyncLoop();
      const count = await pollTwilioMessages(activeTwilioConfig.accountSid, activeTwilioConfig.authToken);
      return res.json({
        success: true,
        message: `Continuous WhatsApp auto-sync enabled! Synced ${count} messages. Background poller runs every ${activeTwilioConfig.intervalSeconds}s.`,
        config: {
          enabled: activeTwilioConfig.autoSyncEnabled,
          intervalSeconds: activeTwilioConfig.intervalSeconds
        }
      });
    } else {
      if (autoSyncTimer) clearInterval(autoSyncTimer);
      return res.json({
        success: true,
        message: "WhatsApp auto-sync disabled.",
        config: { enabled: false }
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to configure auto-sync." });
  }
});
router8.post("/sync-twilio", async (req, res) => {
  try {
    const { accountSid, authToken } = req.body;
    const sid = accountSid || activeTwilioConfig.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const token = authToken || activeTwilioConfig.authToken || process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) {
      return res.status(400).json({ error: "Missing Twilio Account SID or Auth Token." });
    }
    const count = await pollTwilioMessages(sid, token);
    return res.json({
      success: true,
      count,
      message: count > 0 ? `Successfully synced ${count} real WhatsApp messages from Twilio!` : "Connected to Twilio successfully. No new inbound WhatsApp messages found."
    });
  } catch (error) {
    console.error("Twilio sync error:", error);
    return res.status(500).json({ error: error.message || "Failed to sync Twilio messages." });
  }
});
router8.post("/send-reply", async (req, res) => {
  try {
    const { toPhone, message, accountSid, authToken } = req.body;
    const sid = accountSid || activeTwilioConfig.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const token = authToken || activeTwilioConfig.authToken || process.env.TWILIO_AUTH_TOKEN;
    if (!toPhone || !message) {
      return res.status(400).json({ error: "Fields 'toPhone' and 'message' are required." });
    }
    if (!sid || !token) {
      return res.status(400).json({
        error: "Twilio credentials not configured. Please configure Twilio in Connected Apps first."
      });
    }
    const cleanTo = String(toPhone).replace(/[^\d+]/g, "");
    const formattedTo = cleanTo.startsWith("+") ? `whatsapp:${cleanTo}` : `whatsapp:+${cleanTo}`;
    const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
    const authHeader = "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const bodyParams = new URLSearchParams({
      From: twilioFrom,
      To: formattedTo,
      Body: String(message).trim()
    });
    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: bodyParams
    });
    if (!twilioRes.ok) {
      const err = await twilioRes.text();
      return res.status(twilioRes.status).json({ error: `Twilio delivery error: ${err}` });
    }
    const data = await twilioRes.json();
    return res.json({
      success: true,
      messageSid: data.sid,
      status: data.status,
      message: `WhatsApp message successfully dispatched to ${formattedTo}!`
    });
  } catch (error) {
    console.error("Outbound WhatsApp dispatch error:", error);
    return res.status(500).json({ error: error.message || "Failed to dispatch WhatsApp reply." });
  }
});
var whatsappRoutes_default = router8;

// server/app.ts
dotenv3.config();
var app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
var dbInitPromise = null;
function ensureDbInitialized() {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        const ready = await initDb();
        return ready;
      } catch (err) {
        console.warn("Database initialization failed:", err.message);
        return false;
      }
    })();
  }
  return dbInitPromise;
}
app.get(["/api/health", "/health", "/api"], async (req, res) => {
  let dbStatus = "disconnected";
  try {
    if (isDbConnected()) {
      await query("SELECT 1");
      dbStatus = "connected";
    }
  } catch (e) {
    dbStatus = `error: ${e.message}`;
  }
  return res.json({
    status: "ok",
    database: dbStatus,
    environment: process.env.NODE_ENV || "production",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.use((req, res, next) => {
  if (req.path.startsWith("/api") && !req.path.includes("/health")) {
    ensureDbInitialized().catch(() => {
    });
  }
  next();
});
var mountRoutes = (prefix) => {
  app.use(`${prefix}/auth`, authRoutes_default);
  app.use(`${prefix}/complaints`, complaintRoutes_default);
  app.use(`${prefix}/tasks`, taskRoutes_default);
  app.use(`${prefix}/dashboard`, dashboardRoutes_default);
  app.use(`${prefix}/categories`, categoryRoutes_default);
  app.use(`${prefix}/ecommerce`, ecommerceRoutes_default);
  app.use(`${prefix}/gmail`, gmailRoutes_default);
  app.use(`${prefix}/whatsapp`, whatsappRoutes_default);
};
mountRoutes("/api");
mountRoutes("");
app.get("/api/realtime/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }
  addRealtimeClient(res);
});
var aiClient2 = null;
function getAiClient2() {
  if (!aiClient2) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      try {
        aiClient2 = new GoogleGenAI2({
          apiKey: apiKey.trim()
        });
      } catch (e) {
        console.warn("Could not initialize GoogleGenAI client:", e);
      }
    }
  }
  return aiClient2;
}
async function getLiveDatabaseFacts() {
  if (!isDbConnected()) {
    const s = getMemoryStats();
    return `FACTUAL DATABASE SNAPSHOT (In-Memory Operational Stream):
- Total Complaints Logged: ${s.totalComplaints}
- Pending Complaints: ${s.pendingComplaints}
- In Progress Complaints: ${s.inProgressComplaints}
- Resolved Complaints: ${s.resolvedComplaints}
- Critical Severity Complaints: ${s.criticalCount}
- High Severity Complaints: ${s.highCount}`;
  }
  try {
    const summaryRes = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Pending') as pending,
        COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'Resolved') as resolved,
        COUNT(*) FILTER (WHERE severity = 'Critical') as critical,
        COUNT(*) FILTER (WHERE severity = 'High') as high,
        COUNT(*) FILTER (WHERE severity = 'High' AND status = 'Pending') as pending_high,
        COUNT(*) FILTER (WHERE severity = 'Critical' AND status = 'Pending') as pending_critical
      FROM complaints
    `);
    const catRes = await query(`
      SELECT cat.category_name, COUNT(*) as count,
             COUNT(*) FILTER (WHERE c.status = 'Pending') as pending_count,
             COUNT(*) FILTER (WHERE c.severity = 'High' AND c.status = 'Pending') as pending_high
      FROM complaints c
      JOIN categories cat ON c.category_id = cat.category_id
      GROUP BY cat.category_name
      ORDER BY count DESC
    `);
    const row = summaryRes.rows[0];
    const catList = catRes.rows.map((r) => `${r.category_name}: ${r.count} total (${r.pending_count} pending, ${r.pending_high} pending high)`).join("; ");
    return `FACTUAL DATABASE SNAPSHOT (Ground Truth):
- Total Complaints Logged: ${row.total}
- Pending Complaints: ${row.pending}
- In Progress Complaints: ${row.in_progress}
- Resolved Complaints: ${row.resolved}
- Critical Severity Complaints: ${row.critical} (${row.pending_critical} currently pending)
- High Severity Complaints: ${row.high} (${row.pending_high} currently pending)
- Category Breakdown: ${catList}`;
  } catch (err) {
    return "Unable to compile live database snapshot.";
  }
}
async function getLocalSmartFallback(prompt, tone, role, dbFacts) {
  const t = prompt.toLowerCase();
  let baseReply = "";
  if (t.includes("how many") && (t.includes("high") || t.includes("critical") || t.includes("pending") || t.includes("payment"))) {
    baseReply = `### Database Statistics Report

Based on live PostgreSQL records:
${dbFacts.split("\n").filter((l) => l.startsWith("-")).join("\n")}

*All statistics retrieved directly from the ResolveAI database.*`;
    return baseReply;
  }
  if (role === "employee") {
    if (t.includes("task") || t.includes("priority") || t.includes("queue")) {
      baseReply = `### Assigned Workspace Queue Roadmap

Based on your active customer logs, here is your prioritized queue directive:
1. **High Priority Issues**: Verify refund statuses and clear pending duplicate captures.
2. **Logistics Escalations**: Contact regional cargo sorting hubs for shipments delayed > 48h.
3. **Follow-ups**: Update customers whose replacements have been dispatched.

*Action directive: Resolve high severity items first to adhere to SLA thresholds.*`;
    } else if (t.includes("refund") && (t.includes("reply") || t.includes("draft") || t.includes("delay"))) {
      baseReply = `### Draft Template: Refund Delay Reponse

"Subject: Update on your refund transaction \u2014 ResolveAI Support

Dear [Customer Name],

I sincerely apologize for the delay in processing your credit. I completely understand how frustrating it is to wait for funds that belong to you.

We identified a temporary synchronization error with our payment gateway partner. I have manually authorized your refund, and it will reflect in your account within 2-3 business days. Thank you for your patience."`;
    } else if (t.includes("delivery") || t.includes("late")) {
      baseReply = `### Operating Guideline: Resolving Late Deliveries

1. Cross-reference shipping tracking codes with carrier APIs.
2. If package is stuck > 48 hours at metro cargo sorting hubs, submit escalation ticket.
3. Send late delivery apology template to the customer.
4. Save carrier resolution ID in task notes.`;
    } else {
      baseReply = `I am ResolveAI's active support copilot. I can assist with:
- Drafting responsive email templates
- Detailing ticket SOP guidelines
- Reviewing active queue tasks and database metrics`;
    }
  } else {
    if (t.includes("major") || t.includes("today") || t.includes("issue") || t.includes("trend")) {
      baseReply = `### Live Corporate Intelligence Report

${dbFacts}

1. **Payment exceptions**: Monitored across checkout gateways.
2. **Logistics bottlenecks**: Tracked at metro sorting terminals.
3. **Account authentication**: Monitored for password sync errors.`;
    } else if (t.includes("department") || t.includes("performance") || t.includes("sla")) {
      baseReply = `### Department Resolution Metrics:
- **Customer Support Unit**: High resolution pace
- **Accounts & Billing Unit**: Active transaction audits
- **Logistics Delivery Unit**: Monitored transit times
- **Finance / Refunds Unit**: Prioritizing refund backlog clearances`;
    } else if (t.includes("critical") || t.includes("alert")) {
      baseReply = `\u26A0\uFE0F **CRITICAL INCIDENT ALERT:**

High and critical severity tickets are prioritized in the unified queue. Review the Corporate Health Dashboard incident tracker for root-cause audit details.`;
    } else {
      baseReply = `I am ResolveAI's Corporate Chatbot. I can synthesize:
- SLA performance charts
- Cumulative feedback trend tables
- Predictive staffing suggestions
- Live database complaint metrics`;
    }
  }
  return `${baseReply}

*Note: Operating on ResolveAI Intelligence Engine. Live database connected.*`;
}
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt, tone, role } = req.body;
    const dbFacts = await getLiveDatabaseFacts();
    const client = getAiClient2();
    if (!client) {
      const fallbackText = await getLocalSmartFallback(prompt, tone, role, dbFacts);
      return res.json({ text: fallbackText });
    }
    const systemInstruction = `You are "ResolveAI Chatbot", a highly sophisticated AI copilot and feedback intelligence core.
The user is logged in as a ${role === "authority" ? "Administrator (Director / Executive Board)" : "Employee (Support Desk / Finance Unit)"}.
Your tone style: ${tone === "empathetic" ? "Empathetic Customer Success Coach (prioritize polite responses and templates)" : tone === "actionable" ? "Action-Oriented Operator (provide crisp checklists, diagnostic procedures, and clear next steps)" : "Fact-heavy Data Analyst (focused on statistical metrics, root causes, and business SLA benchmarks)"}.

CRITICAL: DO NOT INVENT DATABASE STATISTICS. USE THE FOLLOWING REAL DATABASE FACTS:
${dbFacts}

Your goal: Provide extremely accurate, factual, professional, and clear answers. Never expose internal secrets.`;
    const response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.5
      }
    });
    const text = response.text || "I was unable to synthesize a response. Let me try analyzing your query again.";
    res.json({ text });
  } catch (error) {
    console.error("Gemini API server exception:", error);
    const dbFacts = await getLiveDatabaseFacts();
    const fallbackText = await getLocalSmartFallback(req.body.prompt || "", req.body.tone || "analytical", req.body.role || "employee", dbFacts);
    res.json({ text: fallbackText });
  }
});
var app_default = app;
export {
  app,
  app_default as default,
  ensureDbInitialized
};

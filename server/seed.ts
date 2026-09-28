import bcrypt from "bcryptjs";
import { getDb } from "./db";

export async function seedDatabase() {
  const db = await getDb();

  // Check if already seeded
  const check = await db.query("SELECT COUNT(*) as count FROM source");
  if (Number(check.rows[0]?.count) > 0) {
    console.log("Database already initialized and seeded.");
    return;
  }

  console.log("Seeding ResolveAI PostgreSQL database...");

  // 1. Seed Sources
  const sources = [
    { id: "src_gmail", name: "Gmail", type: "email", status: "configured", account: "support@resolveai.in" },
    { id: "src_whatsapp", name: "WhatsApp", type: "messaging", status: "configured", account: "+1 (555) 302-9912" },
    { id: "src_ecommerce", name: "E-Commerce", type: "review", status: "active", account: "Amazon / Shopify Storefront" },
    { id: "src_website", name: "Website", type: "web_form", status: "active", account: "ResolveAI Contact Portal" },
    { id: "src_manual", name: "Manual", type: "manual", status: "active", account: "Internal Agent Desk" }
  ];

  for (const s of sources) {
    await db.query(
      `INSERT INTO source (source_id, source_name, source_type, connection_status, account_name, last_sync, status)
       VALUES ($1, $2, $3, $4, $5, NOW(), 'enabled')`,
      [s.id, s.name, s.type, s.status, s.account]
    );
  }

  // 2. Seed Employees
  const passwordHash = await bcrypt.hash("keya123", 10);
  const employees = [
    { id: "emp_keya", name: "Keya", email: "keya@northwind.com", role: "employee", dept: "Finance & Support" },
    { id: "emp_authority", name: "Keya Suthar", email: "keyasuthar@northwind.com", role: "authority", dept: "Executive Operations" },
    { id: "emp_rahul", name: "Rahul Verma", email: "rahul.v@resolveai.in", role: "employee", dept: "Logistics Delivery" },
    { id: "emp_priya", name: "Priya Nair", email: "priya.n@resolveai.in", role: "employee", dept: "Payments & Gateway" },
    { id: "emp_amit", name: "Amit Patel", email: "amit.p@resolveai.in", role: "employee", dept: "Product Quality" },
    { id: "emp_neha", name: "Neha Joshi", email: "neha.j@resolveai.in", role: "employee", dept: "Customer Support" }
  ];

  for (const emp of employees) {
    await db.query(
      `INSERT INTO employee (employee_id, name, email, password_hash, role, dept, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (email) DO NOTHING`,
      [emp.id, emp.name, emp.email, passwordHash, emp.role, emp.dept]
    );
  }

  // 3. Seed Core Tasks matching existing UI initial tasks (#4521 - #4526)
  const coreDataset = [
    {
      cid: "#4521",
      srcId: "src_gmail",
      sender: "Rohan Kapoor",
      email: "rohan.k@example.com",
      phone: "+91 98201 11234",
      subject: "Resolve refund complaint",
      content: "I cancelled order #ORD-9912 fifteen days ago and was promised a full refund in 3 days. My bank confirms no credit transaction has reached them.",
      category: "Refund & Compensation",
      sentiment: "Negative",
      severity: "High",
      repeated: true,
      summary: "Customer waiting 15 days for cancelled order refund. Bank ledger confirms no credit release.",
      recommendation: "Verify gateway transaction ID, manually re-authorize credit, send apology email template.",
      priority: "High",
      status: "Pending",
      notes: "",
      assignedEmp: "emp_keya",
      daysAgo: 1
    },
    {
      cid: "#4522",
      srcId: "src_whatsapp",
      sender: "Ananya Sen",
      email: "ananya.s@example.com",
      phone: "+91 99342 55678",
      subject: "Follow up on delivery delay",
      content: "Package #TRK-8812 was promised for delivery on Friday. It is now Thursday of next week. Tracking shows stuck at cargo hub for 6 days with no movement.",
      category: "Logistics & Delivery",
      sentiment: "Negative",
      severity: "High",
      repeated: true,
      summary: "Package delayed 6 days past delivery ETA; immobilized at regional cargo distribution hub.",
      recommendation: "Trigger priority logistics escalation with freight partner and dispatch SMS delivery update.",
      priority: "High",
      status: "In Progress",
      notes: "Contacted regional courier hub manager. Delivery truck dispatched.",
      assignedEmp: "emp_keya",
      daysAgo: 2
    },
    {
      cid: "#4523",
      srcId: "src_website",
      sender: "Gaurav Malhotra",
      email: "gaurav.m@example.com",
      phone: "+91 98110 33451",
      subject: "Investigate duplicate charge",
      content: "During checkout for order #A1092, the payment screen stalled. I pressed confirm again and received two debit SMS notifications for Rs 4,999 each.",
      category: "Payment & Gateway",
      sentiment: "Negative",
      severity: "Medium",
      repeated: false,
      summary: "Duplicate charge of 4,999 INR caused by concurrent checkout attempt during gateway timeout.",
      recommendation: "Cross-reference Stripe/Razorpay charge IDs and void secondary authorization immediately.",
      priority: "Medium",
      status: "Pending",
      notes: "",
      assignedEmp: "emp_keya",
      daysAgo: 3
    },
    {
      cid: "#4524",
      srcId: "src_ecommerce",
      sender: "Sneha Roy",
      email: "sneha.roy@example.com",
      phone: "+91 97721 44550",
      subject: "Update customer on damaged item",
      content: "The package arrived battered with a cracked outer casing and missing cables. Replacement unit shipped yesterday — confirm receipt.",
      category: "Product Quality",
      sentiment: "Negative",
      severity: "Medium",
      repeated: false,
      summary: "Delivered product had cracked casing and missing peripherals; replacement is in transit.",
      recommendation: "Track replacement parcel delivery and verify customer satisfaction upon receipt.",
      priority: "Medium",
      status: "Pending",
      notes: "",
      assignedEmp: "emp_keya",
      daysAgo: 4
    },
    {
      cid: "#4525",
      srcId: "src_website",
      sender: "Devendra Rao",
      email: "devendra.r@example.com",
      phone: "+91 94450 99881",
      subject: "Close resolved login ticket",
      content: "Password reset issue confirmed fixed by customer. SSO auth synchronization restored. Close out ticket.",
      category: "Accounts & Authentication",
      sentiment: "Neutral",
      severity: "Low",
      repeated: false,
      summary: "Single Sign-On authentication password reset loop resolved after session token refresh.",
      recommendation: "Archive security ticket and record resolution in knowledge base.",
      priority: "Low",
      status: "Resolved",
      notes: "Confirmed customer successfully logged into mobile and web portals.",
      assignedEmp: "emp_keya",
      daysAgo: 5
    },
    {
      cid: "#4526",
      srcId: "src_gmail",
      sender: "Meera Krishnan",
      email: "meera.k@example.com",
      phone: "+91 98840 22331",
      subject: "Review support feedback batch",
      content: "5 low-rating survey responses need a personal follow-up call. Customers cited unresponsive chat support during peak evening hours.",
      category: "Customer Support",
      sentiment: "Negative",
      severity: "Low",
      repeated: true,
      summary: "Customer CSAT survey ratings dropped due to 25+ minute queue hold times during peak hours.",
      recommendation: "Schedule outbound concierge call and re-balance agent shift schedules.",
      priority: "Low",
      status: "Pending",
      notes: "",
      assignedEmp: "emp_keya",
      daysAgo: 6
    }
  ];

  // Insert Core Items
  for (const item of coreDataset) {
    const msgId = `msg_${item.cid.replace("#", "")}`;
    const analysisId = `an_${item.cid.replace("#", "")}`;
    const date = new Date(Date.now() - item.daysAgo * 86400000).toISOString();

    // Source message
    await db.query(
      `INSERT INTO source_message (message_id, source_id, external_message_id, sender_name, sender_email, sender_phone, subject, message_content, received_at, processing_status, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'converted_to_complaint', $10)`,
      [msgId, item.srcId, `ext-${item.cid}`, item.sender, item.email, item.phone, item.subject, item.content, date, JSON.stringify(item)]
    );

    // AI Analysis
    await db.query(
      `INSERT INTO ai_analysis (analysis_id, message_id, sentiment, category, severity_level, repeated_issue, summary, ai_recommendation, confidence, analyzed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0.94, $9)`,
      [analysisId, msgId, item.sentiment, item.category, item.severity, item.repeated, item.summary, item.recommendation, date]
    );

    // Complaint
    await db.query(
      `INSERT INTO complaint (complaint_id, message_id, category_name, subject, description, severity, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
      [item.cid, msgId, item.category, item.subject, item.content, item.severity, item.status, date]
    );

    // Task
    await db.query(
      `INSERT INTO task (task_id, complaint_id, assigned_employee_id, priority, status, due_date, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
      [item.cid, item.cid, item.assignedEmp, item.priority, item.status, new Date(Date.now() + 86400000).toISOString(), item.notes, date]
    );

    // Status History
    await db.query(
      `INSERT INTO status_history (history_id, complaint_id, task_id, status, updated_by, updated_at, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [`sh_${item.cid.replace("#", "")}`, item.cid, item.cid, item.status, "System Workflow Dispatcher", date, `Task auto-dispatched from ${item.srcId}`]
    );
  }

  // 4. Generate 45 additional historical complaints across all categories, months, and sources
  const sampleCategories = [
    { name: "Payment & Gateway", dept: "Payments & Gateway", emp: "emp_priya", severities: ["Critical", "High", "Medium"] },
    { name: "Logistics & Delivery", dept: "Logistics Delivery", emp: "emp_rahul", severities: ["High", "Medium", "Low"] },
    { name: "Refund & Compensation", dept: "Finance & Support", emp: "emp_keya", severities: ["High", "Critical", "Medium"] },
    { name: "Product Quality", dept: "Product Quality", emp: "emp_amit", severities: ["Medium", "High", "Low"] },
    { name: "Accounts & Authentication", dept: "Customer Support", emp: "emp_neha", severities: ["Medium", "Low"] },
    { name: "Customer Support", dept: "Customer Support", emp: "emp_neha", severities: ["Low", "Medium"] },
    { name: "Platform Technical", dept: "Payments & Gateway", emp: "emp_priya", severities: ["Critical", "High", "Medium"] }
  ];

  const sourceIds = ["src_gmail", "src_whatsapp", "src_ecommerce", "src_website"];

  for (let i = 1; i <= 45; i++) {
    const idNum = 4526 + i;
    const cid = `#${idNum}`;
    const cat = sampleCategories[i % sampleCategories.length];
    const srcId = sourceIds[i % sourceIds.length];
    const sev = cat.severities[i % cat.severities.length];
    
    // Status distribution: ~60% Resolved, ~25% In Progress, ~15% Pending
    let stat = "Resolved";
    if (i % 5 === 0) stat = "Pending";
    else if (i % 3 === 0) stat = "In Progress";
    else if (i % 17 === 0) stat = "Escalated";

    const daysBack = (i * 3) % 180; // Spread over last 6 months
    const date = new Date(Date.now() - daysBack * 86400000).toISOString();
    const msgId = `msg_${idNum}`;
    const analysisId = `an_${idNum}`;

    const subject = `${cat.name} Incident Report [${srcId.replace("src_", "").toUpperCase()}] - Batch #${idNum}`;
    const content = `Automated customer feedback record ingested via ${srcId}. Issue regarding ${cat.name} operational criteria. Customer experienced friction requiring standard remediation.`;

    await db.query(
      `INSERT INTO source_message (message_id, source_id, external_message_id, sender_name, sender_email, sender_phone, subject, message_content, received_at, processing_status, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'converted_to_complaint', $10)`,
      [msgId, srcId, `ext-${idNum}`, `Customer ${idNum}`, `customer${idNum}@example.com`, `+1 (555) 010-${1000 + i}`, subject, content, date, JSON.stringify({ simulated: true, batchId: idNum })]
    );

    await db.query(
      `INSERT INTO ai_analysis (analysis_id, message_id, sentiment, category, severity_level, repeated_issue, summary, ai_recommendation, confidence, analyzed_at)
       VALUES ($1, $2, 'Negative', $3, $4, $5, $6, $7, 0.91, $8)`,
      [analysisId, msgId, cat.name, sev, i % 4 === 0, `Automated summary for ${cat.name} ticket ${cid}`, `Apply standard operating procedure for ${cat.dept}.`, date]
    );

    await db.query(
      `INSERT INTO complaint (complaint_id, message_id, category_name, subject, description, severity, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
      [cid, msgId, cat.name, subject, content, sev, stat, date]
    );

    await db.query(
      `INSERT INTO task (task_id, complaint_id, assigned_employee_id, priority, status, due_date, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
      [cid, cid, cat.emp, sev === "Critical" ? "High" : sev, stat, new Date(Date.now() + 86400000).toISOString(), stat === "Resolved" ? "Closed after standard investigation." : "", date]
    );

    await db.query(
      `INSERT INTO status_history (history_id, complaint_id, task_id, status, updated_by, updated_at, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [`sh_${idNum}`, cid, cid, stat, "System Workflow Dispatcher", date, `Record initialized from ${srcId}`]
    );
  }

  console.log("Successfully seeded 51 comprehensive records into ResolveAI PostgreSQL database!");
}

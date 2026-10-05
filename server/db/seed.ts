import bcrypt from "bcryptjs";
import { pool, query, isDbConnected, initDb } from "../config/db";

export async function seedDatabase() {
  console.log("Starting ResolveAI database seeding...");

  const isReady = await initDb();
  if (!isReady) {
    console.warn("Skipping database seeding: PostgreSQL is not connected.");
    return false;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Seed Departments
    const departments = [
      { name: "Finance / Refunds", desc: "Handles payment reconciliations, refunds, and bank chargebacks." },
      { name: "Logistics & Delivery", desc: "Oversees courier partner tracking, shipments, and delivery timelines." },
      { name: "Customer Support", desc: "Direct consumer support for inquiries, product replacements, and general issues." },
      { name: "Technical / Platform", desc: "Software engineering bugs, server glitches, mobile app crashes, and API locks." },
      { name: "Accounts & Billing", desc: "User account security, subscription billing, and profile synchronization." },
    ];

    const deptMap: Record<string, number> = {};
    for (const d of departments) {
      const res = await client.query(
        `INSERT INTO departments (department_name, description)
         VALUES ($1, $2)
         ON CONFLICT (department_name) DO UPDATE SET description = EXCLUDED.description
         RETURNING department_id`,
        [d.name, d.desc]
      );
      deptMap[d.name] = res.rows[0].department_id;
    }

    // 2. Seed Default Users & Employees
    const defaultPasswordHash = await bcrypt.hash("resolveai123", 10);

    const users = [
      {
        name: "Keya",
        email: "keya@northwind.com",
        role: "employee",
        phone: "+91 98765 00001",
        dept: "Finance / Refunds",
        designation: "Finance Operations Specialist",
      },
      {
        name: "Keya Suthar",
        email: "keyasuthar@northwind.com",
        role: "authority",
        phone: "+91 98765 00002",
        dept: "Finance / Refunds",
        designation: "Executive Director",
      },
      {
        name: "Rahul Verma",
        email: "rahul.v@northwind.com",
        role: "employee",
        phone: "+91 98765 00003",
        dept: "Logistics & Delivery",
        designation: "Logistics Hub Dispatcher",
      },
      {
        name: "Neha Gupta",
        email: "neha.g@northwind.com",
        role: "employee",
        phone: "+91 98765 00004",
        dept: "Customer Support",
        designation: "Senior Support Advocate",
      },
      {
        name: "Amit Patel",
        email: "amit.p@northwind.com",
        role: "employee",
        phone: "+91 98765 00005",
        dept: "Technical / Platform",
        designation: "Systems Reliability Engineer",
      },
      {
        name: "Priya Sharma",
        email: "priya.s@northwind.com",
        role: "employee",
        phone: "+91 98765 00006",
        dept: "Accounts & Billing",
        designation: "Billing Systems Lead",
      },
    ];

    const employeeMap: Record<string, number> = {};

    for (const u of users) {
      const userRes = await client.query(
        `INSERT INTO users (name, email, password, role, phone, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
         RETURNING user_id`,
        [u.name, u.email, defaultPasswordHash, u.role, u.phone]
      );
      const userId = userRes.rows[0].user_id;

      if (u.role === "employee") {
        const deptId = deptMap[u.dept] || null;
        const empRes = await client.query(
          `INSERT INTO employees (user_id, department_id, designation, status)
           VALUES ($1, $2, $3, 'active')
           ON CONFLICT (user_id) DO UPDATE SET department_id = EXCLUDED.department_id, designation = EXCLUDED.designation
           RETURNING employee_id`,
          [userId, deptId, u.designation]
        );
        employeeMap[u.email] = empRes.rows[0].employee_id;
      }
    }

    // 3. Seed Sources
    const sources = [
      { name: "Gmail", type: "email", status: "pending_credentials", account: "support@resolveai.in" },
      { name: "WhatsApp", type: "messaging", status: "pending_credentials", account: "+91 1800 123 4567" },
      { name: "E-Commerce", type: "ecommerce", status: "connected", account: "Simulated Review Hub" },
      { name: "Website", type: "web", status: "connected", account: "ResolveAI Web Portal" },
      { name: "Manual", type: "manual", status: "connected", account: "Agent Desk Input" },
    ];

    const sourceMap: Record<string, number> = {};
    for (const s of sources) {
      const sRes = await client.query(
        `INSERT INTO sources (source_name, source_type, connection_status, account_name, last_sync)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (source_name) DO UPDATE SET connection_status = EXCLUDED.connection_status
         RETURNING source_id`,
        [s.name, s.type, s.status, s.account]
      );
      sourceMap[s.name] = sRes.rows[0].source_id;
    }

    // 4. Seed Categories
    const categories = [
      { name: "Logistics & Delivery", desc: "Package transit delays, wrong address routing, and lost parcels", dept: "Logistics & Delivery" },
      { name: "Finance / Refunds", desc: "Refund delays, bank credit wait times, and disputed charges", dept: "Finance / Refunds" },
      { name: "Payment & Gateway Exceptions", desc: "Payment gateway timeouts, double charge incidents, and card authorization errors", dept: "Accounts & Billing" },
      { name: "Product Quality Issues", desc: "Damaged goods, non-functioning electronics, and missing components", dept: "Customer Support" },
      { name: "Platform Technical Glitches", desc: "App crashes, sync errors, and portal timeouts", dept: "Technical / Platform" },
      { name: "Accounts & Authentication", desc: "Password resets, OTP delivery failures, and locked profiles", dept: "Accounts & Billing" },
      { name: "Customer Support Delays", desc: "Long wait times and unanswered support inquiries", dept: "Customer Support" },
    ];

    const categoryMap: Record<string, number> = {};
    for (const c of categories) {
      const deptId = deptMap[c.dept] || null;
      const cRes = await client.query(
        `INSERT INTO categories (category_name, description, department_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (category_name) DO UPDATE SET description = EXCLUDED.description, department_id = EXCLUDED.department_id
         RETURNING category_id`,
        [c.name, c.desc, deptId]
      );
      categoryMap[c.name] = cRes.rows[0].category_id;
    }

    // 5. Seed Synthetic Complaints Across All 4 Sources
    // Check if complaints already seeded
    const checkCount = await client.query(`SELECT COUNT(*) as count FROM complaints`);
    if (parseInt(checkCount.rows[0].count, 10) > 0) {
      console.log(`Database already has ${checkCount.rows[0].count} complaints. Skipping synthetic insert.`);
      await client.query("COMMIT");
      client.release();
      return true;
    }

    console.log("Seeding synthetic complaints across Gmail, WhatsApp, E-Commerce, and Website...");

    const keyaEmpId = employeeMap["keya@northwind.com"];
    const rahulEmpId = employeeMap["rahul.v@northwind.com"];
    const nehaEmpId = employeeMap["neha.g@northwind.com"];
    const amitEmpId = employeeMap["amit.p@northwind.com"];
    const priyaEmpId = employeeMap["priya.s@northwind.com"];

    const syntheticComplaints = [
      {
        source: "Website",
        senderName: "Devansh Nair",
        senderEmail: "devansh.nair@example.com",
        subject: "Refund not received after 15 days of order cancellation",
        message: "Verify refund status and update customer — refund of ₹8,450 for order #ORD-9821 not received after 15 days.",
        category: "Finance / Refunds",
        severity: "High",
        status: "Pending",
        assignedEmpId: keyaEmpId,
        taskPriority: "High",
        sentiment: "Negative",
        repeated: true,
        summary: "Customer waiting over 15 business days for cancellation refund.",
        recommendation: "Check payment gateway transaction ID and execute manual bank reversal.",
        notes: "Escalated to payment reconciliation unit for approval.",
        daysAgo: 2,
      },
      {
        source: "WhatsApp",
        senderName: "Ritu Kapoor",
        senderEmail: "ritu.k@example.com",
        senderPhone: "+91 98111 22334",
        subject: "Delivery delayed 6 days beyond promised arrival estimate",
        message: "Customer reports package delayed 6 days beyond estimate. Courier tracking stuck at northern hub. Confirm new ETA.",
        category: "Logistics & Delivery",
        severity: "High",
        status: "In Progress",
        assignedEmpId: rahulEmpId,
        taskPriority: "High",
        sentiment: "Negative",
        repeated: true,
        summary: "Shipping delay of 6 days due to transit hub backlog.",
        recommendation: "Contact metro cargo dispatcher and dispatch priority re-route.",
        notes: "Called BlueDart dispatcher; package scheduled for delivery tomorrow 11 AM.",
        daysAgo: 3,
      },
      {
        source: "E-Commerce",
        senderName: "Kavita Malhotra",
        senderEmail: "kavita.m@example.com",
        product: "UltraBook Pro 16-inch",
        rating: 1,
        subject: "Duplicate charge captured for single order #A1092",
        message: "Customer charged twice for order #A1092. ₹64,999 debited two times on credit card. Confirm with payments team.",
        category: "Payment & Gateway Exceptions",
        severity: "Critical",
        status: "Pending",
        assignedEmpId: priyaEmpId,
        taskPriority: "High",
        sentiment: "Negative",
        repeated: true,
        summary: "Duplicate transaction authorization hold on customer credit card.",
        recommendation: "Issue immediate void on authorization ID #TXN-88419.",
        notes: "",
        daysAgo: 1,
      },
      {
        source: "Gmail",
        senderName: "Sameer Joshi",
        senderEmail: "sameer.joshi@example.com",
        subject: "Damaged item received in crushed box",
        message: "Product arrived damaged with cracked display. Replacement already shipped — need to confirm tracking receipt with customer.",
        category: "Product Quality Issues",
        severity: "Medium",
        status: "Pending",
        assignedEmpId: nehaEmpId,
        taskPriority: "Medium",
        sentiment: "Negative",
        repeated: false,
        summary: "Item arrived broken in transit; replacement dispatched.",
        recommendation: "Confirm replacement delivery tracking and file carrier insurance claim.",
        notes: "",
        daysAgo: 4,
      },
      {
        source: "Website",
        senderName: "Sunita Choudhury",
        senderEmail: "sunita.c@example.com",
        subject: "Password reset token expired and login blocked",
        message: "Password reset issue confirmed fixed by customer, close out ticket and verify profile login stability.",
        category: "Accounts & Authentication",
        severity: "Low",
        status: "Resolved",
        assignedEmpId: amitEmpId,
        taskPriority: "Low",
        sentiment: "Neutral",
        repeated: false,
        summary: "Password reset token mismatch resolved by manual auth reset.",
        recommendation: "Close ticket and log verified authentication.",
        notes: "Customer confirmed successful sign in on web and mobile app.",
        daysAgo: 6,
      },
      {
        source: "Gmail",
        senderName: "Amanpreet Kaur",
        senderEmail: "aman.kaur@example.com",
        subject: "Low CSAT feedback personal follow-up required",
        message: "5 low-rating survey responses regarding checkout delay need a personal follow-up call and resolution.",
        category: "Customer Support Delays",
        severity: "Low",
        status: "Pending",
        assignedEmpId: keyaEmpId,
        taskPriority: "Low",
        sentiment: "Negative",
        repeated: false,
        summary: "Customer dissatisfaction survey followup required.",
        recommendation: "Conduct empathy call and offer 15% goodwill compensation coupon.",
        notes: "",
        daysAgo: 5,
      },
      {
        source: "WhatsApp",
        senderName: "Tanmay Bansal",
        senderEmail: "tanmay.b@example.com",
        senderPhone: "+91 97777 88888",
        subject: "Checkout payment gateway timed out but bank debited",
        message: "Payment gateway failure logs during flash sale. 340 customer reports of gateway timeouts in past 2 hours.",
        category: "Payment & Gateway Exceptions",
        severity: "Critical",
        status: "Pending",
        assignedEmpId: priyaEmpId,
        taskPriority: "High",
        sentiment: "Negative",
        repeated: true,
        summary: "Payment gateway connection timeouts causing failed order captures.",
        recommendation: "Trigger automatic payment capture sync with Razorpay/Stripe API.",
        notes: "Incident escalated to platform engineering.",
        daysAgo: 0,
      },
      {
        source: "E-Commerce",
        senderName: "Meenakshi Sundaram",
        senderEmail: "meenakshi.s@example.com",
        product: "Smart Home Robot Vacuum",
        rating: 1,
        subject: "Motor defective within 24 hours of first use",
        message: "The robot vacuum stopped functioning and emits a burning smell after first cleaning cycle. Demanding replacement.",
        category: "Product Quality Issues",
        severity: "Medium",
        status: "In Progress",
        assignedEmpId: nehaEmpId,
        taskPriority: "Medium",
        sentiment: "Negative",
        repeated: false,
        summary: "Hardware defect detected on first usage cycle.",
        recommendation: "Dispatch courier pickup for diagnostic replacement.",
        notes: "Return courier scheduled for pickup tomorrow morning.",
        daysAgo: 2,
      },
      {
        source: "Website",
        senderName: "Rajesh Kulkarni",
        senderEmail: "rajesh.k@example.com",
        subject: "Delivery address update request for pending shipment",
        message: "Customer moved to new apartment and needs shipment rerouted before delivery out for delivery scan.",
        category: "Logistics & Delivery",
        severity: "Medium",
        status: "Resolved",
        assignedEmpId: rahulEmpId,
        taskPriority: "Medium",
        sentiment: "Neutral",
        repeated: false,
        summary: "Address update executed prior to outbound delivery scan.",
        recommendation: "Update shipping manifest in courier system.",
        notes: "Rerouted to new address. Delivered successfully.",
        daysAgo: 7,
      },
      {
        source: "Gmail",
        senderName: "Deepak Mehta",
        senderEmail: "deepak.m@example.com",
        subject: "Disputed credit card charge for unrendered services",
        message: "Customer filed formal dispute for ₹12,000 subscription renewal. Reconcile invoices and respond with proof.",
        category: "Finance / Refunds",
        severity: "High",
        status: "In Progress",
        assignedEmpId: keyaEmpId,
        taskPriority: "High",
        sentiment: "Negative",
        repeated: false,
        summary: "Credit card dispute filed for subscription charge.",
        recommendation: "Provide signed digital terms and transaction receipt to issuing bank.",
        notes: "Sent transaction logs and cancellation terms to payment acquirer.",
        daysAgo: 4,
      }
    ];

    for (const item of syntheticComplaints) {
      const sourceId = sourceMap[item.source] || null;
      const catId = categoryMap[item.category] || null;
      const receivedDate = new Date(Date.now() - item.daysAgo * 24 * 60 * 60 * 1000);

      // Insert source_message
      const msgRes = await client.query(
        `INSERT INTO source_messages (
          source_id, sender_name, sender_email, sender_phone, product, rating,
          subject, message_content, received_at, processing_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'converted_to_complaint')
        RETURNING message_id`,
        [
          sourceId,
          item.senderName,
          item.senderEmail,
          (item as any).senderPhone || null,
          item.product || null,
          item.rating || null,
          item.subject,
          item.message,
          receivedDate,
        ]
      );
      const messageId = msgRes.rows[0].message_id;

      // Insert ai_analysis
      await client.query(
        `INSERT INTO ai_analyses (
          message_id, sentiment, category, severity_level, repeated_issue,
          summary, ai_recommendation, confidence, analyzed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0.95, $8)`,
        [
          messageId,
          item.sentiment,
          item.category,
          item.severity,
          item.repeated,
          item.summary,
          item.recommendation,
          receivedDate,
        ]
      );

      // Insert complaint
      const compRes = await client.query(
        `INSERT INTO complaints (
          message_id, category_id, subject, description, severity, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        RETURNING complaint_id`,
        [messageId, catId, item.subject, item.message, item.severity, item.status, receivedDate]
      );
      const complaintId = compRes.rows[0].complaint_id;

      // Insert task
      const dueDate = new Date(receivedDate.getTime() + 24 * 60 * 60 * 1000);
      await client.query(
        `INSERT INTO tasks (
          complaint_id, assigned_employee_id, priority, status, notes, due_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [
          complaintId,
          item.assignedEmpId || null,
          item.taskPriority,
          item.status,
          item.notes || "",
          dueDate,
          receivedDate,
        ]
      );

      // Insert status history
      await client.query(
        `INSERT INTO status_history (
          complaint_id, status, updated_at, remarks
        ) VALUES ($1, $2, $3, $4)`,
        [
          complaintId,
          item.status,
          receivedDate,
          `Initial ingestion from ${item.source}. AI classified as "${item.category}".`
        ]
      );
    }

    await client.query("COMMIT");
    console.log(`Successfully seeded ${syntheticComplaints.length} synthetic complaints across 4 channels.`);
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Database seeding error:", error);
    return false;
  } finally {
    client.release();
  }
}

export interface MemorySourceMessage {
  message_id: number;
  source_name: string;
  sender_name: string | null;
  sender_email: string | null;
  sender_phone: string | null;
  subject: string | null;
  message_content: string;
  rating: number | null;
  product: string | null;
  received_at: string;
  processing_status: string;
}

export interface MemoryComplaint {
  complaint_id: number;
  message_id: number;
  subject: string;
  description: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Resolved" | "Escalated";
  created_at: string;
  updated_at: string;
  category_name: string;
  source_name: string;
  sender_name: string;
  sender_email: string;
  sender_phone?: string;
  product?: string;
  rating?: number;
  sentiment?: string;
  repeated_issue?: boolean;
  ai_summary?: string;
  ai_recommendation?: string;
  assigned_employee_name?: string;
  task_id?: number;
  task_status?: string;
  task_priority?: string;
  task_notes?: string;
}

export interface MemoryTask {
  id: string;
  taskId: number;
  complaintId: number;
  title: string;
  desc: string;
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Resolved";
  notes: string;
  notesOpen: boolean;
  department: string;
  employeeName: string;
  category: string;
  severity: string;
  source: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  created_at: string;
}

let nextMessageId = 100;
let nextComplaintId = 500;
let nextTaskId = 4530;

// Initialize with realistic initial dataset across WhatsApp, Gmail, E-Commerce, Website
const memoryComplaints: MemoryComplaint[] = [
  {
    complaint_id: 4521,
    message_id: 1,
    subject: "Resolve refund complaint",
    description: "Verify refund status and update customer — refund not received after 15 days.",
    severity: "High",
    status: "Pending",
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
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
    task_priority: "High",
  },
  {
    complaint_id: 4522,
    message_id: 2,
    subject: "Follow up on delivery delay",
    description: "Customer reports package delayed 6 days beyond estimate. Confirm new ETA.",
    severity: "High",
    status: "In Progress",
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
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
    task_priority: "High",
  },
  {
    complaint_id: 4523,
    message_id: 3,
    subject: "Double charged on credit card for Order #ORD-10842",
    description: "I checked my ICICI bank statement today and noticed ₹4,299 was deducted twice for the same transaction. Please reverse the duplicate authorization immediately.",
    severity: "High",
    status: "Pending",
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
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
    task_priority: "High",
  },
  {
    complaint_id: 4524,
    message_id: 4,
    subject: "Damaged item received in package",
    description: "Product arrived damaged with cracked casing, replacement shipped — confirm receipt.",
    severity: "Medium",
    status: "Pending",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
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
    task_priority: "Medium",
  },
];

const memoryTasks: MemoryTask[] = [
  {
    id: "#4521",
    taskId: 4521,
    complaintId: 4521,
    title: "Resolve refund complaint",
    desc: "Verify refund status and update customer — refund not received after 15 days.",
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
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
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
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: "#4523",
    taskId: 4523,
    complaintId: 4523,
    title: "Double charged on credit card for Order #ORD-10842",
    desc: "I checked my ICICI bank statement today and noticed ₹4,299 was deducted twice for the same transaction. Please reverse the duplicate authorization immediately.",
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
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "#4524",
    taskId: 4524,
    complaintId: 4524,
    title: "Damaged item received in package",
    desc: "Product arrived damaged with cracked casing, replacement shipped — confirm receipt.",
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
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

export function addMemoryEntry(params: {
  source: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  subject?: string;
  message: string;
  rating?: number | null;
  product?: string | null;
  analysis: any;
  assignedEmployeeName?: string;
}) {
  const messageId = nextMessageId++;
  const complaintId = nextComplaintId++;
  const taskId = nextTaskId++;

  const priority: "High" | "Medium" | "Low" =
    params.analysis.severity === "Critical" || params.analysis.severity === "High"
      ? "High"
      : params.analysis.severity === "Low"
      ? "Low"
      : "Medium";

  const newComplaint: MemoryComplaint = {
    complaint_id: complaintId,
    message_id: messageId,
    subject: params.subject || `${params.analysis.category} issue reported via ${params.source}`,
    description: params.message,
    severity: params.analysis.severity,
    status: "Pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category_name: params.analysis.category,
    source_name: params.source,
    sender_name: params.senderName || "Customer",
    sender_email: params.senderEmail || "",
    sender_phone: params.senderPhone,
    product: params.product || undefined,
    rating: params.rating || undefined,
    sentiment: params.analysis.sentiment,
    repeated_issue: params.analysis.repeatedIssue,
    ai_summary: params.analysis.summary,
    ai_recommendation: params.analysis.recommendation,
    assigned_employee_name: params.assignedEmployeeName || "Keya",
    task_id: taskId,
    task_status: "Pending",
    task_priority: priority,
  };

  const newTask: MemoryTask = {
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
    created_at: new Date().toISOString(),
  };

  // Prepend so latest items appear first
  memoryComplaints.unshift(newComplaint);
  memoryTasks.unshift(newTask);

  return { messageId, complaintId, taskId };
}

export function getMemoryTasks(statusFilter?: string) {
  let list = [...memoryTasks];
  if (statusFilter) {
    list = list.filter((t) => t.status === statusFilter);
  }
  return list;
}

export function updateMemoryTaskStatus(taskId: number, status: "Pending" | "In Progress" | "Resolved") {
  const task = memoryTasks.find((t) => t.taskId === taskId);
  if (task) {
    task.status = status;
    const complaint = memoryComplaints.find((c) => c.complaint_id === task.complaintId);
    if (complaint) {
      complaint.status = status;
      complaint.updated_at = new Date().toISOString();
    }
  }
}

export function updateMemoryTaskNotes(taskId: number, notes: string) {
  const task = memoryTasks.find((t) => t.taskId === taskId);
  if (task) {
    task.notes = notes;
  }
}

export function getMemoryComplaints(limit = 50) {
  return memoryComplaints.slice(0, limit);
}

export function getMemoryComplaintById(id: number) {
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
      ai_recommendation: complaint.ai_recommendation,
    },
    tasks: task ? [task] : [],
    history: [
      {
        history_id: 1,
        complaint_id: id,
        status: complaint.status,
        updated_at: complaint.created_at,
        remarks: `Received via ${complaint.source_name}`,
      },
    ],
  };
}

export function getMemoryStats() {
  const total = memoryComplaints.length;
  const resolved = memoryComplaints.filter((c) => c.status === "Resolved").length;
  const pending = memoryComplaints.filter((c) => c.status === "Pending").length;
  const inProgress = memoryComplaints.filter((c) => c.status === "In Progress").length;
  const escalations = memoryComplaints.filter((c) => c.severity === "Critical" && c.status !== "Resolved").length;
  const critical = memoryComplaints.filter((c) => c.severity === "Critical").length;
  const high = memoryComplaints.filter((c) => c.severity === "High").length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const csat = total > 0 ? Math.min(98, Math.max(75, 80 + Math.round((resolved / total) * 15))) : 89;

  return {
    totalComplaints: total,
    resolvedComplaints: resolved,
    pendingComplaints: pending,
    inProgressComplaints: inProgress,
    pendingEscalations: escalations,
    criticalCount: critical,
    highCount: high,
    resolutionRate,
    csatRating: `${csat}%`,
  };
}

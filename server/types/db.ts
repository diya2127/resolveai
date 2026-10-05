export type UserRole = "employee" | "authority";
export type UserStatus = "active" | "inactive" | "suspended";

export interface DbUser {
  user_id: number;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone?: string | null;
  status: UserStatus;
  created_at: Date;
}

export interface DbDepartment {
  department_id: number;
  department_name: string;
  description: string | null;
  status: "active" | "inactive";
  created_at: Date;
}

export interface DbEmployee {
  employee_id: number;
  user_id: number;
  department_id: number | null;
  designation: string;
  date_joined: Date;
  status: "active" | "inactive" | "on_leave";
  // Joined fields
  user_name?: string;
  user_email?: string;
  department_name?: string;
}

export type SourceType = "email" | "messaging" | "ecommerce" | "web" | "manual";
export type ConnectionStatus = "connected" | "disconnected" | "pending_credentials";

export interface DbSource {
  source_id: number;
  source_name: string;
  source_type: SourceType;
  connection_status: ConnectionStatus;
  account_name: string | null;
  last_sync: Date | null;
  status: "active" | "inactive";
}

export type ProcessingStatus = "pending" | "analyzed" | "converted_to_complaint" | "ignored" | "failed";

export interface DbSourceMessage {
  message_id: number;
  source_id: number | null;
  external_message_id: string | null;
  sender_name: string | null;
  sender_email: string | null;
  sender_phone: string | null;
  subject: string | null;
  message_content: string;
  rating: number | null;
  product: string | null;
  received_at: Date;
  attachment_url: string | null;
  raw_data: any;
  processing_status: ProcessingStatus;
  source_name?: string;
}

export type Sentiment = "Positive" | "Neutral" | "Negative";
export type SeverityLevel = "Low" | "Medium" | "High" | "Critical";

export interface DbAiAnalysis {
  analysis_id: number;
  message_id: number;
  sentiment: Sentiment;
  category: string;
  severity_level: SeverityLevel;
  repeated_issue: boolean;
  summary: string;
  ai_recommendation: string;
  confidence: number;
  analyzed_at: Date;
}

export interface DbCategory {
  category_id: number;
  category_name: string;
  description: string | null;
  department_id: number | null;
  status: "active" | "inactive";
}

export type ComplaintStatus = "Pending" | "In Progress" | "Resolved" | "Escalated" | "Closed";

export interface DbComplaint {
  complaint_id: number;
  message_id: number | null;
  category_id: number | null;
  subject: string;
  description: string;
  severity: SeverityLevel;
  status: ComplaintStatus;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  category_name?: string;
  source_name?: string;
  sender_name?: string;
  sender_email?: string;
}

export type TaskPriority = "Low" | "Medium" | "High";
export type TaskStatus = "Pending" | "In Progress" | "Resolved" | "Escalated";

export interface DbTask {
  task_id: number;
  complaint_id: number;
  assigned_employee_id: number | null;
  priority: TaskPriority;
  status: TaskStatus;
  notes: string;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  complaint_subject?: string;
  complaint_description?: string;
  complaint_severity?: SeverityLevel;
  assigned_employee_name?: string;
  category_name?: string;
}

export interface DbStatusHistory {
  history_id: number;
  complaint_id: number;
  status: string;
  updated_by: number | null;
  updated_at: Date;
  remarks: string | null;
  updated_by_name?: string;
}

export interface DbContactUs {
  contact_id: number;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: "new" | "processed" | "responded";
  source_message_id: number | null;
  created_at: Date;
}

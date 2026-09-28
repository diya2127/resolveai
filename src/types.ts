export type UserRole = "employee" | "authority";

export interface User {
  name: string;
  email: string;
  role: UserRole;
  dept: string;
}

export type TaskPriority = "High" | "Medium" | "Low";
export type TaskStatus = "Pending" | "In Progress" | "Resolved";

export interface Task {
  id: string;
  title: string;
  desc: string;
  priority: TaskPriority;
  status: TaskStatus;
  notesOpen?: boolean;
  notes: string;
}

export interface Category {
  icon: string;
  name: string;
  total: number;
  repeated: number;
  sev: "crit" | "high" | "med" | "low";
  ai: string;
}

export interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: Date;
}

export interface Insight {
  type: "crit" | "amber" | "info";
  text: string;
  meta: string;
}

export interface MonthlyVolume {
  month: string;
  volume: number;
}

export interface DepartmentPerformance {
  name: string;
  pct: number;
}

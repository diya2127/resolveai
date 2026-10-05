import { query, isDbConnected } from "../config/db";

export interface AssignmentResult {
  employeeId: number | null;
  employeeName: string | null;
  departmentName: string | null;
}

// Maps complaint categories to appropriate handling departments
export const CATEGORY_DEPARTMENT_MAP: Record<string, string> = {
  "Payment": "Accounts & Billing",
  "Refund": "Finance / Refunds",
  "Delivery": "Logistics & Delivery",
  "Product Quality": "Customer Support",
  "Technical": "Technical / Platform",
  "Account": "Accounts & Billing",
  "Other": "Customer Support",
};

export async function assignEmployeeForComplaint(
  categoryName: string,
  severity: string
): Promise<AssignmentResult> {
  if (!isDbConnected()) {
    return {
      employeeId: null,
      employeeName: "Unassigned",
      departmentName: CATEGORY_DEPARTMENT_MAP[categoryName] || "Customer Support",
    };
  }

  try {
    const targetDeptName = CATEGORY_DEPARTMENT_MAP[categoryName] || "Customer Support";

    // 1. Try to find active employees in the matching department, ordered by least pending tasks
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
        departmentName: match.department_name,
      };
    }

    // 2. If no employee in target department, fallback to any active employee with lowest task count
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
        departmentName: fallback.department_name || targetDeptName,
      };
    }

    return {
      employeeId: null,
      employeeName: "Unassigned",
      departmentName: targetDeptName,
    };
  } catch (error) {
    console.warn("Task assignment service error:", error);
    return {
      employeeId: null,
      employeeName: "Unassigned",
      departmentName: "Customer Support",
    };
  }
}

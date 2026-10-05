import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query, isDbConnected } from "../config/db";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "resolveai_secret_key";

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    if (!isDbConnected()) {
      // In-memory fallback if database is offline
      const name = email.split("@")[0].replace(/[\._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
      const dept = role === "authority" ? "Executive Leadership Board" : "Finance Department";
      return res.json({
        user: { name, email, role: role || "employee", dept },
        token: "demo-offline-token",
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

    // Check password
    let passwordMatch = false;
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      // Direct comparison if plain text in dev seed
      passwordMatch = user.password === password;
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const payload = {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    const dept = user.department_name || (user.role === "authority" ? "Executive Leadership Board" : "General Support");

    return res.json({
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        dept,
      },
      token,
    });
  } catch (error: any) {
    console.error("Error in POST /api/auth/login:", error);
    return res.status(500).json({ error: "Authentication service error." });
  }
});

// POST /api/auth/signup
router.post("/signup", async (req: Request, res: Response) => {
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
        token: "demo-offline-token",
      });
    }

    // Check if email already registered
    const existing = await query(`SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Email address is already registered." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const insertUser = await query(
      `INSERT INTO users (name, email, password, role, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING user_id, name, email, role`,
      [name, email, hashedPassword, assignedRole]
    );

    const newUser = insertUser.rows[0];

    // If employee, link default department
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
        dept: deptName,
      },
      token,
    });
  } catch (error: any) {
    console.error("Error in POST /api/auth/signup:", error);
    return res.status(500).json({ error: "Registration service error." });
  }
});

// GET /api/auth/me
router.get("/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);

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
        dept: u.department_name || (u.role === "authority" ? "Executive Leadership Board" : "General Support"),
      },
    });
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
});

export default router;

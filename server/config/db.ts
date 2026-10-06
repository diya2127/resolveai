import pg from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Construct configuration from DATABASE_URL or discrete variables
let connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.includes("ResolveAI@6352024915")) {
  connectionString = connectionString.replace("ResolveAI@6352024915", "ResolveAI%406352024915");
}

const isRemote = Boolean(connectionString && !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1"));

export const pool = new Pool(
  connectionString
    ? { 
        connectionString,
        ssl: isRemote ? { rejectUnauthorized: false } : undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
    : {
        host: process.env.PGHOST || "localhost",
        port: parseInt(process.env.PGPORT || "5432", 10),
        user: process.env.PGUSER || "postgres",
        password: process.env.PGPASSWORD || "postgres",
        database: process.env.PGDATABASE || "resolveai",
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
);

let isConnected = false;

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development" && duration > 200) {
    console.log("[DB Slow Query]", { text: text.substring(0, 100), duration, rows: res.rowCount });
  }
  return res;
}

export function isDbConnected(): boolean {
  return isConnected;
}

export async function initDb(): Promise<boolean> {
  try {
    const client = await pool.connect();
    isConnected = true;
    console.log("PostgreSQL connected successfully.");

    // Check if tables already exist
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
  } catch (error: any) {
    isConnected = false;
    console.error("PostgreSQL Connection Warning:", error.message);
    console.error("Ensure PostgreSQL is running and credentials in .env are correct.");
    return false;
  }
}

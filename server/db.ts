import { PGlite } from "@electric-sql/pglite";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data", "postgres");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbInstance: PGlite | null = null;

export async function getDb(): Promise<PGlite> {
  if (!dbInstance) {
    dbInstance = new PGlite(dataDir);
    await initSchema(dbInstance);
  }
  return dbInstance;
}

export async function initSchema(db: PGlite) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS source (
      source_id VARCHAR PRIMARY KEY,
      source_name VARCHAR NOT NULL,
      source_type VARCHAR NOT NULL,
      connection_status VARCHAR NOT NULL,
      account_name VARCHAR NOT NULL,
      last_sync TIMESTAMP,
      status VARCHAR NOT NULL
    );

    CREATE TABLE IF NOT EXISTS source_message (
      message_id VARCHAR PRIMARY KEY,
      source_id VARCHAR REFERENCES source(source_id),
      external_message_id VARCHAR,
      sender_name VARCHAR,
      sender_email VARCHAR,
      sender_phone VARCHAR,
      subject VARCHAR,
      message_content TEXT NOT NULL,
      rating INT,
      product VARCHAR,
      received_at TIMESTAMP NOT NULL,
      attachment_url TEXT,
      raw_data JSONB,
      processing_status VARCHAR NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_analysis (
      analysis_id VARCHAR PRIMARY KEY,
      message_id VARCHAR REFERENCES source_message(message_id),
      sentiment VARCHAR NOT NULL,
      category VARCHAR NOT NULL,
      severity_level VARCHAR NOT NULL,
      repeated_issue BOOLEAN NOT NULL DEFAULT FALSE,
      summary TEXT NOT NULL,
      ai_recommendation TEXT NOT NULL,
      confidence REAL NOT NULL,
      analyzed_at TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS complaint (
      complaint_id VARCHAR PRIMARY KEY,
      message_id VARCHAR REFERENCES source_message(message_id),
      category_name VARCHAR NOT NULL,
      subject VARCHAR NOT NULL,
      description TEXT NOT NULL,
      severity VARCHAR NOT NULL,
      status VARCHAR NOT NULL,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employee (
      employee_id VARCHAR PRIMARY KEY,
      name VARCHAR NOT NULL,
      email VARCHAR UNIQUE NOT NULL,
      password_hash VARCHAR NOT NULL,
      role VARCHAR NOT NULL,
      dept VARCHAR NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS task (
      task_id VARCHAR PRIMARY KEY,
      complaint_id VARCHAR REFERENCES complaint(complaint_id),
      assigned_employee_id VARCHAR REFERENCES employee(employee_id),
      priority VARCHAR NOT NULL,
      status VARCHAR NOT NULL,
      due_date TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS status_history (
      history_id VARCHAR PRIMARY KEY,
      complaint_id VARCHAR REFERENCES complaint(complaint_id),
      task_id VARCHAR REFERENCES task(task_id),
      status VARCHAR NOT NULL,
      updated_by VARCHAR NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      remarks TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_complaint_status ON complaint(status);
    CREATE INDEX IF NOT EXISTS idx_complaint_severity ON complaint(severity);
    CREATE INDEX IF NOT EXISTS idx_task_assigned ON task(assigned_employee_id);
    CREATE INDEX IF NOT EXISTS idx_task_status ON task(status);
    CREATE INDEX IF NOT EXISTS idx_source_type ON source(source_type);
  `);
}

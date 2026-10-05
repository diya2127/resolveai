-- ====================================================================
-- ResolveAI Unified Multi-Source Complaint Intelligence Platform
-- PostgreSQL Database Schema Definition (DDL)
-- ====================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (Role-Based: Employee, Higher Authority)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('employee', 'authority')),
    phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. EMPLOYEES TABLE (Maps users to departments and roles)
CREATE TABLE IF NOT EXISTS employees (
    employee_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
    designation VARCHAR(255) NOT NULL DEFAULT 'Support Specialist',
    date_joined DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave'))
);

-- 4. SOURCES TABLE (Multi-source integration registry)
CREATE TABLE IF NOT EXISTS sources (
    source_id SERIAL PRIMARY KEY,
    source_name VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'Gmail', 'WhatsApp', 'E-Commerce', 'Website', 'Manual'
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('email', 'messaging', 'ecommerce', 'web', 'manual')),
    connection_status VARCHAR(50) NOT NULL DEFAULT 'connected' CHECK (connection_status IN ('connected', 'disconnected', 'pending_credentials')),
    account_name VARCHAR(255),
    last_sync TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

-- 5. SOURCE_MESSAGE TABLE (Common incoming ingestion entity)
CREATE TABLE IF NOT EXISTS source_messages (
    message_id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES sources(source_id) ON DELETE SET NULL,
    external_message_id VARCHAR(255),
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    sender_phone VARCHAR(50),
    subject VARCHAR(500),
    message_content TEXT NOT NULL,
    rating NUMERIC(3, 1),
    product VARCHAR(255),
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    attachment_url TEXT,
    raw_data JSONB,
    processing_status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (processing_status IN ('pending', 'analyzed', 'converted_to_complaint', 'ignored', 'failed'))
);

-- 6. AI_ANALYSIS TABLE (Structured analysis output from Gemini AI)
CREATE TABLE IF NOT EXISTS ai_analyses (
    analysis_id SERIAL PRIMARY KEY,
    message_id INTEGER UNIQUE NOT NULL REFERENCES source_messages(message_id) ON DELETE CASCADE,
    sentiment VARCHAR(50) NOT NULL CHECK (sentiment IN ('Positive', 'Neutral', 'Negative')),
    category VARCHAR(100) NOT NULL,
    severity_level VARCHAR(50) NOT NULL CHECK (severity_level IN ('Low', 'Medium', 'High', 'Critical')),
    repeated_issue BOOLEAN NOT NULL DEFAULT FALSE,
    summary TEXT NOT NULL,
    ai_recommendation TEXT NOT NULL,
    confidence NUMERIC(4, 2) DEFAULT 0.95,
    analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. CATEGORY TABLE (Operational taxonomy)
CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'Delivery', 'Refund', 'Payment', 'Product Quality', 'Technical', 'Account', 'Other'
    description TEXT,
    department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

-- 8. COMPLAINT TABLE (Processed actionable complaints)
CREATE TABLE IF NOT EXISTS complaints (
    complaint_id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES source_messages(message_id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
    subject VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved', 'Escalated', 'Closed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. TASK TABLE (Action items auto-assigned to Employees)
CREATE TABLE IF NOT EXISTS tasks (
    task_id SERIAL PRIMARY KEY,
    complaint_id INTEGER NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    assigned_employee_id INTEGER REFERENCES employees(employee_id) ON DELETE SET NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved', 'Escalated')),
    notes TEXT DEFAULT '',
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. ATTACHMENT TABLE
CREATE TABLE IF NOT EXISTS attachments (
    attachment_id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES source_messages(message_id) ON DELETE CASCADE,
    complaint_id INTEGER REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. STATUS_HISTORY TABLE (Audit trail for complaints and tasks)
CREATE TABLE IF NOT EXISTS status_history (
    history_id SERIAL PRIMARY KEY,
    complaint_id INTEGER NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    updated_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT
);

-- 12. CHATBOT_HISTORY TABLE (Persisted sessions for Copilot / Chatbot Hub)
CREATE TABLE IF NOT EXISTS chatbot_history (
    chat_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    session_id VARCHAR(100),
    sender VARCHAR(50) NOT NULL CHECK (sender IN ('user', 'bot')),
    message TEXT NOT NULL,
    context_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. CONTACT_US TABLE (Website inquiries connected to source_messages)
CREATE TABLE IF NOT EXISTS contact_us (
    contact_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'processed', 'responded')),
    source_message_id INTEGER REFERENCES source_messages(message_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- INDEXES FOR PERFORMANCE & FAST LOOKUPS
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_source_messages_source_id ON source_messages(source_id);
CREATE INDEX IF NOT EXISTS idx_source_messages_status ON source_messages(processing_status);
CREATE INDEX IF NOT EXISTS idx_source_messages_received ON source_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_category ON ai_analyses(category);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_severity ON ai_analyses(severity_level);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_repeated ON ai_analyses(repeated_issue);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_severity ON complaints(severity);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category_id);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_employee ON tasks(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_status_history_complaint ON status_history(complaint_id);

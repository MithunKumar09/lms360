-- ============================================================================
-- Migration: 002_create_audit_logs.sql
-- Description: Create auth_audit_logs table to track user login/logout events
-- Created: 2025-01-XX
-- Note: Using auth_audit_logs to avoid conflict with audit_logs from migration 007
-- ============================================================================

-- Audit event type enum
DO $$ BEGIN
    CREATE TYPE audit_event_type AS ENUM ('login', 'logout', 'session_expired', 'password_reset', 'account_locked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create auth_audit_logs table (renamed to avoid conflict with audit_logs from migration 007)
CREATE TABLE IF NOT EXISTS auth_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    event_type audit_event_type NOT NULL,
    event_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    session_id UUID NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT auth_audit_logs_event_time_check CHECK (event_time <= CURRENT_TIMESTAMP + INTERVAL '1 minute')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_id ON auth_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_email ON auth_audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_type ON auth_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_time ON auth_audit_logs(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_org_id ON auth_audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_role ON auth_audit_logs(user_role);

-- Composite index for common queries (user_id + event_time)
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_event_time ON auth_audit_logs(user_id, event_time DESC);

-- Composite index for organization-based queries
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_org_event_time ON auth_audit_logs(org_id, event_time DESC) WHERE org_id IS NOT NULL;

-- Index for session tracking
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_session_id ON auth_audit_logs(session_id) WHERE session_id IS NOT NULL;

-- Comments
COMMENT ON TABLE auth_audit_logs IS 'Stores audit trail of user authentication events (login, logout, etc.)';
COMMENT ON COLUMN auth_audit_logs.user_id IS 'Reference to the user who performed the action';
COMMENT ON COLUMN auth_audit_logs.user_email IS 'Email of the user at the time of the event (denormalized for historical accuracy)';
COMMENT ON COLUMN auth_audit_logs.user_role IS 'Role of the user at the time of the event (denormalized for historical accuracy)';
COMMENT ON COLUMN auth_audit_logs.org_id IS 'Organization ID (null for superadmin or global users)';
COMMENT ON COLUMN auth_audit_logs.event_type IS 'Type of audit event (login, logout, etc.)';
COMMENT ON COLUMN auth_audit_logs.event_time IS 'Timestamp when the event occurred';
COMMENT ON COLUMN auth_audit_logs.ip_address IS 'IP address from which the event originated';
COMMENT ON COLUMN auth_audit_logs.user_agent IS 'User agent string from the browser/client';
COMMENT ON COLUMN auth_audit_logs.session_id IS 'Session ID associated with the event';
COMMENT ON COLUMN auth_audit_logs.metadata IS 'Additional metadata as JSON (e.g., MFA method, device info)';


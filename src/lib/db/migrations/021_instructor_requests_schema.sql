-- ============================================================================
-- Migration: 021_instructor_requests_schema.sql
-- Description: Instructor Requests, Notifications, and Role Promotion History Schema
-- Created: 2025-01-XX
-- Dependencies: 001_initial_schema.sql, 002_organizations_schema.sql, 004_users_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - instructor_requests: Users requesting promotion to instructor role
-- - notifications: System notifications for users
-- - role_promotion_history: Complete audit trail of role promotions
--
-- Supports the "Become an Instructor" feature with request/accept/reject flow
-- ============================================================================

-- ============================================================================
-- ENUMS (if needed - using VARCHAR with CHECK constraints for flexibility)
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. instructor_requests table
CREATE TABLE IF NOT EXISTS instructor_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    cohorts JSONB NOT NULL, -- Array of cohort IDs with program node info: [{"id": "uuid", "name": "string", "program_node": {...}}]
    subjects JSONB NOT NULL, -- Array of subject IDs: [{"id": "uuid", "name": "string"}]
    phone_number VARCHAR(20) NULL,
    bio TEXT NULL,
    mfa_method VARCHAR(20) NULL CHECK (mfa_method IN ('totp', 'email_otp', 'none')), -- Set by admin on accept
    reviewed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL, -- Admin who reviewed
    reviewed_at TIMESTAMP WITH TIME ZONE NULL,
    rejection_reason TEXT NULL, -- If rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT instructor_requests_phone_format CHECK (
        phone_number IS NULL OR 
        phone_number ~* '^\+?[1-9]\d{1,14}$'
    ),
    CONSTRAINT instructor_requests_cohorts_not_empty CHECK (
        jsonb_array_length(cohorts) > 0
    ),
    CONSTRAINT instructor_requests_subjects_not_empty CHECK (
        jsonb_array_length(subjects) > 0
    )
);

-- Create unique partial index to ensure only one pending request per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_instructor_requests_one_pending_per_user 
ON instructor_requests(user_id, status) 
WHERE status = 'pending';

-- Indexes for instructor_requests
CREATE INDEX IF NOT EXISTS idx_instructor_requests_user_id ON instructor_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_instructor_requests_org_id ON instructor_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_instructor_requests_status ON instructor_requests(status);
CREATE INDEX IF NOT EXISTS idx_instructor_requests_created_at ON instructor_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instructor_requests_reviewed_by ON instructor_requests(reviewed_by) WHERE reviewed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_instructor_requests_org_status ON instructor_requests(org_id, status);

-- 2. notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'instructor_request', 'request_accepted', 'request_rejected', 'general'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB NULL DEFAULT '{}'::jsonb, -- Additional data (request_id, etc.)
    read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE NULL,
    action_url VARCHAR(500) NULL, -- URL for "View Request" button
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT notifications_type_check CHECK (
        type IN ('instructor_request', 'request_accepted', 'request_rejected', 'general')
    ),
    CONSTRAINT notifications_title_length CHECK (
        char_length(title) >= 1 AND char_length(title) <= 255
    ),
    CONSTRAINT notifications_message_length CHECK (
        char_length(message) >= 1
    ),
    CONSTRAINT notifications_action_url_format CHECK (
        action_url IS NULL OR 
        action_url ~* '^(\/|https?:\/\/)[^\s]*$'
    )
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, read, created_at DESC);
-- Partial index for unread notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC) 
WHERE read = false;

-- 3. role_promotion_history table
CREATE TABLE IF NOT EXISTS role_promotion_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_role VARCHAR(50) NOT NULL,
    to_role VARCHAR(50) NOT NULL DEFAULT 'instructor',
    promotion_type VARCHAR(50) NOT NULL DEFAULT 'instructor_request', -- 'instructor_request', 'admin_promotion', etc.
    request_id UUID NULL REFERENCES instructor_requests(id) ON DELETE SET NULL,
    promoted_by UUID NULL REFERENCES users(id) ON DELETE SET NULL, -- Admin who approved
    user_data_backup JSONB NOT NULL, -- Complete user data snapshot before promotion
    mfa_method VARCHAR(20) NULL CHECK (mfa_method IN ('totp', 'email_otp', 'none')),
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT role_promotion_history_roles_check CHECK (
        to_role = 'instructor'
    ),
    CONSTRAINT role_promotion_history_from_role_check CHECK (
        from_role IN ('student', 'alumni', 'parent', 'vendor', 'admin', 'orgparent', 'orginstructor')
    ),
    CONSTRAINT role_promotion_history_promotion_type_check CHECK (
        promotion_type IN ('instructor_request', 'admin_promotion', 'system_promotion')
    ),
    CONSTRAINT role_promotion_history_user_data_backup_not_empty CHECK (
        jsonb_typeof(user_data_backup) = 'object'
    )
);

-- Indexes for role_promotion_history
CREATE INDEX IF NOT EXISTS idx_role_promotion_history_user_id ON role_promotion_history(user_id);
CREATE INDEX IF NOT EXISTS idx_role_promotion_history_request_id ON role_promotion_history(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_role_promotion_history_created_at ON role_promotion_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_role_promotion_history_promoted_by ON role_promotion_history(promoted_by) WHERE promoted_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_role_promotion_history_promotion_type ON role_promotion_history(promotion_type);
CREATE INDEX IF NOT EXISTS idx_role_promotion_history_user_created ON role_promotion_history(user_id, created_at DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMP
-- ============================================================================

-- Ensure update_updated_at_column function exists (reuse from previous migrations)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $fn$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Triggers for updated_at timestamp
DROP TRIGGER IF EXISTS trigger_update_instructor_requests_updated_at ON instructor_requests;
CREATE TRIGGER trigger_update_instructor_requests_updated_at
    BEFORE UPDATE ON instructor_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Note: notifications and role_promotion_history don't have updated_at columns
-- as they are append-only tables (notifications are marked as read, not updated)

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE instructor_requests IS 'Stores instructor promotion requests from users. Each user can have only one pending request at a time.';
COMMENT ON COLUMN instructor_requests.cohorts IS 'JSONB array of cohort objects with id, name, and program_node information';
COMMENT ON COLUMN instructor_requests.subjects IS 'JSONB array of subject objects with id and name';
COMMENT ON COLUMN instructor_requests.mfa_method IS 'MFA method selected by admin when accepting the request (totp, email_otp, or none)';
COMMENT ON COLUMN instructor_requests.reviewed_by IS 'UUID of the admin user who reviewed (accepted/rejected) this request';

COMMENT ON TABLE notifications IS 'System notifications for users. Supports various notification types with action URLs.';
COMMENT ON COLUMN notifications.type IS 'Type of notification: instructor_request, request_accepted, request_rejected, or general';
COMMENT ON COLUMN notifications.data IS 'Additional JSONB data for the notification (e.g., request_id, user_id)';
COMMENT ON COLUMN notifications.action_url IS 'Optional URL for action button (e.g., /dashboards/admin-instructor-requests?id=xxx)';
COMMENT ON COLUMN notifications.read_at IS 'Timestamp when notification was marked as read';

COMMENT ON TABLE role_promotion_history IS 'Complete audit trail of role promotions, including full user data backup before promotion.';
COMMENT ON COLUMN role_promotion_history.user_data_backup IS 'Complete JSONB snapshot of user data before promotion (profile, settings, enrollments, etc.)';
COMMENT ON COLUMN role_promotion_history.promotion_type IS 'Type of promotion: instructor_request (from request), admin_promotion (direct admin action), system_promotion (automated)';
COMMENT ON COLUMN role_promotion_history.mfa_method IS 'MFA method set for the user during promotion (totp, email_otp, or none)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


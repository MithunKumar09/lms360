-- ============================================================================
-- Migration: 007_user_management_schema.sql
-- Description: User Management & Invitation System Schema Enhancements
-- Created: 2025-01-XX
-- Dependencies: 001_initial_schema.sql, 002_organizations_schema.sql, 003_classes_subjects_schema.sql, 004_users_schema.sql
-- ============================================================================
-- 
-- This migration adds:
-- - Password reset token columns to user_auth
-- - audit_logs table for user management audit trail
-- - student_links, instructor_links, parent_links tables (referenced but missing)
-- - instructor_classes table (for instructor-class-subject assignments)
-- - user_class_subject_links table (for student/instructor class-subject links)
-- - parent_student_links table (for parent-student relationships)
--
-- All tables use UUID primary keys, TIMESTAMPTZ for timestamps, and include
-- comprehensive indexes, constraints, and triggers for data integrity.
-- ============================================================================

-- ============================================================================
-- ENUMS (if needed)
-- ============================================================================

-- ============================================================================
-- ALTER EXISTING TABLES
-- ============================================================================

-- Add password reset token columns to user_auth table
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='user_auth' AND column_name='password_reset_token'
    ) THEN
        ALTER TABLE user_auth ADD COLUMN password_reset_token VARCHAR(255) NULL;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='user_auth' AND column_name='password_reset_expires'
    ) THEN
        ALTER TABLE user_auth ADD COLUMN password_reset_expires TIMESTAMPTZ NULL;
    END IF;
END $$;

-- Add indexes for password reset token lookups
CREATE INDEX IF NOT EXISTS idx_user_auth_password_reset_token ON user_auth(password_reset_token) WHERE password_reset_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_auth_password_reset_expires ON user_auth(password_reset_expires) WHERE password_reset_expires IS NOT NULL;

-- ============================================================================
-- NEW TABLES
-- ============================================================================

-- audit_logs table (for user management audit trail)
-- Note: audit_events exists in schema.sql, but we need audit_logs for user-specific operations
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    target_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NULL,
    old_values JSONB NULL,
    new_values JSONB NULL,
    metadata JSONB NULL DEFAULT '{}'::jsonb,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_logs_action_format CHECK (action ~* '^[a-z_]+$'),
    CONSTRAINT audit_logs_resource_type_format CHECK (resource_type ~* '^[a-z_]+$')
);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user_id ON audit_logs(target_user_id) WHERE target_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs(actor_id, created_at) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_created ON audit_logs(target_user_id, created_at) WHERE target_user_id IS NOT NULL;

-- student_links table (links students to cohorts/sections)
CREATE TABLE IF NOT EXISTS student_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    section_id UUID NULL REFERENCES sections(id) ON DELETE SET NULL,
    roll_no VARCHAR(50) NULL,
    program_node_id UUID NULL REFERENCES program_nodes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT student_links_user_cohort_unique UNIQUE (user_id, cohort_id)
);

-- Indexes for student_links
CREATE INDEX IF NOT EXISTS idx_student_links_user_id ON student_links(user_id);
CREATE INDEX IF NOT EXISTS idx_student_links_org_id ON student_links(org_id);
CREATE INDEX IF NOT EXISTS idx_student_links_cohort_id ON student_links(cohort_id);
CREATE INDEX IF NOT EXISTS idx_student_links_section_id ON student_links(section_id) WHERE section_id IS NOT NULL;

-- instructor_links table (links instructors to organizations)
CREATE TABLE IF NOT EXISTS instructor_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT instructor_links_user_org_unique UNIQUE (user_id, org_id)
);

-- Indexes for instructor_links
CREATE INDEX IF NOT EXISTS idx_instructor_links_user_id ON instructor_links(user_id);
CREATE INDEX IF NOT EXISTS idx_instructor_links_org_id ON instructor_links(org_id);

-- instructor_classes table (links instructors to cohorts and subject offerings)
CREATE TABLE IF NOT EXISTS instructor_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instructor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    subject_offering_id UUID NULL REFERENCES subject_offerings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT instructor_classes_unique UNIQUE (instructor_user_id, cohort_id, subject_offering_id)
);

-- Indexes for instructor_classes
CREATE INDEX IF NOT EXISTS idx_instructor_classes_instructor ON instructor_classes(instructor_user_id);
CREATE INDEX IF NOT EXISTS idx_instructor_classes_cohort ON instructor_classes(cohort_id);
CREATE INDEX IF NOT EXISTS idx_instructor_classes_subject_offering ON instructor_classes(subject_offering_id) WHERE subject_offering_id IS NOT NULL;

-- parent_links table (links parents to students)
CREATE TABLE IF NOT EXISTS parent_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT parent_links_parent_student_unique UNIQUE (parent_user_id, student_user_id),
    CONSTRAINT parent_links_no_self_link CHECK (parent_user_id != student_user_id)
);

-- Indexes for parent_links
CREATE INDEX IF NOT EXISTS idx_parent_links_parent ON parent_links(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_student ON parent_links(student_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_org_id ON parent_links(org_id);

-- user_class_subject_links table (for flexible class-subject assignments)
-- This table allows linking users (students/instructors) to specific class-subject combinations
CREATE TABLE IF NOT EXISTS user_class_subject_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    subject_offering_id UUID NOT NULL REFERENCES subject_offerings(id) ON DELETE CASCADE,
    link_type VARCHAR(20) NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_class_subject_links_type_check CHECK (link_type IN ('student', 'instructor', 'alumni')),
    CONSTRAINT user_class_subject_links_unique UNIQUE (user_id, cohort_id, subject_offering_id)
);

-- Indexes for user_class_subject_links
CREATE INDEX IF NOT EXISTS idx_user_class_subject_links_user_id ON user_class_subject_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_class_subject_links_org_id ON user_class_subject_links(org_id);
CREATE INDEX IF NOT EXISTS idx_user_class_subject_links_cohort_id ON user_class_subject_links(cohort_id);
CREATE INDEX IF NOT EXISTS idx_user_class_subject_links_subject_offering_id ON user_class_subject_links(subject_offering_id);
CREATE INDEX IF NOT EXISTS idx_user_class_subject_links_link_type ON user_class_subject_links(link_type);

-- parent_student_links table (alternative/complementary to parent_links)
-- This table provides additional metadata for parent-student relationships
CREATE TABLE IF NOT EXISTS parent_student_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NULL DEFAULT 'parent',
    is_primary_contact BOOLEAN NOT NULL DEFAULT false,
    can_view_grades BOOLEAN NOT NULL DEFAULT true,
    can_view_attendance BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT parent_student_links_parent_student_unique UNIQUE (parent_user_id, student_user_id),
    CONSTRAINT parent_student_links_no_self_link CHECK (parent_user_id != student_user_id)
);

-- Indexes for parent_student_links
CREATE INDEX IF NOT EXISTS idx_parent_student_links_parent ON parent_student_links(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_student ON parent_student_links(student_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_org_id ON parent_student_links(org_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_primary_contact ON parent_student_links(parent_user_id, is_primary_contact) WHERE is_primary_contact = true;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Ensure update_updated_at_column function exists
DO $$ BEGIN
    PERFORM 1 FROM pg_proc WHERE proname = 'update_updated_at_column';
    IF NOT FOUND THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $fn$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Attach triggers for updated_at
DROP TRIGGER IF EXISTS update_student_links_updated_at ON student_links;
CREATE TRIGGER update_student_links_updated_at
    BEFORE UPDATE ON student_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_instructor_links_updated_at ON instructor_links;
CREATE TRIGGER update_instructor_links_updated_at
    BEFORE UPDATE ON instructor_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_instructor_classes_updated_at ON instructor_classes;
CREATE TRIGGER update_instructor_classes_updated_at
    BEFORE UPDATE ON instructor_classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_parent_links_updated_at ON parent_links;
CREATE TRIGGER update_parent_links_updated_at
    BEFORE UPDATE ON parent_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_class_subject_links_updated_at ON user_class_subject_links;
CREATE TRIGGER update_user_class_subject_links_updated_at
    BEFORE UPDATE ON user_class_subject_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_parent_student_links_updated_at ON parent_student_links;
CREATE TRIGGER update_parent_student_links_updated_at
    BEFORE UPDATE ON parent_student_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Audit log for user management operations (user creation, updates, role changes, etc.)';
COMMENT ON TABLE student_links IS 'Links students to cohorts, sections, and program nodes';
COMMENT ON TABLE instructor_links IS 'Links instructors to organizations';
COMMENT ON TABLE instructor_classes IS 'Links instructors to cohorts and subject offerings';
COMMENT ON TABLE parent_links IS 'Basic parent-student relationship links';
COMMENT ON TABLE user_class_subject_links IS 'Flexible class-subject assignments for students, instructors, and alumni';
COMMENT ON TABLE parent_student_links IS 'Enhanced parent-student relationships with permissions and metadata';

COMMENT ON COLUMN audit_logs.actor_id IS 'User ID who performed the action (NULL for system actions)';
COMMENT ON COLUMN audit_logs.target_user_id IS 'User ID who was the target of the action (if applicable)';
COMMENT ON COLUMN audit_logs.action IS 'Action performed: create_user, update_user, delete_user, assign_role, remove_role, suspend_user, activate_user, etc.';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource: user, role, invitation, etc.';
COMMENT ON COLUMN audit_logs.old_values IS 'JSON object with old values before the change';
COMMENT ON COLUMN audit_logs.new_values IS 'JSON object with new values after the change';

COMMENT ON COLUMN user_auth.password_reset_token IS 'Token for password reset (hashed)';
COMMENT ON COLUMN user_auth.password_reset_expires IS 'Expiration timestamp for password reset token (24 hours)';

COMMENT ON COLUMN parent_student_links.relationship_type IS 'Type of relationship: parent, guardian, etc.';
COMMENT ON COLUMN parent_student_links.is_primary_contact IS 'Whether this parent is the primary contact for the student';
COMMENT ON COLUMN parent_student_links.can_view_grades IS 'Whether parent can view student grades';
COMMENT ON COLUMN parent_student_links.can_view_attendance IS 'Whether parent can view student attendance';


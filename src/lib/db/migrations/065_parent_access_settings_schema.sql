-- ============================================================================
-- Migration: 065_parent_access_settings_schema.sql
-- Description: Create parent_access_settings table for college admin controlled
--              parent feature access and enhance parent_student_links with
--              additional permission fields
-- Created: 2025-01-XX
-- Dependencies: 007_user_management_schema.sql (parent_student_links table)
-- ============================================================================
-- 
-- This migration creates the parent_access_settings table which allows
-- college admins to control parent dashboard features at multiple levels:
-- - Organization-wide defaults (org_id set, parent_user_id and student_user_id NULL)
-- - Per-parent defaults (org_id and parent_user_id set, student_user_id NULL)
-- - Per-student overrides (all three IDs set)
--
-- Priority resolution order (highest to lowest):
-- 1. Per-student override (parent_user_id + student_user_id)
-- 2. Per-parent default (parent_user_id only)
-- 3. Organization-wide default (org_id only)
--
-- The parent_student_links table is also enhanced with additional permission
-- fields to align with the new access control requirements.
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Parent Access Control Settings Table
-- Allows college admins to enable/disable parent dashboard features
CREATE TABLE IF NOT EXISTS parent_access_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE, -- NULL = org-wide default
    student_user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE, -- NULL = all students or parent default
    can_view_progress BOOLEAN NOT NULL DEFAULT true,
    can_view_attendance BOOLEAN NOT NULL DEFAULT true,
    can_view_achievements BOOLEAN NOT NULL DEFAULT true,
    can_view_certificates BOOLEAN NOT NULL DEFAULT true,
    can_view_activity_log BOOLEAN NOT NULL DEFAULT true,
    can_view_engagement_stats BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Admin who created/updated
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT parent_access_settings_unique_scope UNIQUE (org_id, parent_user_id, student_user_id),
    CONSTRAINT parent_access_settings_scope_logic_check CHECK (
        -- org_id is always required
        org_id IS NOT NULL
        -- Note: Role validation (parent/student) should be done at application level
        -- to avoid complex cross-table constraints that could cause performance issues
    )
);

-- ============================================================================
-- ENHANCE EXISTING TABLE: parent_student_links
-- ============================================================================

-- Add additional permission fields to parent_student_links to align with
-- parent_access_settings capabilities
ALTER TABLE parent_student_links
    ADD COLUMN IF NOT EXISTS can_view_progress BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS can_view_achievements BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS can_view_certificates BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS can_view_activity_log BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS can_view_engagement_stats BOOLEAN NOT NULL DEFAULT true;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for parent_access_settings
CREATE INDEX IF NOT EXISTS idx_parent_access_settings_org_id ON parent_access_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_parent_access_settings_parent_user_id ON parent_access_settings(parent_user_id) WHERE parent_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parent_access_settings_student_user_id ON parent_access_settings(student_user_id) WHERE student_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parent_access_settings_created_by ON parent_access_settings(created_by);

-- Composite indexes for common queries
-- Query: Get org-wide defaults
CREATE INDEX IF NOT EXISTS idx_parent_access_settings_org_default ON parent_access_settings(org_id) WHERE parent_user_id IS NULL AND student_user_id IS NULL;

-- Query: Get parent-specific defaults
CREATE INDEX IF NOT EXISTS idx_parent_access_settings_parent_default ON parent_access_settings(org_id, parent_user_id) WHERE parent_user_id IS NOT NULL AND student_user_id IS NULL;

-- Query: Get student-specific overrides
CREATE INDEX IF NOT EXISTS idx_parent_access_settings_student_override ON parent_access_settings(org_id, parent_user_id, student_user_id) WHERE parent_user_id IS NOT NULL AND student_user_id IS NOT NULL;

-- Indexes for enhanced parent_student_links permission fields
CREATE INDEX IF NOT EXISTS idx_parent_student_links_can_view_progress ON parent_student_links(can_view_progress) WHERE can_view_progress = true;
CREATE INDEX IF NOT EXISTS idx_parent_student_links_can_view_attendance ON parent_student_links(can_view_attendance) WHERE can_view_attendance = true;
CREATE INDEX IF NOT EXISTS idx_parent_student_links_can_view_achievements ON parent_student_links(can_view_achievements) WHERE can_view_achievements = true;

-- ============================================================================
-- TRIGGERS
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

-- Trigger for parent_access_settings updated_at
DROP TRIGGER IF EXISTS update_parent_access_settings_updated_at ON parent_access_settings;
CREATE TRIGGER update_parent_access_settings_updated_at
    BEFORE UPDATE ON parent_access_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE parent_access_settings IS 'College admin controlled parent dashboard feature access settings at org, parent, or student level';
COMMENT ON COLUMN parent_access_settings.org_id IS 'Organization ID - required for all settings';
COMMENT ON COLUMN parent_access_settings.parent_user_id IS 'Parent user ID - NULL for org-wide defaults, set for parent-specific or student-specific settings';
COMMENT ON COLUMN parent_access_settings.student_user_id IS 'Student user ID - NULL for org-wide or parent defaults, set for student-specific overrides';
COMMENT ON COLUMN parent_access_settings.can_view_progress IS 'Allow parent to view student progress overview (course enrollment, completion %, milestones)';
COMMENT ON COLUMN parent_access_settings.can_view_attendance IS 'Allow parent to view student attendance summary';
COMMENT ON COLUMN parent_access_settings.can_view_achievements IS 'Allow parent to view student achievements, badges, and rewards';
COMMENT ON COLUMN parent_access_settings.can_view_certificates IS 'Allow parent to view student certificate gallery';
COMMENT ON COLUMN parent_access_settings.can_view_activity_log IS 'Allow parent to view daily activity log';
COMMENT ON COLUMN parent_access_settings.can_view_engagement_stats IS 'Allow parent to view engagement statistics (streaks, time spent, active days)';
COMMENT ON COLUMN parent_access_settings.created_by IS 'Admin user ID who created/updated this setting';

COMMENT ON COLUMN parent_student_links.can_view_progress IS 'Allow this parent to view this student''s progress (overrides org/parent defaults)';
COMMENT ON COLUMN parent_student_links.can_view_achievements IS 'Allow this parent to view this student''s achievements (overrides org/parent defaults)';
COMMENT ON COLUMN parent_student_links.can_view_certificates IS 'Allow this parent to view this student''s certificates (overrides org/parent defaults)';
COMMENT ON COLUMN parent_student_links.can_view_activity_log IS 'Allow this parent to view this student''s activity log (overrides org/parent defaults)';
COMMENT ON COLUMN parent_student_links.can_view_engagement_stats IS 'Allow this parent to view this student''s engagement stats (overrides org/parent defaults)';

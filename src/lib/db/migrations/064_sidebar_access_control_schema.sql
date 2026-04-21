-- ============================================================================
-- Migration: 064_sidebar_access_control_schema.sql
-- Description: Sidebar access control schema for enabling/disabling sidebars
--              at global, role, organization, or user level
-- Created: 2025-01-XX
-- Dependencies: 001_initial_schema.sql (for UUID extension and users table)
-- ============================================================================
-- 
-- This migration creates the sidebar_access_control table which allows
-- superadmin to control sidebar visibility at multiple granularity levels:
-- - Global: Apply to all users
-- - Role: Apply to all users with a specific role
-- - Organization: Apply to all users in a specific organization
-- - User: Apply to a specific user (highest priority)
--
-- Priority resolution order (highest to lowest):
-- 1. User-specific override
-- 2. Organization-specific
-- 3. Role-specific
-- 4. Global (lowest priority)
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Sidebar Access Control Settings
CREATE TABLE IF NOT EXISTS sidebar_access_control (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope_type VARCHAR(20) NOT NULL, -- 'global', 'role', 'organization', 'user'
    scope_value VARCHAR(255) NULL, -- role name, org_id, or user_id (NULL for global)
    sidebar_name VARCHAR(100) NOT NULL, -- 'superadmin', 'admin', 'instructor', 'vendor', 'mentor', 'student'
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sidebar_access_control_scope_check CHECK (
        scope_type IN ('global', 'role', 'organization', 'user')
    ),
    CONSTRAINT sidebar_access_control_scope_value_check CHECK (
        (scope_type = 'global' AND scope_value IS NULL) OR
        (scope_type IN ('role', 'organization', 'user') AND scope_value IS NOT NULL)
    ),
    CONSTRAINT sidebar_access_control_unique_scope_sidebar UNIQUE(scope_type, scope_value, sidebar_name)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sidebar_access_control_scope_type ON sidebar_access_control(scope_type);
CREATE INDEX IF NOT EXISTS idx_sidebar_access_control_scope_value ON sidebar_access_control(scope_value);
CREATE INDEX IF NOT EXISTS idx_sidebar_access_control_sidebar_name ON sidebar_access_control(sidebar_name);
CREATE INDEX IF NOT EXISTS idx_sidebar_access_control_enabled ON sidebar_access_control(is_enabled);
CREATE INDEX IF NOT EXISTS idx_sidebar_access_control_created_by ON sidebar_access_control(created_by);

-- Composite index for common queries (checking access for user)
CREATE INDEX IF NOT EXISTS idx_sidebar_access_control_scope_sidebar ON sidebar_access_control(scope_type, sidebar_name, is_enabled);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Ensure update_updated_at_column function exists (reuse from previous migrations)
DO $func$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $trigger$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $trigger$ LANGUAGE plpgsql;
    END IF;
END $func$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_sidebar_access_control_updated_at ON sidebar_access_control;
CREATE TRIGGER update_sidebar_access_control_updated_at
    BEFORE UPDATE ON sidebar_access_control
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE sidebar_access_control IS 'Controls sidebar visibility at global, role, organization, or user level';
COMMENT ON COLUMN sidebar_access_control.scope_type IS 'Scope type: global, role, organization, or user';
COMMENT ON COLUMN sidebar_access_control.scope_value IS 'Scope value: role name (for role), org_id UUID (for organization), user_id UUID (for user), or NULL (for global)';
COMMENT ON COLUMN sidebar_access_control.sidebar_name IS 'Sidebar name: superadmin, admin, instructor, vendor, mentor, or student';
COMMENT ON COLUMN sidebar_access_control.is_enabled IS 'Whether the sidebar is enabled (true) or disabled (false) for this scope';
COMMENT ON COLUMN sidebar_access_control.created_by IS 'User ID who created/updated this setting (must be superadmin)';

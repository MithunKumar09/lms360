-- ============================================================================
-- Migration: 070_add_company_role.sql
-- Description: Add company role to role_code_enum and roles table
-- Created: 2025-01-XX
-- Dependencies: 004_users_schema.sql
-- ============================================================================
-- 
-- This migration adds support for the 'company' role:
-- - Adds 'company' to role_code_enum (requires script or manual addition)
-- - Inserts company role into roles table
-- 
-- NOTE: ALTER TYPE ... ADD VALUE cannot be run inside a transaction.
-- If 'company' enum value doesn't exist, you need to add it manually:
--   ALTER TYPE role_code_enum ADD VALUE 'company';
-- Or run: node src/lib/db/migrations/add-company-enum.js
-- ============================================================================

-- ============================================================================
-- EXTEND EXISTING ENUMS
-- ============================================================================

-- Note: Adding enum value must be done outside transaction
-- The enum value should be added manually or via script before running this migration
-- The migration will fail with a clear error if the enum value doesn't exist

-- ============================================================================
-- ROLES TABLE INSERT
-- ============================================================================

-- Ensure 'company' role exists in roles table
INSERT INTO roles (id, code, title, created_at, updated_at)
VALUES 
    (uuid_generate_v4(), 'company'::role_code_enum, 'Company', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TYPE role_code_enum IS 'User role codes including: superadmin, admin, instructor, student, vendor, parent, mentor, brand, company';
COMMENT ON TABLE roles IS 'System roles table. Company role is organization-scoped (like vendor), unlike brand which is global.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

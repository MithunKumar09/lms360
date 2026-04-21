-- ============================================================================
-- Migration: 012_add_org_roles.sql
-- Description: Seeds organization-specific roles into the roles table
-- Created: 2025-01-XX
-- Dependencies: 004_users_schema.sql
-- 
-- IMPORTANT: Before running this migration, you must add the enum values first:
--   Run: node src/lib/db/migrations/add-org-roles-enum.js
--   OR manually execute:
--     ALTER TYPE role_code_enum ADD VALUE 'orginstructor';
--     ALTER TYPE role_code_enum ADD VALUE 'orgalumni';
--     ALTER TYPE role_code_enum ADD VALUE 'orgparent';
--     ALTER TYPE role_code_enum ADD VALUE 'orgvendor';
-- 
-- This is because ALTER TYPE ... ADD VALUE cannot be run inside a transaction,
-- but this migration (INSERT statements) can be run in a transaction.
-- ============================================================================

-- Seed the new org-prefixed roles into the roles table
INSERT INTO roles (id, code, title, created_at, updated_at)
VALUES 
    (uuid_generate_v4(), 'orginstructor'::role_code_enum, 'Organization Instructor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'orgalumni'::role_code_enum, 'Organization Alumni', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'orgparent'::role_code_enum, 'Organization Parent/Guardian', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'orgvendor'::role_code_enum, 'Organization Vendor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET 
    title = EXCLUDED.title, 
    updated_at = CURRENT_TIMESTAMP;

-- Also ensure standard roles exist (in case they weren't seeded)
INSERT INTO roles (id, code, title, created_at, updated_at)
VALUES 
    (uuid_generate_v4(), 'instructor'::role_code_enum, 'Instructor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'alumni'::role_code_enum, 'Alumni', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'parent'::role_code_enum, 'Parent/Guardian', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'vendor'::role_code_enum, 'Vendor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET 
    title = EXCLUDED.title, 
    updated_at = CURRENT_TIMESTAMP;



-- Migration: 078_add_org_id_to_auth_tables.sql
-- Phase E — Add org_id to authentication tables
-- ADDITIVE ONLY: nullable columns + partial indexes. No NOT NULL yet.
-- Backfill is handled separately in 083_backfill_org_id_all_tables.sql

DO $$ BEGIN
    ALTER TABLE user_auth ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE user_metadata ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE login_audit ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE user_sessions ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ROLLBACK:
-- ALTER TABLE user_auth DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE user_metadata DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE login_audit DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE user_sessions DROP COLUMN IF EXISTS org_id;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_user_auth_org_id;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_user_metadata_org_id;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_login_audit_org_id;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_user_sessions_org_id;

-- Migration: 084_fix_course_slug_uniqueness.sql
-- Phase F — Replace global unique slug constraint with per-org unique slug
-- This unblocks two orgs from having the same course slug (e.g., "intro-to-python").
-- PREREQUISITE: Migration 083 (backfill) must be applied first.
--
-- ROLLBACK:
--   BEGIN;
--   ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_slug_org_unique;
--   DROP INDEX IF EXISTS idx_courses_slug_global_null_org;
--   ALTER TABLE courses ADD CONSTRAINT courses_slug_key UNIQUE (slug);
--   COMMIT;

BEGIN;

-- Step 1: Drop the old global unique constraint on slug (if it exists).
-- It may be named 'courses_slug_key' (default PostgreSQL name for UNIQUE(slug))
-- or a custom name. We handle both.
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_slug_key;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_slug_unique;

-- Step 2: Add per-org unique constraint: same slug allowed across different orgs,
-- but disallowed within the same org.
-- NULL org_id (global/platform courses) is excluded from this constraint
-- because UNIQUE constraints treat NULLs as distinct — two rows with org_id=NULL
-- and the same slug would still pass. We handle the global case via a partial index below.
ALTER TABLE courses
    ADD CONSTRAINT courses_slug_org_unique UNIQUE (org_id, slug);

-- Step 3: Enforce uniqueness for platform-level courses (org_id IS NULL).
-- These are global template courses owned by the platform (superadmin).
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_slug_global_null_org
    ON courses(slug)
    WHERE org_id IS NULL;

COMMIT;

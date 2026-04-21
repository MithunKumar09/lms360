-- Migration: 082_add_org_id_to_content_tables.sql
-- Phase E — Add org_id to community/content/audit tables
-- ADDITIVE ONLY: nullable columns + partial indexes.

-- Mentor module
DO $$ BEGIN
    ALTER TABLE mentor_tasks ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE mentor_activity_feed ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE mentor_feedback ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE mentor_sessions ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE mentor_materials ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE mentor_notes ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE mentor_notifications ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Jobs / career
DO $$ BEGIN
    ALTER TABLE job_postings ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE job_applications ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Blogs
DO $$ BEGIN
    ALTER TABLE blogs ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE blog_media ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Student achievements
DO $$ BEGIN
    ALTER TABLE student_course_milestones ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE student_stamps ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Audit tables
DO $$ BEGIN
    ALTER TABLE audit_events ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE audit_logs ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ROLLBACK: DROP COLUMN IF EXISTS org_id on all tables above (reverse order)

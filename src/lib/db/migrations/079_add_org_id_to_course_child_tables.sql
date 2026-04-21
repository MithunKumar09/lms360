-- Migration: 079_add_org_id_to_course_child_tables.sql
-- Phase E — Add org_id to course hierarchy child tables
-- Parent table (courses) already has org_id. Children derive it during backfill (migration 083).
-- ADDITIVE ONLY: nullable columns + partial indexes.

DO $$ BEGIN
    ALTER TABLE course_modules ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE course_chapters ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE course_lessons ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE course_instructors ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE course_enrollments ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- lesson_transcripts derives from course_lessons
DO $$ BEGIN
    ALTER TABLE lesson_transcripts ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Announcement child tables (announcements already has org_id)
DO $$ BEGIN
    ALTER TABLE announcement_attachments ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE announcement_targets ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE announcement_deliveries ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Event registrations
DO $$ BEGIN
    ALTER TABLE event_registrations ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Workshop registrations
DO $$ BEGIN
    ALTER TABLE workshop_registrations ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Academic: elective_group_members (elective_groups already has org_id)
DO $$ BEGIN
    ALTER TABLE elective_group_members ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ROLLBACK (reverse order):
-- ALTER TABLE elective_group_members DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE workshop_registrations DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE event_registrations DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE announcement_deliveries DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE announcement_targets DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE announcement_attachments DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE lesson_transcripts DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE course_enrollments DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE course_instructors DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE course_lessons DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE course_chapters DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE course_modules DROP COLUMN IF EXISTS org_id;

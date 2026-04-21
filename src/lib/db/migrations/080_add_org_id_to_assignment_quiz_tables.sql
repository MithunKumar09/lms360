-- Migration: 080_add_org_id_to_assignment_quiz_tables.sql
-- Phase E — Add org_id to assignment and quiz child tables
-- ADDITIVE ONLY: nullable columns + partial indexes.

-- Assignments
DO $$ BEGIN
    ALTER TABLE assignments ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE assignment_attachments ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE assignment_submissions ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE assignment_submission_files ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE submission_messages ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Quiz children (quizzes already has org_id)
DO $$ BEGIN
    ALTER TABLE quiz_questions ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE quiz_question_options ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE quiz_attempts ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE quiz_attempt_answers ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;


-- ROLLBACK:
-- ALTER TABLE quiz_attempt_answers DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE quiz_question_options DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE quiz_questions DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE submission_messages DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE assignment_submission_files DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE assignment_submissions DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE assignment_attachments DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE assignments DROP COLUMN IF EXISTS org_id;

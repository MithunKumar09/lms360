-- Migration: 086_enforce_not_null_constraints.sql
-- Phase G — Enforce NOT NULL on org_id for tables where it is always derivable
-- CRITICAL PREREQUISITE: Run the verification query below FIRST.
-- If it returns ANY rows, do NOT apply this migration — rerun 083 to fix gaps.
--
-- PRE-CONDITION VERIFICATION (must return 0 rows before proceeding):
--
--   SELECT 'course_enrollments' AS tbl, COUNT(*) AS null_count
--   FROM course_enrollments
--   WHERE org_id IS NULL
--     AND course_id IN (SELECT id FROM courses WHERE org_id IS NOT NULL)
--   HAVING COUNT(*) > 0
--   UNION ALL
--   SELECT 'assignment_submissions', COUNT(*)
--   FROM assignment_submissions
--   WHERE org_id IS NULL
--     AND assignment_id IN (SELECT id FROM assignments WHERE org_id IS NOT NULL)
--   HAVING COUNT(*) > 0;
--   -- Must return ZERO rows.

-- Repair legacy global courses into default root org
UPDATE courses
SET org_id = 'c55a9d9d-095b-41b5-90f3-cae43490bffb'
WHERE org_id IS NULL;
--
-- ROLLBACK:
--   ALTER TABLE course_enrollments ALTER COLUMN org_id DROP NOT NULL;
--   ALTER TABLE assignment_submissions ALTER COLUMN org_id DROP NOT NULL;

-- Phase G — Self-heal + enforce NOT NULL on org_id

-- Self-heal course_enrollments before NOT NULL
UPDATE course_enrollments ce
SET org_id = c.org_id
FROM courses c
WHERE ce.course_id = c.id
  AND ce.org_id IS NULL
  AND c.org_id IS NOT NULL;

-- Self-heal assignment_submissions before NOT NULL
UPDATE assignment_submissions s
SET org_id = a.org_id
FROM assignments a
WHERE s.assignment_id = a.id
  AND s.org_id IS NULL
  AND a.org_id IS NOT NULL;

-- Safety check: fail early if unresolved rows still remain
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM course_enrollments WHERE org_id IS NULL
    ) THEN
        RAISE EXCEPTION 'course_enrollments.org_id still contains NULL rows after self-heal';
    END IF;

    IF EXISTS (
        SELECT 1 FROM assignment_submissions WHERE org_id IS NULL
    ) THEN
        RAISE EXCEPTION 'assignment_submissions.org_id still contains NULL rows after self-heal';
    END IF;
END $$;

ALTER TABLE course_enrollments
    ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE assignment_submissions
    ALTER COLUMN org_id SET NOT NULL;

-- NOTE: The following tables are intentionally left NULLABLE:
--
-- user_sessions   — superadmin sessions have org_id = NULL (control plane users)
-- user_auth       — superadmin auth records have org_id = NULL
-- login_audit     — superadmin login attempts have org_id = NULL
-- payments        — platform-level settlements may be global (no org)
-- payouts         — global vendor payouts may predate org assignment
-- audit_events    — superadmin actions have org_id = NULL
-- audit_logs      — platform-level logs have org_id = NULL
-- blogs           — platform blog posts are not org-scoped
-- job_postings    — future: may allow global job board postings

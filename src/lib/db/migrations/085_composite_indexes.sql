-- Migration: 085_composite_indexes.sql
-- Phase F — Add composite indexes for all org_id-enriched tables
-- All indexes use CONCURRENTLY — safe to run on live production (no table lock).
-- PREREQUISITE: Migrations 078-083 must be applied first (org_id columns populated).
--
-- ROLLBACK: DROP INDEX CONCURRENTLY IF EXISTS <index_name>; for each index below.

-- ── COURSES ──────────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_org_status
    ON courses(org_id, status)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_org_published_at
    ON courses(org_id, created_at DESC)
    WHERE status = 'published' AND org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_org_category
    ON courses(org_id, category_id)
    WHERE org_id IS NOT NULL;

-- ── COURSE ENROLLMENTS ───────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ce_org_status
    ON course_enrollments(org_id, enrollment_status)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ce_org_course
    ON course_enrollments(org_id, course_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ce_org_user_created
    ON course_enrollments(org_id, user_id, created_at DESC)
    WHERE org_id IS NOT NULL;

-- ── COURSE MODULES / CHAPTERS / LESSONS ──────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_modules_org_course
    ON course_modules(org_id, course_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_chapters_org_module
    ON course_chapters(org_id, module_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_lessons_org_chapter
    ON course_lessons(org_id, chapter_id)
    WHERE org_id IS NOT NULL;

-- ── ASSIGNMENTS ───────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_org_course
    ON assignments(org_id, course_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_org_due_date
    ON assignments(org_id, due_date)
    WHERE org_id IS NOT NULL;

-- ── ASSIGNMENT SUBMISSIONS ────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asub_org_status
    ON assignment_submissions(org_id, status)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asub_org_assignment
    ON assignment_submissions(org_id, assignment_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asub_org_graded_by
    ON assignment_submissions(org_id, graded_by, status)
    WHERE org_id IS NOT NULL AND status = 'submitted';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asub_org_student
    ON assignment_submissions(org_id, student_id, created_at DESC)
    WHERE org_id IS NOT NULL;

-- ── QUIZ ATTEMPTS ─────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_attempts_org_status
    ON quiz_attempts(org_id, status)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_attempts_org_quiz
    ON quiz_attempts(org_id, quiz_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_attempts_org_created
    ON quiz_attempts(org_id, created_at DESC)
    WHERE org_id IS NOT NULL;

-- ── QUIZ QUESTIONS ────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_questions_org_quiz
    ON quiz_questions(org_id, quiz_id)
    WHERE org_id IS NOT NULL;

-- ── PAYMENTS ──────────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_org_status_created
    ON payments(org_id, status, created_at DESC)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_org_order
    ON payments(org_id, order_id)
    WHERE org_id IS NOT NULL;

-- ── ORDERS ────────────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_org_created_paid
    ON orders(org_id, created_at DESC)
    WHERE org_id IS NOT NULL AND status = 'paid';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_org_status
    ON orders(org_id, status)
    WHERE org_id IS NOT NULL;

-- ── REFUNDS ───────────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refunds_org_status_created
    ON refunds(org_id, status, created_at DESC)
    WHERE org_id IS NOT NULL;

-- ── PAYOUTS ───────────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payouts_org_status_created
    ON payouts(org_id, status, created_at DESC)
    WHERE org_id IS NOT NULL;

-- ── USER SESSIONS ─────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_org_expires
    ON user_sessions(org_id, expires_at)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_org_user
    ON user_sessions(org_id, user_id)
    WHERE org_id IS NOT NULL;

-- ── LOGIN AUDIT ───────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_login_audit_org_at
    ON login_audit(org_id, at DESC)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_login_audit_org_user
    ON login_audit(org_id, user_id, at DESC)
    WHERE org_id IS NOT NULL;

-- ── AUDIT EVENTS ──────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_events_org_created
    ON audit_events(org_id, created_at DESC)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_events_org_actor
    ON audit_events(org_id, actor_id, created_at DESC)
    WHERE org_id IS NOT NULL;

-- ── AUDIT LOGS ────────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_org_created
    ON audit_logs(org_id, created_at DESC)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_org_actor
    ON audit_logs(org_id, actor_id, created_at DESC)
    WHERE org_id IS NOT NULL;

-- ── MENTOR TABLES ─────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mentor_sessions_org_mentor
    ON mentor_sessions(org_id, mentor_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mentor_sessions_org_created
    ON mentor_sessions(org_id, created_at DESC)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mentor_feedback_org_mentor
    ON mentor_feedback(org_id, mentor_id)
    WHERE org_id IS NOT NULL;

-- ── JOB POSTINGS ─────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_postings_org_status
    ON job_postings(org_id, status)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_postings_org_created
    ON job_postings(org_id, created_at DESC)
    WHERE org_id IS NOT NULL;

-- ── JOB APPLICATIONS ─────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_applications_org_job
    ON job_applications(org_id, job_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_applications_org_status
    ON job_applications(org_id, application_status)
    WHERE org_id IS NOT NULL;

-- ── ANNOUNCEMENTS ────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_announcement_deliveries_org_announcement
    ON announcement_deliveries(org_id, announcement_id, created_at DESC)
    WHERE org_id IS NOT NULL;

-- ── STUDENT MILESTONES ───────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_course_milestones_org_student
    ON student_course_milestones(org_id, student_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_course_milestones_org_student
    ON student_course_milestones(org_id, student_id)
    WHERE org_id IS NOT NULL;

-- ── VENDOR BALANCES ───────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendor_balances_org_account
    ON vendor_balances(org_id, vendor_account_id)
    WHERE org_id IS NOT NULL;

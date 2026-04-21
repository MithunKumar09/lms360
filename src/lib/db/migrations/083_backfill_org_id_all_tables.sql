-- Migration: 083_backfill_org_id_all_tables.sql
-- Phase E — Backfill org_id for all tables added in 078-082
-- Prerequisites: migrations 078, 079, 080, 081, 082 must be applied first.
-- This migration is IDEMPOTENT: only updates rows where org_id IS NULL.
--
-- VERIFICATION QUERY (run before applying NOT NULL constraints in 086):
--   SELECT 'course_enrollments' as tbl, COUNT(*) FROM course_enrollments
--     WHERE org_id IS NULL AND course_id IN (SELECT id FROM courses WHERE org_id IS NOT NULL)
--   UNION ALL
--   SELECT 'assignment_submissions', COUNT(*) FROM assignment_submissions
--     WHERE org_id IS NULL AND assignment_id IN (SELECT id FROM assignments WHERE org_id IS NOT NULL);
--   -- Both should return 0.

BEGIN;

-- ── AUTH TABLES: derive from users.org_id ────────────────────────────────────

UPDATE user_auth SET org_id = u.org_id
FROM users u
WHERE user_auth.user_id = u.id
  AND user_auth.org_id IS NULL
  AND u.org_id IS NOT NULL;

UPDATE user_metadata SET org_id = u.org_id
FROM users u
WHERE user_metadata.user_id = u.id
  AND user_metadata.org_id IS NULL
  AND u.org_id IS NOT NULL;

UPDATE login_audit SET org_id = u.org_id
FROM users u
WHERE login_audit.user_id = u.id
  AND login_audit.org_id IS NULL
  AND u.org_id IS NOT NULL;

UPDATE user_sessions SET org_id = u.org_id
FROM users u
WHERE user_sessions.user_id = u.id
  AND user_sessions.org_id IS NULL
  AND u.org_id IS NOT NULL;

-- ── COURSE HIERARCHY: derive from courses.org_id ─────────────────────────────

UPDATE course_modules SET org_id = c.org_id
FROM courses c
WHERE course_modules.course_id = c.id
  AND course_modules.org_id IS NULL
  AND c.org_id IS NOT NULL;

UPDATE course_chapters SET org_id = c.org_id
FROM courses c
JOIN course_modules cm ON cm.course_id = c.id
WHERE course_chapters.module_id = cm.id
  AND course_chapters.org_id IS NULL
  AND c.org_id IS NOT NULL;

UPDATE course_lessons SET org_id = c.org_id
FROM courses c
JOIN course_modules cm ON cm.course_id = c.id
JOIN course_chapters cc ON cc.module_id = cm.id
WHERE course_lessons.chapter_id = cc.id
  AND course_lessons.org_id IS NULL
  AND c.org_id IS NOT NULL;

UPDATE lesson_transcripts SET org_id = cl.org_id
FROM course_lessons cl
WHERE lesson_transcripts.lesson_id = cl.id
  AND lesson_transcripts.org_id IS NULL
  AND cl.org_id IS NOT NULL;

UPDATE course_instructors SET org_id = c.org_id
FROM courses c
WHERE course_instructors.course_id = c.id
  AND course_instructors.org_id IS NULL
  AND c.org_id IS NOT NULL;

UPDATE course_enrollments SET org_id = c.org_id
FROM courses c
WHERE course_enrollments.course_id = c.id
  AND course_enrollments.org_id IS NULL
  AND c.org_id IS NOT NULL;

-- ── ANNOUNCEMENT CHILDREN: derive from announcements.org_id ──────────────────

UPDATE announcement_attachments SET org_id = a.org_id
FROM announcements a
WHERE announcement_attachments.announcement_id = a.id
  AND announcement_attachments.org_id IS NULL
  AND a.org_id IS NOT NULL;

UPDATE announcement_targets SET org_id = a.org_id
FROM announcements a
WHERE announcement_targets.announcement_id = a.id
  AND announcement_targets.org_id IS NULL
  AND a.org_id IS NOT NULL;

UPDATE announcement_deliveries SET org_id = a.org_id
FROM announcements a
WHERE announcement_deliveries.announcement_id = a.id
  AND announcement_deliveries.org_id IS NULL
  AND a.org_id IS NOT NULL;

-- ── EVENT REGISTRATIONS: derive from events/workshops ────────────────────────

-- ── EVENT REGISTRATIONS: derive from events ────────────────────────
UPDATE event_registrations SET org_id = e.organization_id
FROM events e
WHERE event_registrations.event_id = e.id
  AND event_registrations.org_id IS NULL
  AND e.organization_id IS NOT NULL;

-- ── WORKSHOP REGISTRATIONS: derive from workshops ──────────────────
UPDATE workshop_registrations SET org_id = w.organization_id
FROM workshops w
WHERE workshop_registrations.workshop_id = w.id
  AND workshop_registrations.org_id IS NULL
  AND w.organization_id IS NOT NULL;

-- ── ELECTIVE GROUP MEMBERS: derive from elective_groups ──────────────────────

UPDATE elective_group_members SET org_id = eg.org_id
FROM elective_groups eg
WHERE elective_group_members.elective_group_id = eg.id
  AND elective_group_members.org_id IS NULL
  AND eg.org_id IS NOT NULL;

-- ── ASSIGNMENTS: derive from courses.org_id ──────────────────────────────────

UPDATE assignments SET org_id = c.org_id
FROM courses c
WHERE assignments.course_id = c.id
  AND assignments.org_id IS NULL
  AND c.org_id IS NOT NULL;

UPDATE assignment_attachments SET org_id = a.org_id
FROM assignments a
WHERE assignment_attachments.assignment_id = a.id
  AND assignment_attachments.org_id IS NULL
  AND a.org_id IS NOT NULL;

UPDATE assignment_submissions SET org_id = a.org_id
FROM assignments a
WHERE assignment_submissions.assignment_id = a.id
  AND assignment_submissions.org_id IS NULL
  AND a.org_id IS NOT NULL;

UPDATE assignment_submission_files SET org_id = asub.org_id
FROM assignment_submissions asub
WHERE assignment_submission_files.submission_id = asub.id
  AND assignment_submission_files.org_id IS NULL
  AND asub.org_id IS NOT NULL;

UPDATE submission_messages SET org_id = asub.org_id
FROM assignment_submissions asub
WHERE submission_messages.submission_id = asub.id
  AND submission_messages.org_id IS NULL
  AND asub.org_id IS NOT NULL;

-- ── QUIZ CHILDREN: derive from quizzes.org_id ────────────────────────────────

UPDATE quiz_questions SET org_id = q.org_id
FROM quizzes q
WHERE quiz_questions.quiz_id = q.id
  AND quiz_questions.org_id IS NULL
  AND q.org_id IS NOT NULL;

UPDATE quiz_question_options SET org_id = qq.org_id
FROM quiz_questions qq
WHERE quiz_question_options.question_id = qq.id
  AND quiz_question_options.org_id IS NULL
  AND qq.org_id IS NOT NULL;

UPDATE quiz_attempts SET org_id = q.org_id
FROM quizzes q
WHERE quiz_attempts.quiz_id = q.id
  AND quiz_attempts.org_id IS NULL
  AND q.org_id IS NOT NULL;

UPDATE quiz_attempt_answers SET org_id = qa.org_id
FROM quiz_attempts qa
WHERE quiz_attempt_answers.attempt_id = qa.id
  AND quiz_attempt_answers.org_id IS NULL
  AND qa.org_id IS NOT NULL;

-- ── FINANCIAL: derive from orders.org_id / vendor_accounts.org_id ────────────

UPDATE payments SET org_id = o.org_id
FROM orders o
WHERE payments.order_id = o.id
  AND payments.org_id IS NULL
  AND o.org_id IS NOT NULL;

UPDATE payment_splits SET org_id = o.org_id
FROM orders o
WHERE payment_splits.order_id = o.id
  AND payment_splits.org_id IS NULL
  AND o.org_id IS NOT NULL;

UPDATE refunds SET org_id = p.org_id
FROM payments p
WHERE refunds.payment_id = p.id
  AND refunds.org_id IS NULL
  AND p.org_id IS NOT NULL;

UPDATE payouts SET org_id = va.org_id
FROM vendor_accounts va
WHERE payouts.vendor_account_id = va.id
  AND payouts.org_id IS NULL
  AND va.org_id IS NOT NULL;

UPDATE vendor_balances SET org_id = va.org_id
FROM vendor_accounts va
WHERE vendor_balances.vendor_account_id = va.id
  AND vendor_balances.org_id IS NULL
  AND va.org_id IS NOT NULL;

UPDATE organization_balances SET org_id = oa.org_id
FROM organization_accounts oa
WHERE organization_balances.organization_account_id = oa.id
  AND organization_balances.org_id IS NULL
  AND oa.org_id IS NOT NULL;

-- ── MENTOR TABLES: derive from mentors' users.org_id ─────────────────────────

UPDATE mentor_tasks SET org_id = u.org_id
FROM users u
WHERE mentor_tasks.mentor_id = u.id
  AND mentor_tasks.org_id IS NULL
  AND u.org_id IS NOT NULL;

UPDATE mentor_activity_feed SET org_id = u.org_id
FROM users u
WHERE mentor_activity_feed.mentor_id = u.id
  AND mentor_activity_feed.org_id IS NULL
  AND u.org_id IS NOT NULL;

UPDATE mentor_feedback SET org_id = u.org_id
FROM users u
WHERE mentor_feedback.mentor_id = u.id
  AND mentor_feedback.org_id IS NULL
  AND u.org_id IS NOT NULL;

UPDATE mentor_sessions SET org_id = u.org_id
FROM users u
WHERE mentor_sessions.mentor_id = u.id
  AND mentor_sessions.org_id IS NULL
  AND u.org_id IS NOT NULL;

-- ── STUDENT ACHIEVEMENTS: derive from courses ────────────────────────────────

UPDATE student_course_milestones SET org_id = c.org_id
FROM courses c
WHERE student_course_milestones.course_id = c.id
  AND student_course_milestones.org_id IS NULL
  AND c.org_id IS NOT NULL;

UPDATE student_stamps SET org_id = c.org_id
FROM courses c
WHERE student_stamps.course_id = c.id
  AND student_stamps.org_id IS NULL
  AND c.org_id IS NOT NULL;

UPDATE blog_media SET org_id = b.org_id
FROM blogs b
WHERE blog_media.blog_id = b.id
  AND blog_media.org_id IS NULL
  AND b.org_id IS NOT NULL;

-- ── JOB POSTINGS: derive from company user's org_id ──────────────────────────

UPDATE job_postings SET org_id = u.org_id
FROM users u
WHERE job_postings.company_user_id = u.id
  AND job_postings.org_id IS NULL
  AND u.org_id IS NOT NULL;

UPDATE job_applications SET org_id = jp.org_id
FROM job_postings jp
WHERE job_applications.job_id = jp.id
  AND job_applications.org_id IS NULL
  AND jp.org_id IS NOT NULL;

-- ── AUDIT TABLES: derive from actor's org_id ─────────────────────────────────

UPDATE audit_events SET org_id = u.org_id
FROM users u
WHERE audit_events.actor_id = u.id
  AND audit_events.org_id IS NULL
  AND u.org_id IS NOT NULL;

UPDATE audit_logs SET org_id = u.org_id
FROM users u
WHERE audit_logs.actor_id = u.id
  AND audit_logs.org_id IS NULL
  AND u.org_id IS NOT NULL;

COMMIT;

-- ============================================================================
-- Migration: 028_quiz_reminders_schema.sql
-- Description: Create quiz_reminders table for quiz reminder system
-- Created: 2025-01-XX
-- Dependencies: 020_assignments_quizzes_schema.sql, 004_users_schema.sql
-- ============================================================================
-- 
-- This migration creates the quiz_reminders table for:
-- - Student quiz reminders (email, push, sms, in_app)
-- - Scheduled reminder notifications
-- - Reminder tracking and delivery status
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Quiz reminders table
CREATE TABLE IF NOT EXISTS quiz_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) NOT NULL, -- 'email', 'push', 'sms', 'in_app'
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL, -- When to send reminder
    is_sent BOOLEAN NOT NULL DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT quiz_reminders_type_check CHECK (reminder_type IN ('email', 'push', 'sms', 'in_app'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quiz_reminders_quiz_id ON quiz_reminders(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_reminders_student_id ON quiz_reminders(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_reminders_time ON quiz_reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_quiz_reminders_sent ON quiz_reminders(is_sent);
CREATE INDEX IF NOT EXISTS idx_quiz_reminders_quiz_student ON quiz_reminders(quiz_id, student_id);

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE quiz_reminders IS 'Quiz reminders for students with multiple notification types';
COMMENT ON COLUMN quiz_reminders.quiz_id IS 'Quiz ID for which reminder is set';
COMMENT ON COLUMN quiz_reminders.student_id IS 'Student user ID who set the reminder';
COMMENT ON COLUMN quiz_reminders.reminder_type IS 'Reminder type: email, push, sms, or in_app';
COMMENT ON COLUMN quiz_reminders.reminder_time IS 'Scheduled time to send the reminder';
COMMENT ON COLUMN quiz_reminders.is_sent IS 'Whether the reminder has been sent';
COMMENT ON COLUMN quiz_reminders.sent_at IS 'Timestamp when reminder was sent';


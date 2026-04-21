-- ============================================================================
-- Migration: 030_enhance_quiz_attempts_table.sql
-- Description: Add reminder tracking columns to quiz_attempts table
-- Created: 2025-01-XX
-- Dependencies: 020_assignments_quizzes_schema.sql
-- ============================================================================
-- 
-- This migration adds reminder tracking columns to quiz_attempts table:
-- - reminder_sent: Whether a reminder was sent for this attempt
-- - reminder_sent_at: Timestamp when reminder was sent
-- ============================================================================

-- ============================================================================
-- ALTER TABLE
-- ============================================================================

-- Add reminder_sent column
ALTER TABLE quiz_attempts
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- Add reminder_sent_at column
ALTER TABLE quiz_attempts
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE NULL;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON COLUMN quiz_attempts.reminder_sent IS 'Whether a reminder was sent for this quiz attempt';
COMMENT ON COLUMN quiz_attempts.reminder_sent_at IS 'Timestamp when reminder was sent for this quiz attempt';


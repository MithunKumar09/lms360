-- ============================================================================
-- Migration: 055_mentor_feedback_schema.sql
-- Description: Mentor Feedback Schema - Feedback from students to mentors
-- Created: 2025-01-XX
-- Dependencies: 031_vendor_mentor_registration_schema.sql, 004_users_schema.sql, 003_classes_subjects_schema.sql
-- ============================================================================
-- 
-- This migration creates table for:
-- - mentor_feedback: Feedback submissions from students to their assigned mentors
--
-- Supports feedback collection with ratings, categories, and review workflow
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- mentor_feedback table
-- Stores feedback submissions from students to their assigned mentors
CREATE TABLE IF NOT EXISTS mentor_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cohort_id UUID NULL REFERENCES cohorts(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    category VARCHAR(50) NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted', -- submitted, reviewed, archived
    reviewed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT mentor_feedback_message_length CHECK (char_length(message) >= 10 AND char_length(message) <= 1000),
    CONSTRAINT mentor_feedback_status_check CHECK (status IN ('submitted', 'reviewed', 'archived'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for mentor_feedback
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_student_id ON mentor_feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_mentor_id ON mentor_feedback(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_cohort_id ON mentor_feedback(cohort_id) WHERE cohort_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_status ON mentor_feedback(status);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_rating ON mentor_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_category ON mentor_feedback(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_created_at ON mentor_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_mentor_student ON mentor_feedback(mentor_id, student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_mentor_status ON mentor_feedback(mentor_id, status);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_student_status ON mentor_feedback(student_id, status);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMP
-- ============================================================================

-- Ensure update_updated_at_column function exists (reuse from previous migrations)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $fn$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Trigger for mentor_feedback updated_at
DROP TRIGGER IF EXISTS trigger_update_mentor_feedback_updated_at ON mentor_feedback;
CREATE TRIGGER trigger_update_mentor_feedback_updated_at
    BEFORE UPDATE ON mentor_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE mentor_feedback IS 'Stores feedback submissions from students to their assigned mentors. Supports ratings, categories, and review workflow.';
COMMENT ON COLUMN mentor_feedback.student_id IS 'UUID of the student submitting the feedback';
COMMENT ON COLUMN mentor_feedback.mentor_id IS 'UUID of the mentor receiving the feedback';
COMMENT ON COLUMN mentor_feedback.cohort_id IS 'Optional cohort association for the feedback';
COMMENT ON COLUMN mentor_feedback.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN mentor_feedback.category IS 'Optional category: teaching, communication, support, availability, other';
COMMENT ON COLUMN mentor_feedback.message IS 'Feedback message (10-1000 characters)';
COMMENT ON COLUMN mentor_feedback.status IS 'Status: submitted (default), reviewed, archived';
COMMENT ON COLUMN mentor_feedback.reviewed_by IS 'UUID of the user who reviewed this feedback (if reviewed)';
COMMENT ON COLUMN mentor_feedback.reviewed_at IS 'Timestamp when the feedback was reviewed';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

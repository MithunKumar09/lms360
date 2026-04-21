-- ============================================================================
-- Migration: 062_instructor_reviews_schema.sql
-- Description: Create instructor_reviews table for student feedback and ratings on instructors
-- Created: 2025-01-XX
-- Dependencies: 004_users_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - instructor_reviews: Student feedback and ratings for instructors
--
-- Supports one review per student per instructor with rating (1-5) and optional feedback text
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Instructor Reviews Table
-- Stores student feedback and ratings for instructors
CREATE TABLE IF NOT EXISTS instructor_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT instructor_reviews_unique UNIQUE(instructor_id, student_id),
    CONSTRAINT instructor_reviews_feedback_text_length CHECK (
        feedback_text IS NULL OR (
            char_length(feedback_text) >= 1 AND 
            char_length(feedback_text) <= 5000
        )
    )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_instructor_reviews_instructor_id ON instructor_reviews(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_reviews_student_id ON instructor_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_instructor_reviews_rating ON instructor_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_instructor_reviews_created_at ON instructor_reviews(created_at DESC);

-- Composite index for common queries (instructor_id + created_at for listing)
CREATE INDEX IF NOT EXISTS idx_instructor_reviews_instructor_created ON instructor_reviews(instructor_id, created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_instructor_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_instructor_reviews_updated_at
  BEFORE UPDATE ON instructor_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_instructor_reviews_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE instructor_reviews IS 'Stores student feedback and ratings for instructors';
COMMENT ON COLUMN instructor_reviews.id IS 'Primary key UUID';
COMMENT ON COLUMN instructor_reviews.instructor_id IS 'UUID of the instructor being reviewed (FK to users)';
COMMENT ON COLUMN instructor_reviews.student_id IS 'UUID of the student providing the review (FK to users)';
COMMENT ON COLUMN instructor_reviews.rating IS 'Rating value from 1 to 5';
COMMENT ON COLUMN instructor_reviews.feedback_text IS 'Optional feedback text from student (max 5000 characters)';
COMMENT ON COLUMN instructor_reviews.created_at IS 'Timestamp when the review was created';
COMMENT ON COLUMN instructor_reviews.updated_at IS 'Timestamp when the review was last updated';

-- ============================================================================
-- Migration: 012_add_course_pinned_column.sql
-- Description: Add pinned column to courses table for course prioritization
-- Created: 2025-12-04
-- Dependencies: 011_courses_schema.sql
-- ============================================================================

-- Add pinned column to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;

-- Create index for pinned courses (for faster queries)
CREATE INDEX IF NOT EXISTS idx_courses_pinned ON courses(pinned) WHERE pinned = true;

-- Add comment
COMMENT ON COLUMN courses.pinned IS 'Indicates if the course is pinned/prioritized for display';


-- ============================================================================
-- Migration: 036_add_course_cover_image.sql
-- Description: Add cover_image_url column to courses table
-- Created: 2025-01-XX
-- Dependencies: 011_courses_schema.sql
-- ============================================================================

-- Add cover_image_url column to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS cover_image_url TEXT NULL;

-- Add comment
COMMENT ON COLUMN courses.cover_image_url IS 'URL of the course cover image (stored in R2)';


-- ============================================================================
-- Migration: 038_add_course_certificate_upload.sql
-- Description: Add certificate_upload_url column to courses table for uploaded certificates
-- Created: 2025-01-XX
-- Dependencies: 011_courses_schema.sql
-- ============================================================================

-- Add certificate_upload_url column to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS certificate_upload_url TEXT NULL;

-- Add comment
COMMENT ON COLUMN courses.certificate_upload_url IS 'URL of uploaded certificate (PDF/Image) for courses using uploaded certificate mode';


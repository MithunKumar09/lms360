-- ============================================================================
-- Migration: 026_add_file_description_to_submissions.sql
-- Description: Add description column to assignment_submission_files table
-- Created: 2025-01-XX
-- Dependencies: 020_assignments_quizzes_schema.sql
-- ============================================================================
-- 
-- This migration adds a description field to assignment_submission_files
-- to store user-provided descriptions for submitted files and links.
-- ============================================================================

-- Add description column to assignment_submission_files table
ALTER TABLE assignment_submission_files 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment to document the column
COMMENT ON COLUMN assignment_submission_files.description IS 'Optional user-provided description for the submitted file or link';


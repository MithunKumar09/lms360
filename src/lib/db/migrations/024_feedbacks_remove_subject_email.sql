-- ============================================================================
-- Migration: 024_feedbacks_remove_subject_email.sql
-- Description: Remove subject and email columns from feedbacks table
-- Created: 2025-01-XX
-- Dependencies: 023_feedbacks_schema.sql
-- ============================================================================
-- 
-- This migration removes subject and email columns from feedbacks table
-- to simplify the feedback form with emoji-based emotion selection
-- ============================================================================

-- ============================================================================
-- ALTER TABLE
-- ============================================================================

-- Remove email column
ALTER TABLE feedbacks DROP COLUMN IF EXISTS email;

-- Remove subject column
ALTER TABLE feedbacks DROP COLUMN IF EXISTS subject;

-- Remove constraints related to removed columns
ALTER TABLE feedbacks DROP CONSTRAINT IF EXISTS feedbacks_subject_length;
ALTER TABLE feedbacks DROP CONSTRAINT IF EXISTS feedbacks_email_format;

-- Update message constraint (subject is removed, so message is the only required text field)
-- Keep existing message length constraint


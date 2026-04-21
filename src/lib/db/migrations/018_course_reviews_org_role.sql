-- ============================================================================
-- Migration: 018_course_reviews_org_role.sql
-- Description: Add org_id and role columns to course_reviews table
-- Created: 2025-01-XX
-- ============================================================================

-- Add org_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name='course_reviews' AND column_name='org_id'
    ) THEN
        ALTER TABLE course_reviews ADD COLUMN org_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add role column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name='course_reviews' AND column_name='role'
    ) THEN
        ALTER TABLE course_reviews ADD COLUMN role VARCHAR(50) NULL;
    END IF;
END $$;

-- Create index on org_id for performance
CREATE INDEX IF NOT EXISTS idx_course_reviews_org_id ON course_reviews(org_id);

-- Create index on role for performance
CREATE INDEX IF NOT EXISTS idx_course_reviews_role ON course_reviews(role);

-- Comments
COMMENT ON COLUMN course_reviews.org_id IS 'Organization ID of the user who created the review';
COMMENT ON COLUMN course_reviews.role IS 'Role of the user who created the review (student, instructor, admin, etc.)';


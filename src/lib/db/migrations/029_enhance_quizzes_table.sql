-- ============================================================================
-- Migration: 029_enhance_quizzes_table.sql
-- Description: Enhance quizzes table with quiz types, mini course support, and cohort filtering
-- Created: 2025-01-XX
-- Dependencies: 020_assignments_quizzes_schema.sql, 027_mini_courses_schema.sql
-- ============================================================================
-- 
-- This migration adds new columns to quizzes table:
-- - quiz_type: Support for main_course, mini_course, and global quiz types
-- - mini_course_id: Link to mini courses for mini course quizzes
-- - admin_id: For admin-created global quizzes
-- - cohort_ids: Array of cohort IDs for admin cohort-based quizzes
-- - is_roadmap_mandatory: For future roadmap integration
-- - certificate_enabled: For future certificate integration
-- ============================================================================

-- ============================================================================
-- ALTER TABLE
-- ============================================================================

-- Add quiz_type column
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS quiz_type VARCHAR(20) DEFAULT 'main_course';

-- Add mini_course_id column
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS mini_course_id UUID NULL REFERENCES mini_courses(id) ON DELETE SET NULL;

-- Add admin_id column
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS admin_id UUID NULL REFERENCES users(id) ON DELETE SET NULL;

-- Add cohort_ids array column
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS cohort_ids UUID[] NULL;

-- Add is_roadmap_mandatory column
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS is_roadmap_mandatory BOOLEAN DEFAULT false;

-- Add certificate_enabled column
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN DEFAULT false;

-- Add CHECK constraint for quiz_type
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'quizzes_quiz_type_check'
    ) THEN
        ALTER TABLE quizzes
        ADD CONSTRAINT quizzes_quiz_type_check CHECK (quiz_type IN ('main_course', 'mini_course', 'global'));
    END IF;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quizzes_quiz_type ON quizzes(quiz_type);
CREATE INDEX IF NOT EXISTS idx_quizzes_mini_course_id ON quizzes(mini_course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_admin_id ON quizzes(admin_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_cohort_ids ON quizzes USING GIN(cohort_ids);

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON COLUMN quizzes.quiz_type IS 'Quiz type: main_course (linked to course), mini_course (linked to mini course), or global (standalone)';
COMMENT ON COLUMN quizzes.mini_course_id IS 'Mini course ID for mini_course type quizzes';
COMMENT ON COLUMN quizzes.admin_id IS 'Admin user ID for admin-created global quizzes';
COMMENT ON COLUMN quizzes.cohort_ids IS 'Array of cohort IDs for admin cohort-based quiz assignment';
COMMENT ON COLUMN quizzes.is_roadmap_mandatory IS 'Whether this quiz is mandatory for roadmap completion (future feature)';
COMMENT ON COLUMN quizzes.certificate_enabled IS 'Whether certificate generation is enabled for this quiz (future feature)';


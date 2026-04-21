-- ============================================================================
-- Migration: 027_mini_courses_schema.sql
-- Description: Create mini_courses table for standalone mini courses (chapters without modules)
-- Created: 2025-01-XX
-- Dependencies: 001_initial_schema.sql, 002_organizations_schema.sql
-- ============================================================================
-- 
-- This migration creates the mini_courses table for:
-- - Standalone mini courses (individual chapters, no modules)
-- - Small certificates, skill improvement tests, psychometric tests
-- - Promotional quizzes, target-reaching assessments
-- - Supports future mini certificates
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Mini courses table
CREATE TABLE IF NOT EXISTS mini_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    admin_id UUID NULL REFERENCES users(id) ON DELETE SET NULL, -- For admin-created mini courses
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    cover_photo_url TEXT NOT NULL,
    stamp_logo_url TEXT NOT NULL, -- PNG, 28x28 size
    video_url TEXT, -- Video link or upload (max 150MB)
    video_file_key TEXT, -- R2/S3 key if uploaded
    instructions TEXT NOT NULL, -- Rich text content
    material_url TEXT, -- Optional material URL
    material_file_key TEXT, -- Optional material file key
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'archived'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT mini_courses_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
    CONSTRAINT mini_courses_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_mini_courses_org_id ON mini_courses(org_id);
CREATE INDEX IF NOT EXISTS idx_mini_courses_created_by ON mini_courses(created_by);
CREATE INDEX IF NOT EXISTS idx_mini_courses_admin_id ON mini_courses(admin_id);
CREATE INDEX IF NOT EXISTS idx_mini_courses_status ON mini_courses(status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp trigger
CREATE TRIGGER trigger_update_mini_courses_updated_at
    BEFORE UPDATE ON mini_courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE mini_courses IS 'Standalone mini courses for small certificates, skill tests, and promotional quizzes';
COMMENT ON COLUMN mini_courses.org_id IS 'Organization ID - NULL for global mini courses';
COMMENT ON COLUMN mini_courses.created_by IS 'User who created the mini course';
COMMENT ON COLUMN mini_courses.admin_id IS 'Admin user ID for admin-created mini courses';
COMMENT ON COLUMN mini_courses.title IS 'Mini course title (3-255 characters)';
COMMENT ON COLUMN mini_courses.description IS 'Mini course description';
COMMENT ON COLUMN mini_courses.cover_photo_url IS 'Cover photo URL (required)';
COMMENT ON COLUMN mini_courses.stamp_logo_url IS 'Stamp logo URL (PNG, 28x28 size, required)';
COMMENT ON COLUMN mini_courses.video_url IS 'Video link or upload URL (max 150MB)';
COMMENT ON COLUMN mini_courses.video_file_key IS 'R2/S3 key for uploaded video file';
COMMENT ON COLUMN mini_courses.instructions IS 'Rich text instructions for the mini course';
COMMENT ON COLUMN mini_courses.material_url IS 'Optional material URL';
COMMENT ON COLUMN mini_courses.material_file_key IS 'Optional material file key (R2/S3)';
COMMENT ON COLUMN mini_courses.status IS 'Mini course status: draft, published, or archived';


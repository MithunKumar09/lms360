-- ============================================================================
-- Migration: 010_course_drafts_schema.sql
-- Description: Course drafts schema for saving course creation progress
-- Created: 2025-01-XX
-- Dependencies: 001_initial_schema.sql (for UUID extension and users table)
-- ============================================================================
-- 
-- This migration creates the course_drafts table for:
-- - Saving course creation progress as drafts
-- - Auto-saving course form data
-- - Supporting draft and publish workflow
--
-- Supports multi-tenancy with org_id (NULL for global/superadmin)
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Draft status enum
DO $$ BEGIN
    CREATE TYPE draft_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Course Drafts table
CREATE TABLE IF NOT EXISTS course_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NULL, -- NULL for new course, UUID for updating existing course
    org_id UUID NULL, -- NULL for global (superadmin), org_id for admin
    course_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Full course form data
    status draft_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT course_drafts_course_data_check CHECK (jsonb_typeof(course_data) = 'object')
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_course_drafts_user_id ON course_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_course_drafts_user_status ON course_drafts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_course_drafts_org_id ON course_drafts(org_id);
CREATE INDEX IF NOT EXISTS idx_course_drafts_course_id ON course_drafts(course_id);
CREATE INDEX IF NOT EXISTS idx_course_drafts_updated_at ON course_drafts(updated_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_course_drafts_user_org_status ON course_drafts(user_id, org_id, status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_course_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_course_drafts_updated_at
    BEFORE UPDATE ON course_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_course_drafts_updated_at();


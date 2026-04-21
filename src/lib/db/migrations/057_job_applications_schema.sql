-- ============================================================================
-- Migration: 057_job_applications_schema.sql
-- Description: Job applications schema for tracking job applications
-- Created: 2025-01-XX
-- Dependencies: 033_jobs_schema.sql, 004_users_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - job_applications: Tracks user applications for jobs posted by mentors
--
-- Supports the Mentor dashboard job applications feature
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Application status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status_enum') THEN
        CREATE TYPE application_status_enum AS ENUM ('pending', 'reviewed', 'shortlisted', 'rejected', 'accepted', 'withdrawn');
    END IF;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- job_applications table
-- Stores job applications submitted by users
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Application details
    application_status application_status_enum NOT NULL DEFAULT 'pending',
    cover_letter TEXT NULL,
    resume_url TEXT NULL,
    
    -- Application timestamps
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Review information
    reviewed_at TIMESTAMP WITH TIME ZONE NULL,
    reviewed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    -- Ensure a user can only apply once per job
    UNIQUE(job_id, user_id),
    
    -- Resume URL format validation
    CONSTRAINT job_applications_resume_url_format CHECK (
        resume_url IS NULL OR resume_url ~* '^https?://'
    )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for job_applications
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_job_applications_applied_at ON job_applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_reviewed_by ON job_applications(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_job_applications_job_status ON job_applications(job_id, application_status);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_status ON job_applications(user_id, application_status);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMP
-- ============================================================================

-- Ensure update_updated_at_column function exists (reuse from previous migrations)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $fn$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Trigger for job_applications updated_at
DROP TRIGGER IF EXISTS trigger_update_job_applications_updated_at ON job_applications;
CREATE TRIGGER trigger_update_job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE job_applications IS 'Tracks user applications for jobs posted by mentors. Supports application status tracking and review workflow.';
COMMENT ON COLUMN job_applications.job_id IS 'Reference to the job being applied for';
COMMENT ON COLUMN job_applications.user_id IS 'Reference to the user (applicant)';
COMMENT ON COLUMN job_applications.application_status IS 'Status of the application: pending, reviewed, shortlisted, rejected, accepted, or withdrawn';
COMMENT ON COLUMN job_applications.cover_letter IS 'Optional cover letter submitted with the application';
COMMENT ON COLUMN job_applications.resume_url IS 'URL to the applicant resume (external link)';
COMMENT ON COLUMN job_applications.applied_at IS 'Timestamp when the user applied for the job';
COMMENT ON COLUMN job_applications.reviewed_at IS 'Timestamp when the application was reviewed';
COMMENT ON COLUMN job_applications.reviewed_by IS 'Reference to the mentor/user who reviewed the application';
COMMENT ON COLUMN job_applications.notes IS 'Internal notes about the application (visible to mentor only)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

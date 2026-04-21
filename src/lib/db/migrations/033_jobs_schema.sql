-- ============================================================================
-- Migration: 033_jobs_schema.sql
-- Description: Jobs Schema for Mentor Dashboard
-- Created: 2025-01-XX
-- Dependencies: 004_users_schema.sql, 002_organizations_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - jobs: Job postings created by mentors
--
-- Supports the Mentor dashboard jobs feature
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Job type enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type_enum') THEN
        CREATE TYPE job_type_enum AS ENUM ('full_time', 'part_time', 'contract', 'internship', 'freelance');
    END IF;
END $$;

-- Job status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status_enum') THEN
        CREATE TYPE job_status_enum AS ENUM ('draft', 'published', 'closed', 'expired');
    END IF;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. jobs table
-- Stores job postings created by mentors
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255) NULL,
    job_type job_type_enum NOT NULL DEFAULT 'full_time',
    
    -- Salary information
    salary_min DECIMAL(10, 2) NULL CHECK (salary_min IS NULL OR salary_min >= 0),
    salary_max DECIMAL(10, 2) NULL CHECK (salary_max IS NULL OR salary_max >= 0),
    salary_currency VARCHAR(10) DEFAULT 'INR',
    
    -- Skills (stored as JSON array)
    skills JSONB NULL,
    
    -- Description
    description TEXT NULL,
    full_description TEXT NULL,
    
    -- Deadline
    application_deadline TIMESTAMP WITH TIME ZONE NULL,
    
    -- External apply link
    external_apply_link TEXT NULL,
    
    -- Creator information
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    organization_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Status
    status job_status_enum NOT NULL DEFAULT 'draft',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT jobs_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
    CONSTRAINT jobs_company_length CHECK (char_length(company) >= 1 AND char_length(company) <= 255),
    CONSTRAINT jobs_salary_range CHECK (
        (salary_min IS NULL AND salary_max IS NULL) OR
        (salary_min IS NOT NULL AND salary_max IS NOT NULL AND salary_max >= salary_min)
    ),
    CONSTRAINT jobs_external_link_format CHECK (
        external_apply_link IS NULL OR external_apply_link ~* '^https?://'
    )
);

-- Indexes for jobs
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_organization_id ON jobs(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_application_deadline ON jobs(application_deadline) WHERE application_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- Full-text search index for jobs
CREATE INDEX IF NOT EXISTS idx_jobs_search ON jobs USING gin(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(company, '') || ' ' || coalesce(description, '') || ' ' || coalesce(full_description, '')));

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

-- Trigger for jobs updated_at
DROP TRIGGER IF EXISTS trigger_update_jobs_updated_at ON jobs;
CREATE TRIGGER trigger_update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE jobs IS 'Stores job postings created by mentors. Jobs appear in Resources → Jobs.';
COMMENT ON COLUMN jobs.job_type IS 'Type of job: full_time, part_time, contract, internship, or freelance';
COMMENT ON COLUMN jobs.salary_min IS 'Minimum salary in specified currency';
COMMENT ON COLUMN jobs.salary_max IS 'Maximum salary in specified currency';
COMMENT ON COLUMN jobs.salary_currency IS 'Currency code (default: INR)';
COMMENT ON COLUMN jobs.skills IS 'Required skills stored as JSON array';
COMMENT ON COLUMN jobs.description IS 'Short description/summary';
COMMENT ON COLUMN jobs.full_description IS 'Full job description';
COMMENT ON COLUMN jobs.application_deadline IS 'Deadline for applications';
COMMENT ON COLUMN jobs.external_apply_link IS 'External URL for job application';
COMMENT ON COLUMN jobs.organization_id IS 'Organization associated with the job (from mentor user.org_id)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


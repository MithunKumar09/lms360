-- ============================================================================
-- Migration: 069_placement_career_readiness_schema.sql
-- Description: Placement & Career Readiness feature schema
-- Created: 2025-01-XX
-- Dependencies: 004_users_schema.sql, 002_organizations_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - placement_readiness: Student placement readiness scores
-- - job_postings: Admin-managed internship and job postings
-- - applications: Student applications for internships/jobs
-- - recruitment_drives: Campus recruitment drives
-- - recruitment_drive_registrations: Student registrations for drives
-- - resumes: Student resume data and versions
-- - portfolios: Student portfolio data
--
-- Supports the Student Dashboard Placement & Career Readiness feature
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Posting type enum (internship or job)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'posting_type_enum') THEN
        CREATE TYPE posting_type_enum AS ENUM ('internship', 'job', 'contract');
    END IF;
END $$;

-- Posting status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'posting_status_enum') THEN
        CREATE TYPE posting_status_enum AS ENUM ('draft', 'active', 'closed', 'expired');
    END IF;
END $$;

-- Application status enum (for placement applications)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'placement_application_status_enum') THEN
        CREATE TYPE placement_application_status_enum AS ENUM (
            'pending', 
            'reviewing', 
            'shortlisted', 
            'interview_scheduled', 
            'rejected', 
            'accepted', 
            'withdrawn',
            'offer_extended'
        );
    END IF;
END $$;

-- Readiness status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'readiness_status_enum') THEN
        CREATE TYPE readiness_status_enum AS ENUM ('not_ready', 'getting_ready', 'ready');
    END IF;
END $$;

-- Drive registration status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'drive_registration_status_enum') THEN
        CREATE TYPE drive_registration_status_enum AS ENUM (
            'registered', 
            'confirmed', 
            'attended', 
            'cancelled', 
            'rejected'
        );
    END IF;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. placement_readiness table
-- Tracks student placement readiness scores and status
CREATE TABLE IF NOT EXISTS placement_readiness (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    readiness_score DECIMAL(5, 2) DEFAULT 0.00 CHECK (readiness_score >= 0 AND readiness_score <= 100),
    status readiness_status_enum DEFAULT 'not_ready',
    
    -- Component scores
    course_completion_rate DECIMAL(5, 2) DEFAULT 0.00 CHECK (course_completion_rate >= 0 AND course_completion_rate <= 100),
    assignment_completion_rate DECIMAL(5, 2) DEFAULT 0.00 CHECK (assignment_completion_rate >= 0 AND assignment_completion_rate <= 100),
    profile_completion_rate DECIMAL(5, 2) DEFAULT 0.00 CHECK (profile_completion_rate >= 0 AND profile_completion_rate <= 100),
    skills_assessed_count INTEGER DEFAULT 0 CHECK (skills_assessed_count >= 0),
    mentor_endorsements_count INTEGER DEFAULT 0 CHECK (mentor_endorsements_count >= 0),
    
    -- Calculation metadata
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    UNIQUE(user_id)
);

-- Indexes for placement_readiness
CREATE INDEX IF NOT EXISTS idx_placement_readiness_user_id ON placement_readiness(user_id);
CREATE INDEX IF NOT EXISTS idx_placement_readiness_status ON placement_readiness(status);
CREATE INDEX IF NOT EXISTS idx_placement_readiness_score ON placement_readiness(readiness_score DESC);
CREATE INDEX IF NOT EXISTS idx_placement_readiness_last_calculated ON placement_readiness(last_calculated_at DESC);

-- 2. job_postings table
-- Admin-managed internship and job postings
CREATE TABLE IF NOT EXISTS job_postings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic information
    title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    posting_type posting_type_enum NOT NULL,
    location VARCHAR(255) NULL,
    
    -- Description
    description TEXT NULL,
    requirements TEXT NULL,
    responsibilities TEXT NULL,
    
    -- Salary/Stipend information
    salary_min DECIMAL(10, 2) NULL CHECK (salary_min IS NULL OR salary_min >= 0),
    salary_max DECIMAL(10, 2) NULL CHECK (salary_max IS NULL OR salary_max >= 0),
    salary_currency VARCHAR(10) DEFAULT 'INR',
    salary_display VARCHAR(100) NULL, -- e.g., "₹20,000 - ₹30,000 per month"
    
    -- Skills and qualifications
    required_skills JSONB NULL, -- Array of skill names
    preferred_qualifications TEXT NULL,
    experience_level VARCHAR(50) NULL, -- e.g., "0-2 years", "2-5 years"
    
    -- Application details
    application_deadline TIMESTAMP WITH TIME ZONE NULL,
    application_link TEXT NULL, -- External application link (optional)
    
    -- Eligibility requirements
    min_readiness_score DECIMAL(5, 2) NULL CHECK (min_readiness_score IS NULL OR (min_readiness_score >= 0 AND min_readiness_score <= 100)),
    required_courses JSONB NULL, -- Array of course IDs that must be completed
    required_skills_list JSONB NULL, -- Array of required skill names
    
    -- Creator information (admin who posted)
    posted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    organization_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Status
    status posting_status_enum NOT NULL DEFAULT 'draft',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT job_postings_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
    CONSTRAINT job_postings_company_length CHECK (char_length(company_name) >= 1 AND char_length(company_name) <= 255),
    CONSTRAINT job_postings_salary_range CHECK (
        (salary_min IS NULL AND salary_max IS NULL) OR
        (salary_min IS NOT NULL AND salary_max IS NOT NULL AND salary_max >= salary_min)
    ),
    CONSTRAINT job_postings_application_link_format CHECK (
        application_link IS NULL OR application_link ~* '^https?://'
    )
);

-- Indexes for job_postings
CREATE INDEX IF NOT EXISTS idx_job_postings_posted_by ON job_postings(posted_by);
CREATE INDEX IF NOT EXISTS idx_job_postings_organization_id ON job_postings(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_posting_type ON job_postings(posting_type);
CREATE INDEX IF NOT EXISTS idx_job_postings_application_deadline ON job_postings(application_deadline) WHERE application_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_postings_created_at ON job_postings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_postings_min_readiness ON job_postings(min_readiness_score) WHERE min_readiness_score IS NOT NULL;

-- Full-text search index for job_postings
CREATE INDEX IF NOT EXISTS idx_job_postings_search ON job_postings USING gin(
    to_tsvector('simple', 
        coalesce(title, '') || ' ' || 
        coalesce(company_name, '') || ' ' || 
        coalesce(description, '') || ' ' || 
        coalesce(requirements, '')
    )
);

-- 3. applications table
-- Unified table for internship and job applications
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    
    -- Application details
    application_status placement_application_status_enum NOT NULL DEFAULT 'pending',
    cover_letter TEXT NULL,
    resume_version_id UUID NULL, -- Reference to resumes table (FK added after resumes table creation)
    
    -- Additional information
    expected_salary DECIMAL(10, 2) NULL CHECK (expected_salary IS NULL OR expected_salary >= 0),
    notes TEXT NULL, -- Student notes (visible to student only)
    
    -- Application timestamps
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Review information (admin/company)
    reviewed_at TIMESTAMP WITH TIME ZONE NULL,
    reviewed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    admin_notes TEXT NULL, -- Admin notes (not visible to student)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    -- Ensure a user can only apply once per posting
    UNIQUE(posting_id, user_id)
);

-- Indexes for applications
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_posting_id ON applications(posting_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(application_status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_reviewed_by ON applications(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_applications_posting_status ON applications(posting_id, application_status);
CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, application_status);

-- 4. recruitment_drives table
-- Campus recruitment drives
CREATE TABLE IF NOT EXISTS recruitment_drives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic information
    title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    
    -- Drive details
    drive_date TIMESTAMP WITH TIME ZONE NOT NULL,
    drive_end_date TIMESTAMP WITH TIME ZONE NULL, -- For multi-day drives
    location VARCHAR(255) NULL,
    venue_address TEXT NULL,
    is_virtual BOOLEAN DEFAULT false,
    virtual_link TEXT NULL, -- For virtual drives
    
    -- Eligibility requirements
    min_readiness_score DECIMAL(5, 2) NULL CHECK (min_readiness_score IS NULL OR (min_readiness_score >= 0 AND min_readiness_score <= 100)),
    eligibility_criteria TEXT NULL,
    required_courses JSONB NULL,
    
    -- Registration details
    registration_deadline TIMESTAMP WITH TIME ZONE NULL,
    max_participants INTEGER NULL CHECK (max_participants IS NULL OR max_participants > 0),
    
    -- Creator information (admin)
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    organization_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT recruitment_drives_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
    CONSTRAINT recruitment_drives_company_length CHECK (char_length(company_name) >= 1 AND char_length(company_name) <= 255),
    CONSTRAINT recruitment_drives_virtual_link_format CHECK (
        virtual_link IS NULL OR virtual_link ~* '^https?://'
    ),
    CONSTRAINT recruitment_drives_date_check CHECK (
        drive_end_date IS NULL OR drive_end_date >= drive_date
    )
);

-- Indexes for recruitment_drives
CREATE INDEX IF NOT EXISTS idx_recruitment_drives_created_by ON recruitment_drives(created_by);
CREATE INDEX IF NOT EXISTS idx_recruitment_drives_organization_id ON recruitment_drives(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recruitment_drives_status ON recruitment_drives(status);
CREATE INDEX IF NOT EXISTS idx_recruitment_drives_drive_date ON recruitment_drives(drive_date);
CREATE INDEX IF NOT EXISTS idx_recruitment_drives_registration_deadline ON recruitment_drives(registration_deadline) WHERE registration_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recruitment_drives_created_at ON recruitment_drives(created_at DESC);

-- 5. recruitment_drive_registrations table
-- Student registrations for recruitment drives
CREATE TABLE IF NOT EXISTS recruitment_drive_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    drive_id UUID NOT NULL REFERENCES recruitment_drives(id) ON DELETE CASCADE,
    
    -- Registration details
    registration_status drive_registration_status_enum DEFAULT 'registered',
    eligibility_checked BOOLEAN DEFAULT false,
    eligibility_status VARCHAR(100) NULL, -- e.g., "eligible", "not_eligible", "pending"
    eligibility_message TEXT NULL,
    
    -- Notes
    notes TEXT NULL,
    
    -- Timestamps
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    -- Ensure a user can only register once per drive
    UNIQUE(drive_id, user_id)
);

-- Indexes for recruitment_drive_registrations
CREATE INDEX IF NOT EXISTS idx_drive_registrations_user_id ON recruitment_drive_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_drive_registrations_drive_id ON recruitment_drive_registrations(drive_id);
CREATE INDEX IF NOT EXISTS idx_drive_registrations_status ON recruitment_drive_registrations(registration_status);
CREATE INDEX IF NOT EXISTS idx_drive_registrations_registered_at ON recruitment_drive_registrations(registered_at DESC);

-- 6. resumes table
-- Student resume data and versions
CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Resume configuration
    template_id VARCHAR(50) DEFAULT 'modern',
    resume_data JSONB NOT NULL, -- Structured resume data (sections, content)
    is_auto_generated BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    
    -- Timestamps
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for resumes
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_user_active ON resumes(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON resumes(created_at DESC);

-- 7. portfolios table
-- Student portfolio data
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Portfolio configuration
    portfolio_slug VARCHAR(100) UNIQUE, -- For shareable URL
    portfolio_data JSONB NOT NULL, -- Portfolio structure and content
    is_public BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- View tracking
    view_count INTEGER DEFAULT 0 CHECK (view_count >= 0),
    last_viewed_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    -- Only one active portfolio per user
    CONSTRAINT portfolios_one_active_per_user UNIQUE(user_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Partial unique index for active portfolios (better than constraint for this use case)
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolios_user_active ON portfolios(user_id) WHERE is_active = true;

-- Indexes for portfolios
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_slug ON portfolios(portfolio_slug) WHERE portfolio_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portfolios_public ON portfolios(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_portfolios_created_at ON portfolios(created_at DESC);

-- ============================================================================
-- FOREIGN KEY CONSTRAINT FOR APPLICATIONS.RESUME_VERSION_ID
-- ============================================================================

-- Add foreign key constraint for resume_version_id in applications table
-- (This is done after resumes table is created)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_applications_resume_version'
    ) THEN
        ALTER TABLE applications 
        ADD CONSTRAINT fk_applications_resume_version 
        FOREIGN KEY (resume_version_id) REFERENCES resumes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMP
-- ============================================================================

-- Ensure update_updated_at_column function exists
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

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_placement_readiness_updated_at ON placement_readiness;
CREATE TRIGGER trigger_update_placement_readiness_updated_at
    BEFORE UPDATE ON placement_readiness
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_job_postings_updated_at ON job_postings;
CREATE TRIGGER trigger_update_job_postings_updated_at
    BEFORE UPDATE ON job_postings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_applications_updated_at ON applications;
CREATE TRIGGER trigger_update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_recruitment_drives_updated_at ON recruitment_drives;
CREATE TRIGGER trigger_update_recruitment_drives_updated_at
    BEFORE UPDATE ON recruitment_drives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_drive_registrations_updated_at ON recruitment_drive_registrations;
CREATE TRIGGER trigger_update_drive_registrations_updated_at
    BEFORE UPDATE ON recruitment_drive_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_resumes_updated_at ON resumes;
CREATE TRIGGER trigger_update_resumes_updated_at
    BEFORE UPDATE ON resumes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_portfolios_updated_at ON portfolios;
CREATE TRIGGER trigger_update_portfolios_updated_at
    BEFORE UPDATE ON portfolios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE placement_readiness IS 'Tracks student placement readiness scores calculated from courses, assignments, profile completion, and mentor endorsements';
COMMENT ON TABLE job_postings IS 'Admin-managed internship and job postings for student applications';
COMMENT ON TABLE applications IS 'Student applications for internships and jobs posted in job_postings';
COMMENT ON TABLE recruitment_drives IS 'Campus recruitment drives organized by admin';
COMMENT ON TABLE recruitment_drive_registrations IS 'Student registrations for recruitment drives';
COMMENT ON TABLE resumes IS 'Student resume data and versions with auto-generation support';
COMMENT ON TABLE portfolios IS 'Student portfolio data with public sharing capability';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

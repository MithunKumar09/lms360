-- ============================================================================
-- Migration: 031_vendor_mentor_registration_schema.sql
-- Description: Vendor & Mentor Registration System Schema
-- Created: 2025-01-XX
-- Dependencies: 004_users_schema.sql, 002_organizations_schema.sql, 003_classes_subjects_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - vendor_alumni_requests: Registration requests from vendors and mentors (alumni)
-- - vendor_organizations: Many-to-many relationship between vendors and organizations
-- - mentor_student_assignments: Many-to-many relationship between mentors and students with cohorts
--
-- Supports the Vendor & Mentor registration and management system
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Add 'mentor' to role_code_enum if it doesn't exist
-- Note: ALTER TYPE ... ADD VALUE cannot be run inside a transaction
-- This should be run separately before this migration, or handled via a script
-- For now, we'll check if it exists and add it if needed (PostgreSQL 12+)
DO $$ 
BEGIN
    -- Check if 'mentor' value exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'mentor' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'role_code_enum')
    ) THEN
        -- Note: This will fail if run inside a transaction in older PostgreSQL versions
        -- In that case, run: ALTER TYPE role_code_enum ADD VALUE 'mentor';
        ALTER TYPE role_code_enum ADD VALUE 'mentor';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- If it fails (e.g., inside transaction), log and continue
        -- The value might already exist or will be added manually
        RAISE NOTICE 'Could not add mentor to role_code_enum: %', SQLERRM;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. vendor_alumni_requests table
-- Stores registration requests from vendors and mentors (alumni)
CREATE TABLE IF NOT EXISTS vendor_alumni_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('vendor', 'mentor')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    
    -- For mentors: single organization selection
    organization_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Event/Workshop interest (optional)
    event_interest BOOLEAN NOT NULL DEFAULT false,
    workshop_interest BOOLEAN NOT NULL DEFAULT false,
    
    -- Review information
    reviewed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE NULL,
    rejection_reason TEXT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT vendor_alumni_requests_email_format CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT vendor_alumni_requests_phone_format CHECK (
        phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$'
    ),
    CONSTRAINT vendor_alumni_requests_mentor_org_required CHECK (
        request_type != 'mentor' OR organization_id IS NOT NULL
    ),
    CONSTRAINT vendor_alumni_requests_first_name_length CHECK (
        char_length(first_name) >= 1 AND char_length(first_name) <= 100
    ),
    CONSTRAINT vendor_alumni_requests_last_name_length CHECK (
        char_length(last_name) >= 1 AND char_length(last_name) <= 100
    )
);

-- Indexes for vendor_alumni_requests
CREATE INDEX IF NOT EXISTS idx_vendor_alumni_requests_type ON vendor_alumni_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_vendor_alumni_requests_status ON vendor_alumni_requests(status);
CREATE INDEX IF NOT EXISTS idx_vendor_alumni_requests_email ON vendor_alumni_requests(email);
CREATE INDEX IF NOT EXISTS idx_vendor_alumni_requests_org_id ON vendor_alumni_requests(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_alumni_requests_created_at ON vendor_alumni_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_alumni_requests_type_status ON vendor_alumni_requests(request_type, status);
CREATE INDEX IF NOT EXISTS idx_vendor_alumni_requests_reviewed_by ON vendor_alumni_requests(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- Unique constraint: one pending request per email per type
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_alumni_requests_pending_unique 
ON vendor_alumni_requests(email, request_type, status) 
WHERE status = 'pending';

-- 2. vendor_organizations table
-- Many-to-many relationship between vendors and organizations
CREATE TABLE IF NOT EXISTS vendor_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    
    -- Ensure unique vendor-organization pairs
    CONSTRAINT vendor_organizations_unique UNIQUE (vendor_id, organization_id)
);

-- Indexes for vendor_organizations
CREATE INDEX IF NOT EXISTS idx_vendor_organizations_vendor ON vendor_organizations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_organizations_org ON vendor_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendor_organizations_created_by ON vendor_organizations(created_by) WHERE created_by IS NOT NULL;

-- 3. mentor_student_assignments table
-- Many-to-many relationship between mentors and students with cohort information
CREATE TABLE IF NOT EXISTS mentor_student_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cohort_id UUID NULL REFERENCES cohorts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    
    -- Ensure unique mentor-student-cohort combinations
    CONSTRAINT mentor_student_assignments_unique UNIQUE (mentor_id, student_id, cohort_id)
);

-- Indexes for mentor_student_assignments
CREATE INDEX IF NOT EXISTS idx_mentor_student_assignments_mentor ON mentor_student_assignments(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_student_assignments_student ON mentor_student_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_student_assignments_cohort ON mentor_student_assignments(cohort_id) WHERE cohort_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_student_assignments_created_by ON mentor_student_assignments(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_student_assignments_mentor_cohort ON mentor_student_assignments(mentor_id, cohort_id);

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

-- Trigger for vendor_alumni_requests updated_at
DROP TRIGGER IF EXISTS trigger_update_vendor_alumni_requests_updated_at ON vendor_alumni_requests;
CREATE TRIGGER trigger_update_vendor_alumni_requests_updated_at
    BEFORE UPDATE ON vendor_alumni_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED ROLES
-- ============================================================================

-- Ensure 'mentor' role exists in roles table
INSERT INTO roles (id, code, title, created_at, updated_at)
VALUES 
    (uuid_generate_v4(), 'mentor'::role_code_enum, 'Mentor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET 
    title = EXCLUDED.title, 
    updated_at = CURRENT_TIMESTAMP;

-- Ensure 'vendor' role exists (in case it wasn't seeded)
INSERT INTO roles (id, code, title, created_at, updated_at)
VALUES 
    (uuid_generate_v4(), 'vendor'::role_code_enum, 'Vendor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET 
    title = EXCLUDED.title, 
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE vendor_alumni_requests IS 'Stores registration requests from vendors and mentors (alumni). Each email can have only one pending request per type.';
COMMENT ON COLUMN vendor_alumni_requests.request_type IS 'Type of request: vendor or mentor';
COMMENT ON COLUMN vendor_alumni_requests.organization_id IS 'For mentor requests: the organization they want to be associated with (required)';
COMMENT ON COLUMN vendor_alumni_requests.event_interest IS 'Whether the requester is interested in events';
COMMENT ON COLUMN vendor_alumni_requests.workshop_interest IS 'Whether the requester is interested in workshops';
COMMENT ON COLUMN vendor_alumni_requests.reviewed_by IS 'UUID of the superadmin user who reviewed (approved/rejected) this request';

COMMENT ON TABLE vendor_organizations IS 'Many-to-many relationship between vendors and organizations. A vendor can be assigned to multiple organizations.';
COMMENT ON COLUMN vendor_organizations.created_by IS 'UUID of the superadmin user who created this assignment';

COMMENT ON TABLE mentor_student_assignments IS 'Many-to-many relationship between mentors and students, with optional cohort association. A mentor can be assigned to multiple students, and a student can have multiple mentors.';
COMMENT ON COLUMN mentor_student_assignments.cohort_id IS 'Optional cohort association for the mentor-student relationship';
COMMENT ON COLUMN mentor_student_assignments.created_by IS 'UUID of the admin user who created this assignment';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


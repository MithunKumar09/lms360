-- ============================================================================
-- Migration: 066_brand_schema.sql
-- Description: Create brand-related tables for Brand Dashboard
--              - brand_profiles: Brand profile information with superadmin approval
--              - brand_certificates: Certificate templates created by brands
--              - issued_certificates: Certificates issued to students
--              - brand_event_college_allocations: Superadmin allocation of events to colleges
--              Also extends events table with brand_id and event_status_enum with 'proposed'
-- Created: 2025-01-XX
-- Dependencies: 004_users_schema.sql, 002_organizations_schema.sql, 032_events_workshops_schema.sql
-- ============================================================================
-- 
-- This migration creates the brand dashboard infrastructure:
-- - Brand profiles require superadmin approval (pending, approved, rejected)
-- - Brands can create event proposals (status: 'proposed')
-- - Superadmin approves events and allocates visibility to colleges
-- - Brands can create certificate templates and issue certificates to students
-- ============================================================================

-- ============================================================================
-- EXTEND EXISTING ENUMS
-- ============================================================================

-- Add 'brand' to role_code_enum if it doesn't exist
-- NOTE: ALTER TYPE ... ADD VALUE cannot be run inside a transaction
-- If 'brand' enum value doesn't exist, run this manually first:
--   ALTER TYPE role_code_enum ADD VALUE 'brand';
-- The enum value should already exist from previous setup

-- Extend event_status_enum to include 'proposed' for brand event proposals
DO $$ BEGIN
    -- Check if 'proposed' already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'proposed' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_status_enum')
    ) THEN
        ALTER TYPE event_status_enum ADD VALUE 'proposed';
    END IF;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Brand Profiles Table
-- Stores brand profile information with superadmin approval workflow
CREATE TABLE IF NOT EXISTS brand_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    brand_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    description TEXT,
    mission TEXT,
    values TEXT,
    csr_initiatives JSONB DEFAULT '[]'::jsonb,
    focus_areas TEXT[],
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website_url VARCHAR(255),
    logo_url TEXT,
    branding_materials JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT brand_profiles_status_check CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT brand_profiles_brand_name_length CHECK (char_length(brand_name) >= 2 AND char_length(brand_name) <= 255),
    CONSTRAINT brand_profiles_contact_email_format CHECK (
        contact_email IS NULL OR 
        contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT brand_profiles_website_url_format CHECK (
        website_url IS NULL OR 
        website_url ~* '^https?://[^\s/$.?#].[^\s]*$'
    ),
    CONSTRAINT brand_profiles_approved_when_approved CHECK (
        (status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
        (status != 'approved')
    )
);

-- Brand Certificates Table
-- Stores certificate templates created by brands
CREATE TABLE IF NOT EXISTS brand_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
    certificate_name VARCHAR(255) NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    logo_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT brand_certificates_name_length CHECK (char_length(certificate_name) >= 2 AND char_length(certificate_name) <= 255),
    CONSTRAINT brand_certificates_status_check CHECK (status IN ('active', 'inactive', 'archived'))
);

-- Issued Certificates Table
-- Stores certificates issued to students by brands
CREATE TABLE IF NOT EXISTS issued_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_id UUID NOT NULL REFERENCES brand_certificates(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verification_code VARCHAR(100) NOT NULL UNIQUE,
    certificate_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT issued_certificates_unique_cert_student UNIQUE (certificate_id, student_id),
    CONSTRAINT issued_certificates_verification_code_length CHECK (char_length(verification_code) >= 8 AND char_length(verification_code) <= 100)
);

-- Brand Event College Allocations Table
-- Tracks which colleges can see which brand events (superadmin controlled)
CREATE TABLE IF NOT EXISTS brand_event_college_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    allocated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT brand_event_college_allocations_unique_event_org UNIQUE (event_id, org_id)
);

-- ============================================================================
-- ENHANCE EXISTING TABLE: events
-- ============================================================================

-- Add brand_id column to events table to support brand events
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS brand_id UUID NULL REFERENCES brand_profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for brand_profiles
CREATE INDEX IF NOT EXISTS idx_brand_profiles_user_id ON brand_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_profiles_status ON brand_profiles(status);
CREATE INDEX IF NOT EXISTS idx_brand_profiles_approved_by ON brand_profiles(approved_by) WHERE approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brand_profiles_created_at ON brand_profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_profiles_updated_at ON brand_profiles(updated_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_brand_profiles_status_created ON brand_profiles(status, created_at DESC);

-- Indexes for brand_certificates
CREATE INDEX IF NOT EXISTS idx_brand_certificates_brand_id ON brand_certificates(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_certificates_status ON brand_certificates(status);
CREATE INDEX IF NOT EXISTS idx_brand_certificates_created_at ON brand_certificates(created_at DESC);

-- Indexes for issued_certificates
CREATE INDEX IF NOT EXISTS idx_issued_certificates_certificate_id ON issued_certificates(certificate_id);
CREATE INDEX IF NOT EXISTS idx_issued_certificates_student_id ON issued_certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_issued_certificates_verification_code ON issued_certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_issued_certificates_issued_at ON issued_certificates(issued_at DESC);

-- Composite index for student certificate queries
CREATE INDEX IF NOT EXISTS idx_issued_certificates_student_issued ON issued_certificates(student_id, issued_at DESC);

-- Indexes for brand_event_college_allocations
CREATE INDEX IF NOT EXISTS idx_brand_event_college_allocations_event_id ON brand_event_college_allocations(event_id);
CREATE INDEX IF NOT EXISTS idx_brand_event_college_allocations_org_id ON brand_event_college_allocations(org_id);
CREATE INDEX IF NOT EXISTS idx_brand_event_college_allocations_allocated_by ON brand_event_college_allocations(allocated_by);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_brand_event_college_allocations_event_org ON brand_event_college_allocations(event_id, org_id);

-- Index for events.brand_id
CREATE INDEX IF NOT EXISTS idx_events_brand_id ON events(brand_id) WHERE brand_id IS NOT NULL;

-- Composite index for brand events queries
CREATE INDEX IF NOT EXISTS idx_events_brand_status ON events(brand_id, status) WHERE brand_id IS NOT NULL;

-- ============================================================================
-- TRIGGERS
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

-- Trigger for brand_profiles updated_at
DROP TRIGGER IF EXISTS update_brand_profiles_updated_at ON brand_profiles;
CREATE TRIGGER update_brand_profiles_updated_at
    BEFORE UPDATE ON brand_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for brand_certificates updated_at
DROP TRIGGER IF EXISTS update_brand_certificates_updated_at ON brand_certificates;
CREATE TRIGGER update_brand_certificates_updated_at
    BEFORE UPDATE ON brand_certificates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED ROLES TABLE
-- ============================================================================

-- Ensure 'brand' role exists in roles table
INSERT INTO roles (id, code, title, created_at, updated_at)
VALUES 
    (uuid_generate_v4(), 'brand'::role_code_enum, 'Brand', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE brand_profiles IS 'Brand profile information with superadmin approval workflow. Status: pending, approved, rejected.';
COMMENT ON COLUMN brand_profiles.user_id IS 'User ID of the brand account (one-to-one relationship)';
COMMENT ON COLUMN brand_profiles.brand_name IS 'Official brand name';
COMMENT ON COLUMN brand_profiles.industry IS 'Industry category (e.g., Technology, Education, Healthcare)';
COMMENT ON COLUMN brand_profiles.description IS 'Brand description and overview';
COMMENT ON COLUMN brand_profiles.mission IS 'Brand mission statement';
COMMENT ON COLUMN brand_profiles.values IS 'Brand core values';
COMMENT ON COLUMN brand_profiles.csr_initiatives IS 'Corporate Social Responsibility initiatives (JSON array)';
COMMENT ON COLUMN brand_profiles.focus_areas IS 'Array of focus areas or specializations';
COMMENT ON COLUMN brand_profiles.contact_email IS 'Brand contact email address';
COMMENT ON COLUMN brand_profiles.contact_phone IS 'Brand contact phone number';
COMMENT ON COLUMN brand_profiles.website_url IS 'Brand website URL';
COMMENT ON COLUMN brand_profiles.logo_url IS 'Brand logo image URL';
COMMENT ON COLUMN brand_profiles.branding_materials IS 'Additional branding materials (JSON object)';
COMMENT ON COLUMN brand_profiles.status IS 'Profile status: pending (awaiting approval), approved (active), rejected (denied)';
COMMENT ON COLUMN brand_profiles.approved_by IS 'Superadmin user ID who approved the profile';
COMMENT ON COLUMN brand_profiles.approved_at IS 'Timestamp when profile was approved';

COMMENT ON TABLE brand_certificates IS 'Certificate templates created by brands for issuing to students';
COMMENT ON COLUMN brand_certificates.brand_id IS 'Reference to brand profile';
COMMENT ON COLUMN brand_certificates.certificate_name IS 'Name of the certificate template';
COMMENT ON COLUMN brand_certificates.description IS 'Description of the certificate';
COMMENT ON COLUMN brand_certificates.criteria IS 'Criteria for certificate issuance (JSON object with conditions)';
COMMENT ON COLUMN brand_certificates.template_data IS 'Certificate design template data (JSON object with layout, fields, styling)';
COMMENT ON COLUMN brand_certificates.logo_url IS 'Brand logo URL to include in certificate';
COMMENT ON COLUMN brand_certificates.status IS 'Certificate status: active (can issue), inactive (paused), archived (deprecated)';

COMMENT ON TABLE issued_certificates IS 'Certificates issued to students by brands';
COMMENT ON COLUMN issued_certificates.certificate_id IS 'Reference to brand certificate template';
COMMENT ON COLUMN issued_certificates.student_id IS 'Student who received the certificate';
COMMENT ON COLUMN issued_certificates.issued_at IS 'Timestamp when certificate was issued';
COMMENT ON COLUMN issued_certificates.verification_code IS 'Unique verification code for public certificate verification';
COMMENT ON COLUMN issued_certificates.certificate_url IS 'URL to generated certificate PDF/image';
COMMENT ON COLUMN issued_certificates.metadata IS 'Additional metadata (JSON object)';

COMMENT ON TABLE brand_event_college_allocations IS 'Superadmin allocation of brand events to colleges for visibility';
COMMENT ON COLUMN brand_event_college_allocations.event_id IS 'Reference to brand event';
COMMENT ON COLUMN brand_event_college_allocations.org_id IS 'Organization (college) that can see this event';
COMMENT ON COLUMN brand_event_college_allocations.allocated_by IS 'Superadmin user ID who made the allocation';
COMMENT ON COLUMN brand_event_college_allocations.allocated_at IS 'Timestamp when allocation was made';

COMMENT ON COLUMN events.brand_id IS 'Reference to brand profile (NULL for vendor events, set for brand events)';

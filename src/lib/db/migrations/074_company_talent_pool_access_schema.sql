-- Migration: Company Talent Pool Access Schema
-- Allows companies to request access to student talent pool with admin approval

-- Access request status enum
DO $$ BEGIN
    CREATE TYPE talent_pool_access_status_enum AS ENUM ('pending', 'approved', 'rejected', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Company talent pool access requests
CREATE TABLE IF NOT EXISTS company_talent_pool_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    approved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL, -- Admin/superadmin who approved
    approved_at TIMESTAMP WITH TIME ZONE NULL,
    status talent_pool_access_status_enum DEFAULT 'pending',
    rejection_reason TEXT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NULL, -- Optional expiration date
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT company_talent_pool_access_unique UNIQUE(company_user_id)
);

-- Company student shortlist (companies can shortlist students)
CREATE TABLE IF NOT EXISTS company_student_shortlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notes TEXT NULL,
    tags TEXT[], -- Custom tags for organization
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT company_student_shortlist_unique UNIQUE(company_user_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_talent_pool_access_company_user_id ON company_talent_pool_access(company_user_id);
CREATE INDEX IF NOT EXISTS idx_company_talent_pool_access_status ON company_talent_pool_access(status);
CREATE INDEX IF NOT EXISTS idx_company_talent_pool_access_organization_id ON company_talent_pool_access(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_student_shortlist_company_user_id ON company_student_shortlist(company_user_id);
CREATE INDEX IF NOT EXISTS idx_company_student_shortlist_student_id ON company_student_shortlist(student_id);

-- Updated timestamp trigger
CREATE TRIGGER trigger_update_company_talent_pool_access_updated_at
    BEFORE UPDATE ON company_talent_pool_access
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE company_talent_pool_access IS 'Company requests for talent pool access (requires admin approval)';
COMMENT ON TABLE company_student_shortlist IS 'Company shortlisted students for recruitment';

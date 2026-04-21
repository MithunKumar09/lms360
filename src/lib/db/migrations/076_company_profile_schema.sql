-- Migration: Company Profile and Hiring Needs Schema
-- Stores company profile information and hiring requirements

-- Company profiles table
CREATE TABLE IF NOT EXISTS company_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Company Information
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100) NULL,
    company_size VARCHAR(50) NULL, -- 'startup', 'small', 'medium', 'large', 'enterprise'
    website TEXT NULL,
    description TEXT NULL,
    company_culture TEXT NULL,
    
    -- Hiring Needs
    hiring_needs JSONB NULL, -- { roles: [], skills: [], locations: [], experienceLevels: [] }
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Branding
    logo_url TEXT NULL,
    banner_url TEXT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_profiles_company_user_id ON company_profiles(company_user_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_organization_id ON company_profiles(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_profiles_is_verified ON company_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_company_profiles_industry ON company_profiles(industry) WHERE industry IS NOT NULL;

-- Updated timestamp trigger
CREATE TRIGGER trigger_update_company_profiles_updated_at
    BEFORE UPDATE ON company_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE company_profiles IS 'Company profile information and hiring needs (requires admin verification)';

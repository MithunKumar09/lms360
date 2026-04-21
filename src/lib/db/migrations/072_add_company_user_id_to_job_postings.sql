-- Migration: Add company_user_id to job_postings table
-- This allows companies to own job postings while maintaining backward compatibility with admin-created postings

-- Add company_user_id column (nullable)
ALTER TABLE job_postings 
ADD COLUMN IF NOT EXISTS company_user_id UUID NULL REFERENCES users(id) ON DELETE RESTRICT;

-- Add index for company_user_id lookups
CREATE INDEX IF NOT EXISTS idx_job_postings_company_user_id ON job_postings(company_user_id) WHERE company_user_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN job_postings.company_user_id IS 'Company user who owns this posting. NULL for admin-created postings.';

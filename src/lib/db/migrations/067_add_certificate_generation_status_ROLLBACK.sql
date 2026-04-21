-- ============================================================================
-- Rollback Migration: 067_add_certificate_generation_status_ROLLBACK.sql
-- Description: Rollback generation status tracking columns from issued_certificates table
-- Created: 2025-01-27
-- ============================================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_issued_certificates_generation_job_id;
DROP INDEX IF EXISTS idx_issued_certificates_generation_status;

-- Remove columns
ALTER TABLE issued_certificates
    DROP COLUMN IF EXISTS generation_completed_at,
    DROP COLUMN IF EXISTS generation_error,
    DROP COLUMN IF EXISTS generation_job_id,
    DROP COLUMN IF EXISTS generation_status;

-- Drop enum type (only if no other tables use it)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE data_type = 'USER-DEFINED' 
        AND udt_name = 'certificate_generation_status_enum'
    ) THEN
        DROP TYPE IF EXISTS certificate_generation_status_enum;
    END IF;
END $$;

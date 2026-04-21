-- ============================================================================
-- Migration: 067_add_certificate_generation_status.sql
-- Description: Add generation status tracking columns to issued_certificates table
--              for Phase 1: Certificate Generation Infrastructure
-- Created: 2025-01-27
-- Dependencies: 066_brand_schema.sql
-- ============================================================================
-- 
-- This migration adds columns to track certificate generation status:
-- - generation_status: Status of PDF/image generation (pending, processing, completed, failed)
-- - generation_job_id: ID of the background job processing this certificate
-- ============================================================================

-- Create issued_certificates table if it doesn't exist (from migration 066)
-- This handles the case where migration 066 was marked as applied but table wasn't created
CREATE TABLE IF NOT EXISTS issued_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_id UUID NOT NULL,
    student_id UUID NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verification_code VARCHAR(100) NOT NULL UNIQUE,
    certificate_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT issued_certificates_unique_cert_student UNIQUE (certificate_id, student_id),
    CONSTRAINT issued_certificates_verification_code_length CHECK (char_length(verification_code) >= 8 AND char_length(verification_code) <= 100)
);

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Add FK to brand_certificates if table exists and constraint doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'brand_certificates') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'issued_certificates_certificate_id_fkey'
        ) THEN
            ALTER TABLE issued_certificates
                ADD CONSTRAINT issued_certificates_certificate_id_fkey 
                FOREIGN KEY (certificate_id) REFERENCES brand_certificates(id) ON DELETE RESTRICT;
        END IF;
    END IF;

    -- Add FK to users if table exists and constraint doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'issued_certificates_student_id_fkey'
        ) THEN
            ALTER TABLE issued_certificates
                ADD CONSTRAINT issued_certificates_student_id_fkey 
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT;
        END IF;
    END IF;
END $$;

-- Add generation status enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certificate_generation_status_enum') THEN
        CREATE TYPE certificate_generation_status_enum AS ENUM (
            'pending',
            'processing',
            'completed',
            'failed'
        );
    END IF;
END $$;

-- Add generation status columns to issued_certificates table
DO $$ 
BEGIN
    -- Check if columns already exist before adding
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'issued_certificates' 
        AND column_name = 'generation_status'
    ) THEN
        ALTER TABLE issued_certificates
            ADD COLUMN generation_status certificate_generation_status_enum DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'issued_certificates' 
        AND column_name = 'generation_job_id'
    ) THEN
        ALTER TABLE issued_certificates
            ADD COLUMN generation_job_id VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'issued_certificates' 
        AND column_name = 'generation_error'
    ) THEN
        ALTER TABLE issued_certificates
            ADD COLUMN generation_error TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'issued_certificates' 
        AND column_name = 'generation_completed_at'
    ) THEN
        ALTER TABLE issued_certificates
            ADD COLUMN generation_completed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create index for faster queries on generation status
CREATE INDEX IF NOT EXISTS idx_issued_certificates_generation_status 
    ON issued_certificates(generation_status) 
    WHERE generation_status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_issued_certificates_generation_job_id 
    ON issued_certificates(generation_job_id) 
    WHERE generation_job_id IS NOT NULL;

-- Add comments (only if columns exist)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'issued_certificates' 
        AND column_name = 'generation_status'
    ) THEN
        COMMENT ON COLUMN issued_certificates.generation_status IS 'Status of certificate PDF/image generation: pending, processing, completed, failed';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'issued_certificates' 
        AND column_name = 'generation_job_id'
    ) THEN
        COMMENT ON COLUMN issued_certificates.generation_job_id IS 'ID of the background job processing this certificate generation';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'issued_certificates' 
        AND column_name = 'generation_error'
    ) THEN
        COMMENT ON COLUMN issued_certificates.generation_error IS 'Error message if generation failed';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'issued_certificates' 
        AND column_name = 'generation_completed_at'
    ) THEN
        COMMENT ON COLUMN issued_certificates.generation_completed_at IS 'Timestamp when certificate generation was completed';
    END IF;
END $$;

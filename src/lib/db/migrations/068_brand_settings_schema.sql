-- ============================================================================
-- Migration: 068_brand_settings_schema.sql
-- Description: Create brand_settings table for brand preferences and settings
--              for Phase 3: Brand Settings Implementation
-- Created: 2025-01-27
-- Dependencies: 066_brand_schema.sql
-- ============================================================================
-- 
-- This migration creates the brand_settings table to store:
-- - Notification preferences
-- - Dashboard preferences
-- - Certificate generation preferences
-- - Event management preferences
-- ============================================================================

-- Create brand_profiles table if it doesn't exist (from migration 066)
-- This handles the case where migration 066 was marked as applied but table wasn't created
CREATE TABLE IF NOT EXISTS brand_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    brand_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    logo_url TEXT,
    website_url TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    description TEXT,
    csr_initiatives TEXT,
    focus_areas TEXT,
    mission TEXT,
    values TEXT,
    approval_status VARCHAR(50) DEFAULT 'pending',
    rejection_reason TEXT,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT brand_profiles_user_id_unique UNIQUE (user_id)
);

-- Add foreign key to users if it doesn't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'brand_profiles_user_id_fkey'
        ) THEN
            ALTER TABLE brand_profiles
                ADD CONSTRAINT brand_profiles_user_id_fkey 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Create brand_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS brand_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL UNIQUE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT brand_settings_brand_id_unique UNIQUE (brand_id)
);

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'brand_settings_brand_id_fkey'
    ) THEN
        ALTER TABLE brand_settings
            ADD CONSTRAINT brand_settings_brand_id_fkey 
            FOREIGN KEY (brand_id) REFERENCES brand_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brand_settings_brand_id ON brand_settings(brand_id);

-- Add comments
COMMENT ON TABLE brand_settings IS 'Brand preferences and settings (notifications, dashboard, certificates, events)';
COMMENT ON COLUMN brand_settings.brand_id IS 'Reference to brand profile';
COMMENT ON COLUMN brand_settings.settings IS 'JSON object containing brand settings and preferences';

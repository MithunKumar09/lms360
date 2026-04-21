-- ============================================================================
-- Migration: 063_payout_settings_schema.sql
-- Description: Payout settings and automatic payout threshold configuration
-- Created: 2025-01-XX
-- Dependencies: 039_payment_schema.sql, 043_organization_accounts_balances.sql, 044_superadmin_accounts_balances.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - payout_settings: Configure automatic payout thresholds and settings per entity (vendor, organization, superadmin)
-- 
-- ============================================================================

-- Payout entity type enum
DO $$ BEGIN
    CREATE TYPE payout_entity_type AS ENUM ('vendor', 'organization', 'superadmin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- payout_settings table
-- Stores automatic payout threshold and settings configuration
CREATE TABLE IF NOT EXISTS payout_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Entity identification (one of: vendor_account_id, organization_account_id, superadmin_account_id)
    entity_type payout_entity_type NOT NULL,
    vendor_account_id UUID NULL REFERENCES vendor_accounts(id) ON DELETE CASCADE,
    organization_account_id UUID NULL REFERENCES organization_accounts(id) ON DELETE CASCADE,
    superadmin_account_id UUID NULL REFERENCES superadmin_accounts(id) ON DELETE CASCADE,
    
    -- Automatic payout settings
    enabled BOOLEAN NOT NULL DEFAULT false, -- Whether automatic payouts are enabled
    threshold_amount DECIMAL(10, 2) NOT NULL DEFAULT 1000.00 CHECK (threshold_amount > 0), -- Minimum balance to trigger payout
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    
    -- Payout mode settings
    default_mode VARCHAR(50) NOT NULL DEFAULT 'NEFT', -- 'NEFT', 'IMPS', 'RTGS'
    
    -- Schedule settings
    schedule_type VARCHAR(50) NOT NULL DEFAULT 'threshold', -- 'threshold', 'daily', 'weekly', 'monthly'
    schedule_day INTEGER NULL CHECK (schedule_day IS NULL OR (schedule_day >= 1 AND schedule_day <= 31)), -- Day of month for monthly schedule
    schedule_day_of_week INTEGER NULL CHECK (schedule_day_of_week IS NULL OR (schedule_day_of_week >= 0 AND schedule_day_of_week <= 6)), -- 0=Sunday, 6=Saturday for weekly
    
    -- Limits and constraints
    min_payout_amount DECIMAL(10, 2) NOT NULL DEFAULT 100.00 CHECK (min_payout_amount > 0),
    max_payout_amount DECIMAL(10, 2) NULL CHECK (max_payout_amount IS NULL OR max_payout_amount > 0),
    
    -- Metadata
    notes TEXT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT payout_settings_entity_check CHECK (
        (entity_type = 'vendor' AND vendor_account_id IS NOT NULL AND organization_account_id IS NULL AND superadmin_account_id IS NULL) OR
        (entity_type = 'organization' AND organization_account_id IS NOT NULL AND vendor_account_id IS NULL AND superadmin_account_id IS NULL) OR
        (entity_type = 'superadmin' AND superadmin_account_id IS NOT NULL AND vendor_account_id IS NULL AND organization_account_id IS NULL)
    ),
    CONSTRAINT payout_settings_threshold_check CHECK (threshold_amount >= min_payout_amount)
);

-- Indexes for payout_settings
CREATE INDEX IF NOT EXISTS idx_payout_settings_vendor_account_id ON payout_settings(vendor_account_id) WHERE vendor_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payout_settings_organization_account_id ON payout_settings(organization_account_id) WHERE organization_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payout_settings_superadmin_account_id ON payout_settings(superadmin_account_id) WHERE superadmin_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payout_settings_entity_type ON payout_settings(entity_type);
CREATE INDEX IF NOT EXISTS idx_payout_settings_enabled ON payout_settings(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_payout_settings_created_at ON payout_settings(created_at DESC);

-- Unique constraint: One setting per entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_settings_vendor_unique ON payout_settings(vendor_account_id) WHERE vendor_account_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_settings_organization_unique ON payout_settings(organization_account_id) WHERE organization_account_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_settings_superadmin_unique ON payout_settings(superadmin_account_id) WHERE superadmin_account_id IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on row update
DROP TRIGGER IF EXISTS trigger_update_payout_settings_updated_at ON payout_settings;
CREATE TRIGGER trigger_update_payout_settings_updated_at
    BEFORE UPDATE ON payout_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE payout_settings IS 'Configuration for automatic payout thresholds and schedules';
COMMENT ON COLUMN payout_settings.entity_type IS 'Type of entity: vendor, organization, or superadmin';
COMMENT ON COLUMN payout_settings.enabled IS 'Whether automatic payouts are enabled for this entity';
COMMENT ON COLUMN payout_settings.threshold_amount IS 'Minimum withdrawable balance required to trigger automatic payout';
COMMENT ON COLUMN payout_settings.schedule_type IS 'Schedule type: threshold (when balance exceeds), daily, weekly, or monthly';
COMMENT ON COLUMN payout_settings.schedule_day IS 'Day of month (1-31) for monthly schedule';
COMMENT ON COLUMN payout_settings.schedule_day_of_week IS 'Day of week (0=Sunday, 6=Saturday) for weekly schedule';
COMMENT ON COLUMN payout_settings.min_payout_amount IS 'Minimum amount per payout transaction';
COMMENT ON COLUMN payout_settings.max_payout_amount IS 'Maximum amount per payout transaction (NULL = no limit)';

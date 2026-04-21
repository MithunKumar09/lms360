-- ============================================================================
-- Migration: 046_update_payouts_table.sql
-- Description: Update payouts table to support organization and superadmin payouts
-- Created: 2025-01-27
-- Dependencies: 039_payment_schema.sql, 043_organization_accounts_balances.sql, 044_superadmin_accounts_balances.sql
-- ============================================================================
-- 
-- This migration updates the payouts table to support:
-- - organization_account_id: For organization payouts (admin/instructor content)
-- - superadmin_account_id: For superadmin payouts (superadmin content)
--
-- Adds constraint: exactly one of vendor_account_id, organization_account_id, or superadmin_account_id must be set
-- ============================================================================

-- Make vendor_account_id nullable (it's currently NOT NULL but needs to be nullable for the mutual exclusivity constraint)
DO $$ BEGIN
    ALTER TABLE payouts ALTER COLUMN vendor_account_id DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Column might already be nullable or error occurred, continue
        NULL;
END $$;

-- Add organization_account_id column
DO $$ BEGIN
    ALTER TABLE payouts ADD COLUMN IF NOT EXISTS organization_account_id UUID NULL REFERENCES organization_accounts(id) ON DELETE RESTRICT;
    CREATE INDEX IF NOT EXISTS idx_payouts_organization_account_id ON payouts(organization_account_id) WHERE organization_account_id IS NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add superadmin_account_id column
DO $$ BEGIN
    ALTER TABLE payouts ADD COLUMN IF NOT EXISTS superadmin_account_id UUID NULL REFERENCES superadmin_accounts(id) ON DELETE RESTRICT;
    CREATE INDEX IF NOT EXISTS idx_payouts_superadmin_account_id ON payouts(superadmin_account_id) WHERE superadmin_account_id IS NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add CHECK constraint: exactly one of vendor_account_id, organization_account_id, or superadmin_account_id must be set
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_account_id_check;
ALTER TABLE payouts ADD CONSTRAINT payouts_account_id_check 
    CHECK (
        (vendor_account_id IS NOT NULL AND organization_account_id IS NULL AND superadmin_account_id IS NULL) OR
        (vendor_account_id IS NULL AND organization_account_id IS NOT NULL AND superadmin_account_id IS NULL) OR
        (vendor_account_id IS NULL AND organization_account_id IS NULL AND superadmin_account_id IS NOT NULL)
    );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN payouts.vendor_account_id IS 'Vendor account ID for vendor payouts (mutually exclusive with organization_account_id and superadmin_account_id)';
COMMENT ON COLUMN payouts.organization_account_id IS 'Organization account ID for organization payouts (mutually exclusive with vendor_account_id and superadmin_account_id)';
COMMENT ON COLUMN payouts.superadmin_account_id IS 'Superadmin account ID for superadmin payouts (mutually exclusive with vendor_account_id and organization_account_id)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


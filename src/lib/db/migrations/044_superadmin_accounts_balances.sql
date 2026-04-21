-- ============================================================================
-- Migration: 044_superadmin_accounts_balances.sql
-- Description: Superadmin accounts and balances schema for payment settlements
-- Created: 2025-01-27
-- Dependencies: 039_payment_schema.sql, 004_users_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - superadmin_accounts: Superadmin RazorpayX account details and KYC status
-- - superadmin_balances: Superadmin balance snapshots (withdrawable, pending, on_hold)
--
-- Similar structure to vendor_accounts and vendor_balances for consistency
-- Superadmin payments bypass organizations and go directly to superadmin
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. superadmin_accounts table
-- Holds linked_account_id, fund_account_id, kyc_status for superadmin
CREATE TABLE IF NOT EXISTS superadmin_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Ensure user is superadmin (enforced at application level, not DB constraint)
    -- RazorpayX account details
    linked_account_id VARCHAR(255) NULL UNIQUE, -- RazorpayX linked account ID
    fund_account_id VARCHAR(255) NULL UNIQUE, -- RazorpayX fund account ID
    
    -- KYC status
    kyc_status kyc_status NOT NULL DEFAULT 'not_submitted',
    kyc_submitted_at TIMESTAMP WITH TIME ZONE NULL,
    kyc_verified_at TIMESTAMP WITH TIME ZONE NULL,
    kyc_rejection_reason TEXT NULL,
    
    -- Bank details (encrypted or reference only - do not store sensitive data)
    bank_account_number_hash VARCHAR(255) NULL, -- Hashed for verification only
    bank_ifsc_code VARCHAR(11) NULL,
    bank_name VARCHAR(255) NULL,
    account_holder_name VARCHAR(255) NULL,
    
    -- Currency
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    
    -- Razorpay metadata
    razorpay_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for superadmin_accounts
CREATE INDEX IF NOT EXISTS idx_superadmin_accounts_user_id ON superadmin_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_superadmin_accounts_kyc_status ON superadmin_accounts(kyc_status);
CREATE INDEX IF NOT EXISTS idx_superadmin_accounts_linked_account_id ON superadmin_accounts(linked_account_id) WHERE linked_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_superadmin_accounts_fund_account_id ON superadmin_accounts(fund_account_id) WHERE fund_account_id IS NOT NULL;

-- 2. superadmin_balances table
-- Ledger snapshots (withdrawable, pending, on_hold)
CREATE TABLE IF NOT EXISTS superadmin_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    superadmin_account_id UUID NOT NULL REFERENCES superadmin_accounts(id) ON DELETE CASCADE,
    
    -- Balance amounts (in paise/smallest currency unit, stored as DECIMAL)
    withdrawable_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (withdrawable_amount >= 0),
    pending_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (pending_amount >= 0),
    on_hold_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (on_hold_amount >= 0),
    
    -- Currency
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    
    -- Snapshot timestamp
    snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for superadmin_balances
CREATE INDEX IF NOT EXISTS idx_superadmin_balances_superadmin_account_id ON superadmin_balances(superadmin_account_id);
CREATE INDEX IF NOT EXISTS idx_superadmin_balances_snapshot_at ON superadmin_balances(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_superadmin_balances_created_at ON superadmin_balances(created_at DESC);

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

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_superadmin_accounts_updated_at ON superadmin_accounts;
CREATE TRIGGER trigger_update_superadmin_accounts_updated_at
    BEFORE UPDATE ON superadmin_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_superadmin_balances_updated_at ON superadmin_balances;
CREATE TRIGGER trigger_update_superadmin_balances_updated_at
    BEFORE UPDATE ON superadmin_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE superadmin_accounts IS 'Superadmin RazorpayX account details and KYC status for payment settlements (bypasses organizations)';
COMMENT ON TABLE superadmin_balances IS 'Superadmin balance snapshots (withdrawable, pending, on_hold) for financial tracking';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


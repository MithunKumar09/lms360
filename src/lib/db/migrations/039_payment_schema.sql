-- ============================================================================
-- Migration: 039_payment_schema.sql
-- Description: Payment integration schema for Razorpay (Orders, Payments, Splits, Payouts, Settlements)
-- Created: 2025-01-XX
-- Dependencies: 001_initial_schema.sql, 004_users_schema.sql, 002_organizations_schema.sql, 011_courses_schema.sql, 032_events_workshops_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - orders: Links orders to razorpay_order_id and item metadata
-- - payments: Stores razorpay_payment_id, status, method, amount
-- - payment_splits: Per-payment split lines (platform, vendor, tax, etc.)
-- - vendor_accounts: Holds linked_account_id, fund_account_id, kyc_status
-- - vendor_balances: Ledger snapshots (withdrawable, pending, on_hold)
-- - payouts: Payouts history from RazorpayX
-- - settlements: Settlement records from Razorpay
-- - refunds: Refund history
-- - webhook_logs: Raw webhook events + processing status
--
-- Supports Razorpay Payments + Orders + Route + RazorpayX integration
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Order status enum
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('created', 'paid', 'failed', 'cancelled', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment status enum
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('created', 'authorized', 'captured', 'refunded', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment method enum
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('card', 'netbanking', 'wallet', 'upi', 'emi', 'cardless_emi', 'paylater');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Item type enum (for orders)
DO $$ BEGIN
    CREATE TYPE item_type AS ENUM ('course', 'event', 'workshop', 'bundle');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Split status enum
DO $$ BEGIN
    CREATE TYPE split_status AS ENUM ('pending', 'settled', 'on_hold', 'reversed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- KYC status enum
DO $$ BEGIN
    CREATE TYPE kyc_status AS ENUM ('not_submitted', 'pending', 'verified', 'rejected', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payout status enum
DO $$ BEGIN
    CREATE TYPE payout_status AS ENUM ('queued', 'processing', 'processed', 'failed', 'cancelled', 'reversed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Settlement status enum
DO $$ BEGIN
    CREATE TYPE settlement_status AS ENUM ('pending', 'processed', 'failed', 'reversed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Refund status enum
DO $$ BEGIN
    CREATE TYPE refund_status AS ENUM ('pending', 'processed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Webhook processing status enum
DO $$ BEGIN
    CREATE TYPE webhook_status AS ENUM ('pending', 'processed', 'failed', 'retrying');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. orders table
-- Links orders to razorpay_order_id and item metadata
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    razorpay_order_id VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    org_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Item information
    item_type item_type NOT NULL,
    item_id UUID NOT NULL, -- References courses.id, events.id, or workshops.id
    
    -- Pricing
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    final_amount DECIMAL(10, 2) NOT NULL CHECK (final_amount > 0),
    
    -- Status and metadata
    status order_status NOT NULL DEFAULT 'created',
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional order metadata
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    
    CONSTRAINT orders_amount_valid CHECK (final_amount = amount - discount_amount + tax_amount)
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON orders(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_item ON orders(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 2. payments table
-- Stores razorpay_payment_id, status, method, amount
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    razorpay_payment_id VARCHAR(255) NOT NULL UNIQUE,
    razorpay_order_id VARCHAR(255) NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    
    -- Payment details
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status payment_status NOT NULL DEFAULT 'created',
    method payment_method NULL,
    
    -- Razorpay metadata
    razorpay_signature TEXT NULL,
    razorpay_notes JSONB DEFAULT '{}'::jsonb,
    razorpay_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE NULL,
    
    CONSTRAINT payments_amount_positive CHECK (amount > 0)
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- 3. payment_splits table
-- Per-payment split lines (platform, vendor, tax, etc.)
CREATE TABLE IF NOT EXISTS payment_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Split details
    entity_type VARCHAR(50) NOT NULL, -- 'platform', 'vendor', 'tax', 'fee'
    entity_id UUID NULL, -- vendor_id for vendor splits, NULL for platform/tax
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    percentage DECIMAL(5, 2) NULL CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),
    
    -- Status
    status split_status NOT NULL DEFAULT 'pending',
    
    -- Settlement tracking
    settlement_id UUID NULL, -- References settlements.id when settled
    settled_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT payment_splits_entity_type_check CHECK (entity_type IN ('platform', 'vendor', 'tax', 'fee'))
);

-- Indexes for payment_splits
CREATE INDEX IF NOT EXISTS idx_payment_splits_payment_id ON payment_splits(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_order_id ON payment_splits(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_entity ON payment_splits(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_splits_status ON payment_splits(status);
CREATE INDEX IF NOT EXISTS idx_payment_splits_settlement_id ON payment_splits(settlement_id) WHERE settlement_id IS NOT NULL;

-- 4. vendor_accounts table
-- Holds linked_account_id, fund_account_id, kyc_status
CREATE TABLE IF NOT EXISTS vendor_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL,
    
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
    bank_ifsc VARCHAR(11) NULL,
    bank_name VARCHAR(255) NULL,
    account_holder_name VARCHAR(255) NULL,
    
    -- Razorpay metadata
    razorpay_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for vendor_accounts
CREATE INDEX IF NOT EXISTS idx_vendor_accounts_user_id ON vendor_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_accounts_org_id ON vendor_accounts(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_accounts_kyc_status ON vendor_accounts(kyc_status);
CREATE INDEX IF NOT EXISTS idx_vendor_accounts_linked_account_id ON vendor_accounts(linked_account_id) WHERE linked_account_id IS NOT NULL;

-- 5. vendor_balances table
-- Ledger snapshots (withdrawable, pending, on_hold)
CREATE TABLE IF NOT EXISTS vendor_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_account_id UUID NOT NULL REFERENCES vendor_accounts(id) ON DELETE CASCADE,
    
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

-- Indexes for vendor_balances
CREATE INDEX IF NOT EXISTS idx_vendor_balances_vendor_account_id ON vendor_balances(vendor_account_id);
CREATE INDEX IF NOT EXISTS idx_vendor_balances_snapshot_at ON vendor_balances(snapshot_at DESC);

-- 6. payouts table
-- Payouts history from RazorpayX
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    razorpay_payout_id VARCHAR(255) NULL UNIQUE, -- NULL until RazorpayX creates it
    vendor_account_id UUID NOT NULL REFERENCES vendor_accounts(id) ON DELETE RESTRICT,
    
    -- Payout details
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status payout_status NOT NULL DEFAULT 'queued',
    
    -- RazorpayX metadata
    fund_account_id VARCHAR(255) NULL,
    mode VARCHAR(50) NULL, -- 'NEFT', 'IMPS', 'RTGS', etc.
    reference_id VARCHAR(255) NULL,
    narration TEXT NULL,
    razorpay_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Failure details
    failure_reason TEXT NULL,
    failure_code VARCHAR(50) NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NULL,
    failed_at TIMESTAMP WITH TIME ZONE NULL
);

-- Indexes for payouts
CREATE INDEX IF NOT EXISTS idx_payouts_vendor_account_id ON payouts(vendor_account_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_razorpay_payout_id ON payouts(razorpay_payout_id) WHERE razorpay_payout_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at DESC);

-- 7. settlements table
-- Settlement records from Razorpay
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    razorpay_settlement_id VARCHAR(255) NOT NULL UNIQUE,
    
    -- Settlement details
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status settlement_status NOT NULL DEFAULT 'pending',
    
    -- Dates
    settled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    settled_on DATE NOT NULL, -- Settlement date (date only)
    
    -- Fees and adjustments
    fees DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (fees >= 0),
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (tax >= 0),
    
    -- Razorpay metadata
    utr VARCHAR(255) NULL, -- Unique Transaction Reference
    razorpay_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Reconciliation
    reconciled_at TIMESTAMP WITH TIME ZONE NULL,
    reconciled_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for settlements
CREATE INDEX IF NOT EXISTS idx_settlements_razorpay_settlement_id ON settlements(razorpay_settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_settled_on ON settlements(settled_on DESC);
CREATE INDEX IF NOT EXISTS idx_settlements_settled_at ON settlements(settled_at DESC);

-- 8. refunds table
-- Refund history
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    razorpay_refund_id VARCHAR(255) NOT NULL UNIQUE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    
    -- Refund details
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status refund_status NOT NULL DEFAULT 'pending',
    
    -- Refund reason
    reason TEXT NULL,
    notes TEXT NULL,
    
    -- Razorpay metadata
    razorpay_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NULL
);

-- Indexes for refunds
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_razorpay_refund_id ON refunds(razorpay_refund_id);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at DESC);

-- 9. webhook_logs table
-- Raw webhook events + processing status
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) NOT NULL UNIQUE, -- Razorpay event ID for idempotency
    event_type VARCHAR(100) NOT NULL, -- 'payment.captured', 'order.paid', etc.
    
    -- Webhook payload
    payload JSONB NOT NULL,
    signature TEXT NULL,
    signature_valid BOOLEAN NULL,
    
    -- Processing status
    status webhook_status NOT NULL DEFAULT 'pending',
    processed_at TIMESTAMP WITH TIME ZONE NULL,
    error_message TEXT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for webhook_logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON webhook_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

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
DROP TRIGGER IF EXISTS trigger_update_orders_updated_at ON orders;
CREATE TRIGGER trigger_update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_payments_updated_at ON payments;
CREATE TRIGGER trigger_update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_payment_splits_updated_at ON payment_splits;
CREATE TRIGGER trigger_update_payment_splits_updated_at
    BEFORE UPDATE ON payment_splits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_vendor_accounts_updated_at ON vendor_accounts;
CREATE TRIGGER trigger_update_vendor_accounts_updated_at
    BEFORE UPDATE ON vendor_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_vendor_balances_updated_at ON vendor_balances;
CREATE TRIGGER trigger_update_vendor_balances_updated_at
    BEFORE UPDATE ON vendor_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_payouts_updated_at ON payouts;
CREATE TRIGGER trigger_update_payouts_updated_at
    BEFORE UPDATE ON payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_settlements_updated_at ON settlements;
CREATE TRIGGER trigger_update_settlements_updated_at
    BEFORE UPDATE ON settlements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_refunds_updated_at ON refunds;
CREATE TRIGGER trigger_update_refunds_updated_at
    BEFORE UPDATE ON refunds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_webhook_logs_updated_at ON webhook_logs;
CREATE TRIGGER trigger_update_webhook_logs_updated_at
    BEFORE UPDATE ON webhook_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE orders IS 'Orders created for paid items (courses, events, workshops). Links to Razorpay orders.';
COMMENT ON TABLE payments IS 'Payment records from Razorpay. One payment per order (or multiple for retries).';
COMMENT ON TABLE payment_splits IS 'Payment splits showing platform commission, vendor share, tax breakdown.';
COMMENT ON TABLE vendor_accounts IS 'Vendor RazorpayX account details and KYC status.';
COMMENT ON TABLE vendor_balances IS 'Vendor balance snapshots (withdrawable, pending, on_hold).';
COMMENT ON TABLE payouts IS 'Payout history from RazorpayX to vendor bank accounts.';
COMMENT ON TABLE settlements IS 'Settlement records from Razorpay (daily bank deposits).';
COMMENT ON TABLE refunds IS 'Refund history for payments.';
COMMENT ON TABLE webhook_logs IS 'Raw webhook events from Razorpay with processing status.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


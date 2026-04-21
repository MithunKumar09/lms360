-- ============================================================================
-- Migration: 041_payment_enhancements.sql
-- Description: Payment enhancements - Coupons, Reconciliation Exceptions, Commission Rules, Tax Rules, Audit Logs
-- Created: 2025-01-XX
-- Dependencies: 039_payment_schema.sql, 011_courses_schema.sql, 002_organizations_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - reconciliation_exceptions: Track settlement mismatches with detailed exception data
-- - coupons: Store discount codes with validation rules
-- - coupon_redemptions: Track coupon usage per user/order
-- - commission_rules: Configurable commission rules (global, org-level, course-level)
-- - tax_rules: Configurable tax rules (by country/state, item type)
-- - payment_audit_logs: Audit trail for all payment-related actions
--
-- Also updates existing tables:
-- - orders: Add coupon_id column
-- - payment_splits: Add commission_rule_id and tax_rule_id columns
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Coupon type enum
DO $$ BEGIN
    CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed_amount');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Coupon status enum
DO $$ BEGIN
    CREATE TYPE coupon_status AS ENUM ('active', 'inactive', 'expired', 'deleted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Reconciliation exception status enum
DO $$ BEGIN
    CREATE TYPE reconciliation_exception_status AS ENUM ('open', 'resolved', 'ignored');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Commission rule scope enum
DO $$ BEGIN
    CREATE TYPE commission_rule_scope AS ENUM ('global', 'organization', 'course');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tax rule type enum
DO $$ BEGIN
    CREATE TYPE tax_rule_type AS ENUM ('gst', 'vat', 'sales_tax', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment audit action enum
DO $$ BEGIN
    CREATE TYPE payment_audit_action AS ENUM (
        'order_created', 'order_updated', 'order_cancelled',
        'payment_captured', 'payment_failed', 'payment_refunded',
        'refund_created', 'refund_processed',
        'payout_created', 'payout_processed', 'payout_failed',
        'settlement_processed', 'settlement_reconciled',
        'commission_rule_created', 'commission_rule_updated', 'commission_rule_deleted',
        'tax_rule_created', 'tax_rule_updated', 'tax_rule_deleted',
        'coupon_applied', 'coupon_created', 'coupon_updated', 'coupon_deleted',
        'vendor_balance_updated', 'reconciliation_exception_created', 'reconciliation_exception_resolved'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. reconciliation_exceptions table
-- Track settlement mismatches with detailed exception data
CREATE TABLE IF NOT EXISTS reconciliation_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    
    -- Exception details
    expected_amount DECIMAL(12, 2) NOT NULL,
    actual_amount DECIMAL(12, 2) NOT NULL,
    difference DECIMAL(12, 2) NOT NULL,
    status reconciliation_exception_status NOT NULL DEFAULT 'open',
    
    -- Exception metadata
    exception_type VARCHAR(100) NULL, -- 'amount_mismatch', 'missing_payment', 'extra_payment', etc.
    description TEXT NULL,
    notes TEXT NULL,
    
    -- Resolution
    resolved_at TIMESTAMP WITH TIME ZONE NULL,
    resolved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for reconciliation_exceptions
CREATE INDEX IF NOT EXISTS idx_reconciliation_exceptions_settlement_id ON reconciliation_exceptions(settlement_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_exceptions_status ON reconciliation_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_exceptions_created_at ON reconciliation_exceptions(created_at DESC);

-- 2. coupons table
-- Store discount codes with validation rules
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Coupon details
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    
    -- Discount configuration
    type coupon_type NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
    max_discount_amount DECIMAL(10, 2) NULL, -- For percentage coupons
    
    -- Validity
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    status coupon_status NOT NULL DEFAULT 'active',
    
    -- Usage limits
    max_uses INTEGER NULL CHECK (max_uses > 0), -- Total uses across all users
    max_uses_per_user INTEGER NULL DEFAULT 1 CHECK (max_uses_per_user > 0), -- Per user limit
    
    -- Applicability
    min_order_amount DECIMAL(10, 2) NULL CHECK (min_order_amount >= 0),
    applicable_item_types item_type[] NULL, -- NULL means all types
    applicable_org_ids UUID[] NULL, -- NULL means all orgs
    applicable_course_ids UUID[] NULL, -- NULL means all courses
    
    -- Metadata
    created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    
    CONSTRAINT coupons_valid_until_after_valid_from CHECK (valid_until > valid_from)
);

-- Indexes for coupons
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_coupons_valid_dates ON coupons(valid_from, valid_until) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_coupons_created_at ON coupons(created_at DESC) WHERE deleted_at IS NULL;

-- 3. coupon_redemptions table
-- Track coupon usage per user/order
CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Redemption details
    discount_amount DECIMAL(10, 2) NOT NULL CHECK (discount_amount > 0),
    order_amount_before_discount DECIMAL(10, 2) NOT NULL,
    order_amount_after_discount DECIMAL(10, 2) NOT NULL,
    
    -- Timestamps
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Ensure one coupon per order
    UNIQUE(order_id)
);

-- Indexes for coupon_redemptions
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id ON coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_order_id ON coupon_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_id ON coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_redeemed_at ON coupon_redemptions(redeemed_at DESC);

-- 4. commission_rules table
-- Configurable commission rules (global, org-level, course-level)
CREATE TABLE IF NOT EXISTS commission_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Rule scope
    scope commission_rule_scope NOT NULL,
    org_id UUID NULL REFERENCES organizations(id) ON DELETE CASCADE, -- For organization scope
    course_id UUID NULL REFERENCES courses(id) ON DELETE CASCADE, -- For course scope
    
    -- Commission configuration
    platform_percentage DECIMAL(5, 2) NOT NULL CHECK (platform_percentage >= 0 AND platform_percentage <= 100),
    platform_fixed_fee_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (platform_fixed_fee_percentage >= 0 AND platform_fixed_fee_percentage <= 100),
    platform_fixed_fee_amount DECIMAL(10, 2) NULL CHECK (platform_fixed_fee_amount >= 0),
    
    -- Rule metadata
    name VARCHAR(255) NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 0, -- Higher priority rules override lower priority
    
    -- Validity
    valid_from TIMESTAMP WITH TIME ZONE NULL,
    valid_until TIMESTAMP WITH TIME ZONE NULL,
    
    -- Metadata
    created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Constraints
    CONSTRAINT commission_rules_scope_org_check CHECK (
        (scope = 'organization' AND org_id IS NOT NULL) OR
        (scope != 'organization' AND org_id IS NULL)
    ),
    CONSTRAINT commission_rules_scope_course_check CHECK (
        (scope = 'course' AND course_id IS NOT NULL) OR
        (scope != 'course' AND course_id IS NULL)
    ),
    CONSTRAINT commission_rules_valid_until_after_valid_from CHECK (
        valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from
    )
);

-- Indexes for commission_rules
CREATE INDEX IF NOT EXISTS idx_commission_rules_scope ON commission_rules(scope) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_commission_rules_org_id ON commission_rules(org_id) WHERE org_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_commission_rules_course_id ON commission_rules(course_id) WHERE course_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_commission_rules_active ON commission_rules(is_active, priority DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_commission_rules_valid_dates ON commission_rules(valid_from, valid_until) WHERE deleted_at IS NULL;

-- 5. tax_rules table
-- Configurable tax rules (by country/state, item type)
CREATE TABLE IF NOT EXISTS tax_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Tax configuration
    type tax_rule_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    
    -- Tax rate
    rate DECIMAL(5, 2) NOT NULL CHECK (rate >= 0 AND rate <= 100), -- Percentage
    
    -- Applicability
    country VARCHAR(2) NULL, -- ISO 3166-1 alpha-2 country code
    state VARCHAR(100) NULL, -- State/province name
    applicable_item_types item_type[] NULL, -- NULL means all types
    
    -- Rule metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 0, -- Higher priority rules override lower priority
    
    -- Validity
    valid_from TIMESTAMP WITH TIME ZONE NULL,
    valid_until TIMESTAMP WITH TIME ZONE NULL,
    
    -- Metadata
    created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Constraints
    CONSTRAINT tax_rules_valid_until_after_valid_from CHECK (
        valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from
    )
);

-- Indexes for tax_rules
CREATE INDEX IF NOT EXISTS idx_tax_rules_type ON tax_rules(type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tax_rules_country_state ON tax_rules(country, state) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tax_rules_active ON tax_rules(is_active, priority DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tax_rules_valid_dates ON tax_rules(valid_from, valid_until) WHERE deleted_at IS NULL;

-- 6. payment_audit_logs table
-- Audit trail for all payment-related actions
CREATE TABLE IF NOT EXISTS payment_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Action details
    action payment_audit_action NOT NULL,
    actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(50) NULL,
    actor_email VARCHAR(255) NULL,
    
    -- Target details
    target_type VARCHAR(100) NULL, -- 'order', 'payment', 'refund', 'payout', etc.
    target_id UUID NULL,
    
    -- Related entities
    order_id UUID NULL REFERENCES orders(id) ON DELETE SET NULL,
    payment_id UUID NULL REFERENCES payments(id) ON DELETE SET NULL,
    refund_id UUID NULL REFERENCES refunds(id) ON DELETE SET NULL,
    payout_id UUID NULL REFERENCES payouts(id) ON DELETE SET NULL,
    
    -- Action metadata
    description TEXT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Request context
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for payment_audit_logs
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_action ON payment_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_actor_id ON payment_audit_logs(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_target ON payment_audit_logs(target_type, target_id) WHERE target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_order_id ON payment_audit_logs(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_payment_id ON payment_audit_logs(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_created_at ON payment_audit_logs(created_at DESC);

-- ============================================================================
-- UPDATE EXISTING TABLES
-- ============================================================================

-- Add coupon_id to orders table
DO $$ BEGIN
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id UUID NULL REFERENCES coupons(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_coupon_id ON orders(coupon_id) WHERE coupon_id IS NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add commission_rule_id and tax_rule_id to payment_splits table
DO $$ BEGIN
    ALTER TABLE payment_splits ADD COLUMN IF NOT EXISTS commission_rule_id UUID NULL REFERENCES commission_rules(id) ON DELETE SET NULL;
    ALTER TABLE payment_splits ADD COLUMN IF NOT EXISTS tax_rule_id UUID NULL REFERENCES tax_rules(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_payment_splits_commission_rule_id ON payment_splits(commission_rule_id) WHERE commission_rule_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_payment_splits_tax_rule_id ON payment_splits(tax_rule_id) WHERE tax_rule_id IS NOT NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

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
DROP TRIGGER IF EXISTS trigger_update_reconciliation_exceptions_updated_at ON reconciliation_exceptions;
CREATE TRIGGER trigger_update_reconciliation_exceptions_updated_at
    BEFORE UPDATE ON reconciliation_exceptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_coupons_updated_at ON coupons;
CREATE TRIGGER trigger_update_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_commission_rules_updated_at ON commission_rules;
CREATE TRIGGER trigger_update_commission_rules_updated_at
    BEFORE UPDATE ON commission_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_tax_rules_updated_at ON tax_rules;
CREATE TRIGGER trigger_update_tax_rules_updated_at
    BEFORE UPDATE ON tax_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE reconciliation_exceptions IS 'Tracks settlement mismatches and reconciliation exceptions for financial auditing';
COMMENT ON TABLE coupons IS 'Discount codes and promotional coupons with validation rules and usage limits';
COMMENT ON TABLE coupon_redemptions IS 'Tracks coupon usage per user and order for analytics and validation';
COMMENT ON TABLE commission_rules IS 'Configurable commission rules at global, organization, or course level';
COMMENT ON TABLE tax_rules IS 'Configurable tax rules by location (country/state) and item type';
COMMENT ON TABLE payment_audit_logs IS 'Audit trail for all payment-related actions for compliance and debugging';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


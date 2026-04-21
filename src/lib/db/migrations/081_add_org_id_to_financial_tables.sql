-- Migration: 081_add_org_id_to_financial_tables.sql
-- Phase E — Add org_id to financial/payment tables
-- ADDITIVE ONLY: nullable columns + partial indexes.
-- orders and vendor_accounts already have org_id (correct parent tables).

DO $$ BEGIN
    ALTER TABLE payments ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE payment_splits ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE payouts ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE settlements ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE refunds ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE vendor_balances ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE organization_balances ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE webhook_logs ADD COLUMN org_id UUID NULL
        REFERENCES organizations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ROLLBACK:
-- ALTER TABLE webhook_logs DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE organization_balances DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE vendor_balances DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE refunds DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE settlements DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE payouts DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE payment_splits DROP COLUMN IF EXISTS org_id;
-- ALTER TABLE payments DROP COLUMN IF EXISTS org_id;

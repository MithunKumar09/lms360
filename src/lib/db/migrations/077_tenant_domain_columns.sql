-- Migration: 077_tenant_domain_columns.sql
-- Phase A — Add multi-tenant domain support to organizations table
-- Also adds: domain_verification_token, deleted_at (required by Phase B/Gap 4/Gap 8)
-- All changes are ADDITIVE ONLY: no NOT NULL constraints, no breaking changes.
-- Existing application code that reads organizations is fully unaffected.

-- 1. Subdomain column (e.g., 'acme' → acme.edurock.com)
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN subdomain VARCHAR(120) NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 2. Custom verified domain (e.g., 'portal.acme.com')
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN custom_domain VARCHAR(253) NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 3. Whether custom_domain has passed DNS TXT verification
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN domain_verified BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 4. SSL certificate lifecycle status for custom domain
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN ssl_status VARCHAR(20) NOT NULL DEFAULT 'pending';
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 5. Timestamp when domain was verified
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN domain_verified_at TIMESTAMPTZ NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 6. Plan tier — 'basic' (subdomain only) vs 'pro' (custom domain allowed)
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN plan_tier VARCHAR(20) NOT NULL DEFAULT 'basic';
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 7. Random token used for DNS TXT record verification (Gap 4)
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN domain_verification_token VARCHAR(64) NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 8. Soft-delete timestamp — set when org is deleted (Gap 8)
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN deleted_at TIMESTAMPTZ NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 9. Cloudflare Custom Hostname ID — stored after SSL provisioning is triggered (Gap 4)
--    Used by sslProvisioningJob to poll Cloudflare for active/failed status transitions.
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN ssl_cloudflare_hostname_id VARCHAR(64) NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- Constraints
DO $$ BEGIN
    ALTER TABLE organizations ADD CONSTRAINT organizations_ssl_status_check
        CHECK (ssl_status IN ('pending', 'provisioning', 'active', 'failed'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE organizations ADD CONSTRAINT organizations_subdomain_format
        CHECK (subdomain IS NULL OR subdomain ~* '^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE organizations ADD CONSTRAINT organizations_plan_tier_check
        CHECK (plan_tier IN ('basic', 'pro', 'enterprise'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Indexes for the hot-path tenant resolver lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_subdomain
    ON organizations(subdomain)
    WHERE subdomain IS NOT NULL;

-- Custom domain index: only unique among verified domains
-- (unverified domains can "claim" without being routable — prevents squatting attacks)
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_custom_domain_verified
    ON organizations(custom_domain)
    WHERE custom_domain IS NOT NULL AND domain_verified = true;

-- Composite index used by tenant resolver on every request (hot path)
CREATE INDEX IF NOT EXISTS idx_organizations_domain_resolution
    ON organizations(subdomain, status)
    WHERE subdomain IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_custom_domain_resolution
    ON organizations(custom_domain, domain_verified, status)
    WHERE custom_domain IS NOT NULL AND deleted_at IS NULL;

-- Soft-delete index for hard-delete cron job
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at
    ON organizations(deleted_at)
    WHERE deleted_at IS NOT NULL;

-- Backfill: set subdomain = slug for all active orgs that have a slug
-- This is idempotent — only sets NULL rows
UPDATE organizations
SET subdomain = slug
WHERE subdomain IS NULL
  AND slug IS NOT NULL
  AND status = 'active'
  AND deleted_at IS NULL;

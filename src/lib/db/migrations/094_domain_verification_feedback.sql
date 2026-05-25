-- Migration: 094_domain_verification_feedback.sql
-- Adds diagnostic feedback columns for domain verification observability,
-- a DB-level ssl_status enum constraint (idempotent), and a non-partial
-- unique index on custom_domain to prevent concurrent claim races.
-- All changes are ADDITIVE ONLY: no NOT NULL constraints, no breaking changes.

-- 1. Attempt counter: incremented every time the verification job checks this org.
--    Stops checking after 50 attempts (F9-B) to avoid infinite DNS lookups.
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN domain_verification_attempts INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 2. Timestamp of the most recent verification check (verified or not).
--    Exposed via GET /api/admin/settings/custom-domain for UI feedback.
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN domain_verification_last_checked_at TIMESTAMPTZ NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 3. Last SSL provisioning error message from Cloudflare (cleared on success).
--    Displayed in OrgDomainPanel for superadmin diagnosis.
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN domain_ssl_error TEXT NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 4. ssl_status enum constraint (idempotent).
--    Only enforces allowed values; lifecycle transitions stay in application layer.
--    Composite CHECK constraints are intentionally avoided: domain_verified=false +
--    ssl_status=failed is a valid recovery/rollback state and must not be blocked.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_domain_ssl_status_values'
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT chk_domain_ssl_status_values
      CHECK (ssl_status IN ('pending', 'provisioning', 'active', 'failed'));
  END IF;
END $$;

-- 5. Non-partial unique index on custom_domain.
--    Prevents two orgs from claiming the same domain simultaneously (TOCTOU race).
--    The existing partial index (verified-only) is not enough: two concurrent
--    unverified claims would both pass the SELECT check and both UPDATE, then
--    only the first to verify would succeed — the second gets a silent job failure.
--    This index enforces exclusivity at claim time (domain can only belong to one org).
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_custom_domain_claim
    ON organizations(custom_domain)
    WHERE custom_domain IS NOT NULL;

-- Migration: 095_domain_verification_diagnostics.sql
-- Adds persistent diagnostic columns for domain verification observability.
-- Populated by domainVerificationJob on every DNS check failure (error or token mismatch).
-- All changes are ADDITIVE ONLY: no NOT NULL constraints, no breaking changes.

-- 1. Human-readable reason why verification is still pending.
--    Set on DNS error or TXT token mismatch; cleared implicitly when domain_verified=true.
--    Surfaced via superadmin UI and GET /api/admin/settings/custom-domain for diagnosis.
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN last_verification_failure_reason TEXT NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 2. Raw DNS response from the last verification check.
--    Stores JSON array of TXT records found, or the DNS error code string (e.g. ENODATA).
--    Enables support to see exactly what DNS returned without needing Vercel log access.
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN last_dns_response TEXT NULL;
EXCEPTION WHEN duplicate_column THEN null; END $$;

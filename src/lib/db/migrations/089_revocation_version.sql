-- Migration: 089_revocation_version.sql
-- Adds revocation_version to organizations and users.
--
-- Purpose:
--   Enables instant session invalidation without a per-request DB query.
--   On org suspension or user role/org removal, increment the relevant
--   revocation_version. The JWT stores rv (user) and org_rv (org) at mint
--   time. Middleware compares token values against the current version from
--   the tenant-resolve cache; a lower token value means the session is stale.
--
--   Using an integer counter (not a timestamp) avoids clock-skew in
--   distributed deployments and is faster to compare.
--
-- Safe migration:
--   - ADD COLUMN IF NOT EXISTS: idempotent; safe to re-run
--   - DEFAULT 0: all existing rows get version 0; existing JWTs have rv=0
--     implied (token field absent), so they are accepted until first
--     revocation event (version incremented to 1)
--   - Indexes are narrow (id + version) for hot-path point lookups
--
-- ROLLBACK (run manually if needed):
--   DROP INDEX IF EXISTS idx_users_id_rv;
--   ALTER TABLE organizations DROP COLUMN IF EXISTS revocation_version;
--   ALTER TABLE users        DROP COLUMN IF EXISTS revocation_version;

BEGIN;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS revocation_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS revocation_version INTEGER NOT NULL DEFAULT 0;

-- Index for fast org rv lookup (used by tenant-resolve API on every cache miss)
-- organizations.id already has PK index
-- no extra revocation_version index required here

-- Index for user rv lookup (used by session refresh endpoint)
CREATE INDEX IF NOT EXISTS idx_users_id_rv
  ON users (id, revocation_version);

COMMIT;

-- Migration: 087_superadmin_delegation_tokens.sql
-- Gap 7 — Superadmin delegation token table for secure cross-tenant access
-- Supports: 15-min short-lived JWTs, jti-based revocation, rate limiting,
-- read_only / read_write scope enforcement, anti-cascade protection.
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS superadmin_delegation_tokens;

CREATE TABLE IF NOT EXISTS superadmin_delegation_tokens (
    -- Token unique ID (matches JWT 'jti' claim)
    jti             UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The superadmin who issued this delegation
    superadmin_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- The target organization being accessed
    target_org_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Access scope: read_only (GET only) or read_write (all methods, 2-person approval)
    scope           VARCHAR(20) NOT NULL DEFAULT 'read_only'
                    CHECK (scope IN ('read_only', 'read_write')),

    -- Lifecycle timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ NULL,          -- NULL = still valid (if not expired)
    last_used_at    TIMESTAMPTZ NULL,          -- Updated on each token use

    -- Audit: reason for access (optional free-text, shown in audit trail)
    access_reason   TEXT NULL,

    -- Constraint: expiry must be after creation
    CONSTRAINT delegation_token_expiry_after_creation
        CHECK (expires_at > created_at),

    -- Constraint: revocation must be after creation
    CONSTRAINT delegation_token_revoked_after_creation
        CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

-- Lookup by superadmin (for rate limiting: count tokens issued in last hour)
CREATE INDEX IF NOT EXISTS idx_delegation_tokens_superadmin
    ON superadmin_delegation_tokens(superadmin_id, created_at DESC)
    WHERE revoked_at IS NULL;

-- Lookup for revocation check on every proxy request (hot path)
CREATE INDEX IF NOT EXISTS idx_delegation_tokens_jti_active
    ON superadmin_delegation_tokens(jti, expires_at)
    WHERE revoked_at IS NULL;

-- Lookup active tokens per target org (for monitoring / forced revocation on suspension)
CREATE INDEX IF NOT EXISTS idx_delegation_tokens_target_org
    ON superadmin_delegation_tokens(target_org_id, revoked_at)
    WHERE revoked_at IS NULL;

-- Auto-cleanup: tokens older than 24h after expiry can be pruned by the session
-- cleanup cron without affecting audit logs (audit_events has the permanent record).
CREATE INDEX IF NOT EXISTS idx_delegation_tokens_expires
    ON superadmin_delegation_tokens(expires_at)
    WHERE revoked_at IS NULL;

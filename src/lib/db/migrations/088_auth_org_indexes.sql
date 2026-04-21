-- Partial indexes: only index rows that have an org_id (excludes superadmin/brand)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_auth_org_id
    ON user_auth(org_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_metadata_org_id
    ON user_metadata(org_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_login_audit_org_id
    ON login_audit(org_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_org_id
    ON user_sessions(org_id)
    WHERE org_id IS NOT NULL;
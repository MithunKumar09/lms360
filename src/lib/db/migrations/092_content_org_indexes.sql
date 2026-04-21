-- Indexes for high-traffic tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mentor_tasks_org_id
    ON mentor_tasks(org_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_postings_org_id
    ON job_postings(org_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_events_org_id
    ON audit_events(org_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_org_id
    ON audit_logs(org_id)
    WHERE org_id IS NOT NULL;
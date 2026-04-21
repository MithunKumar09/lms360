-- Indexes for grading-queue hot paths
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_org_id
    ON assignments(org_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignment_submissions_org_id
    ON assignment_submissions(org_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_attempts_org_id
    ON quiz_attempts(org_id)
    WHERE org_id IS NOT NULL;
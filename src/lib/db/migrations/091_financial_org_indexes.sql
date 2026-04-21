-- Indexes for financial dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_org_id
    ON payments(org_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payouts_org_id
    ON payouts(org_id)
    WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refunds_org_id
    ON refunds(org_id)
    WHERE org_id IS NOT NULL;
-- ============================================================================
-- Migration: 050_backfill_organization_balances.sql
-- Description: Backfill organization balances from existing payment splits
-- Created: 2025-01-27
-- Dependencies: 043_organization_accounts_balances.sql, 049_update_existing_payment_splits.sql
-- ============================================================================
-- 
-- This migration calculates and creates organization balance snapshots based on
-- existing payment_splits where entity_type = 'organization'.
--
-- Balance calculation:
-- - withdrawable_amount: Sum of settled splits that are past hold period (7 days)
-- - pending_amount: Sum of pending splits
-- - on_hold_amount: Sum of on_hold and reversed splits
--
-- Creates one balance snapshot per organization account
-- ============================================================================

-- Create organization balance snapshots (only for accounts without existing balances)
INSERT INTO organization_balances (
    organization_account_id,
    withdrawable_amount,
    pending_amount,
    on_hold_amount,
    created_at,
    updated_at
)
SELECT 
    oa.id AS organization_account_id,
    COALESCE(
        SUM(
            CASE 
                WHEN ps.status = 'settled' 
                 AND ps.settled_at IS NOT NULL
                 AND ps.settled_at <= CURRENT_TIMESTAMP - INTERVAL '7 days'
                THEN ps.amount
                ELSE 0
            END
        ),
        0
    ) AS withdrawable_amount,
    COALESCE(
        SUM(
            CASE 
                WHEN ps.status = 'pending'
                THEN ps.amount
                ELSE 0
            END
        ),
        0
    ) AS pending_amount,
    COALESCE(
        SUM(
            CASE 
                WHEN ps.status IN ('on_hold', 'reversed')
                THEN ps.amount
                ELSE 0
            END
        ),
        0
    ) AS on_hold_amount,
    CURRENT_TIMESTAMP AS created_at,
    CURRENT_TIMESTAMP AS updated_at
FROM organization_accounts oa
LEFT JOIN payment_splits ps ON ps.entity_type = 'organization' 
    AND ps.entity_id = oa.org_id
WHERE NOT EXISTS (
    SELECT 1 FROM organization_balances ob 
    WHERE ob.organization_account_id = oa.id
)
GROUP BY oa.id
HAVING COUNT(ps.id) > 0;  -- Only create balance if there are payment splits

-- ============================================================================
-- VERIFICATION QUERY (run separately to verify)
-- ============================================================================
-- SELECT 
--     oa.org_id,
--     o.name AS org_name,
--     ob.withdrawable_amount,
--     ob.pending_amount,
--     ob.on_hold_amount,
--     (ob.withdrawable_amount + ob.pending_amount + ob.on_hold_amount) AS total_balance
-- FROM organization_accounts oa
-- JOIN organizations o ON o.id = oa.org_id
-- LEFT JOIN organization_balances ob ON ob.organization_account_id = oa.id
-- ORDER BY o.name;
-- ============================================================================

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


-- ============================================================================
-- Migration: 051_backfill_superadmin_balances.sql
-- Description: Backfill superadmin balances from existing payment splits
-- Created: 2025-01-27
-- Dependencies: 044_superadmin_accounts_balances.sql, 049_update_existing_payment_splits.sql
-- ============================================================================
-- 
-- This migration calculates and creates superadmin balance snapshots based on
-- existing payment_splits where entity_type = 'superadmin'.
--
-- Balance calculation:
-- - withdrawable_amount: Sum of settled splits that are past hold period (7 days)
-- - pending_amount: Sum of pending splits
-- - on_hold_amount: Sum of on_hold and reversed splits
--
-- Creates one balance snapshot per superadmin account
-- ============================================================================

-- Create superadmin balance snapshots (only for accounts without existing balances)
INSERT INTO superadmin_balances (
    superadmin_account_id,
    withdrawable_amount,
    pending_amount,
    on_hold_amount,
    created_at,
    updated_at
)
SELECT 
    sa.id AS superadmin_account_id,
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
FROM superadmin_accounts sa
LEFT JOIN payment_splits ps ON ps.entity_type = 'superadmin' 
    AND ps.entity_id = sa.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM superadmin_balances sb 
    WHERE sb.superadmin_account_id = sa.id
)
GROUP BY sa.id
HAVING COUNT(ps.id) > 0;  -- Only create balance if there are payment splits

-- ============================================================================
-- VERIFICATION QUERY (run separately to verify)
-- ============================================================================
-- SELECT 
--     sa.user_id,
--     u.email,
--     sb.withdrawable_amount,
--     sb.pending_amount,
--     sb.on_hold_amount,
--     (sb.withdrawable_amount + sb.pending_amount + sb.on_hold_amount) AS total_balance
-- FROM superadmin_accounts sa
-- JOIN users u ON u.id = sa.user_id
-- LEFT JOIN superadmin_balances sb ON sb.superadmin_account_id = sa.id
-- ORDER BY u.email;
-- ============================================================================

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


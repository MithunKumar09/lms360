-- ============================================================================
-- Migration: 052_verify_migration.sql
-- Description: Verification queries for Phase 16 data migration
-- Created: 2025-01-27
-- Dependencies: 047-051 migrations
-- ============================================================================
-- 
-- This script contains verification queries to ensure the migration completed
-- successfully. Run these queries after executing migrations 047-051.
--
-- Expected results:
-- 1. All organizations have accounts
-- 2. Superadmin has account
-- 3. Payment splits are updated correctly
-- 4. Balances are calculated correctly
-- ============================================================================

-- ============================================================================
-- 1. Verify Organization Accounts
-- ============================================================================
-- Check if all organizations have accounts
SELECT 
    'Organization Accounts Check' AS check_name,
    COUNT(DISTINCT o.id) AS total_organizations,
    COUNT(DISTINCT oa.org_id) AS organizations_with_accounts,
    COUNT(DISTINCT o.id) - COUNT(DISTINCT oa.org_id) AS missing_accounts
FROM organizations o
LEFT JOIN organization_accounts oa ON oa.org_id = o.id;

-- List organizations without accounts (should be empty)
SELECT 
    o.id,
    o.name,
    o.status
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM organization_accounts oa WHERE oa.org_id = o.id
);

-- ============================================================================
-- 2. Verify Superadmin Account
-- ============================================================================
-- Check if superadmin has account
SELECT 
    'Superadmin Account Check' AS check_name,
    COUNT(DISTINCT u.id) AS total_superadmins,
    COUNT(DISTINCT sa.user_id) AS superadmins_with_accounts,
    COUNT(DISTINCT u.id) - COUNT(DISTINCT sa.user_id) AS missing_accounts
FROM users u
LEFT JOIN superadmin_accounts sa ON sa.user_id = u.id
WHERE u.role = 'superadmin';

-- List superadmins without accounts (should be empty)
SELECT 
    u.id,
    u.email,
    u.role
FROM users u
WHERE u.role = 'superadmin'
  AND NOT EXISTS (
    SELECT 1 FROM superadmin_accounts sa WHERE sa.user_id = u.id
  );

-- ============================================================================
-- 3. Verify Payment Splits
-- ============================================================================
-- Count payment splits by entity type
SELECT 
    'Payment Splits by Entity Type' AS check_name,
    ps.entity_type,
    COUNT(*) AS count,
    SUM(ps.amount) AS total_amount,
    SUM(CASE WHEN ps.status = 'settled' THEN ps.amount ELSE 0 END) AS settled_amount,
    SUM(CASE WHEN ps.status = 'pending' THEN ps.amount ELSE 0 END) AS pending_amount,
    SUM(CASE WHEN ps.status IN ('on_hold', 'reversed') THEN ps.amount ELSE 0 END) AS on_hold_amount
FROM payment_splits ps
WHERE ps.entity_type IN ('vendor', 'organization', 'superadmin')
GROUP BY ps.entity_type
ORDER BY ps.entity_type;

-- Check for payment splits that should be organization but are still vendor
SELECT 
    'Payment Splits Still Vendor (Should Be Organization)' AS check_name,
    COUNT(*) AS count
FROM payment_splits ps
JOIN orders o ON o.id = ps.order_id
JOIN courses c ON c.id = o.item_id AND o.item_type = 'course'
JOIN users u ON u.id = c.created_by
WHERE ps.entity_type = 'vendor'
  AND u.role IN ('admin', 'instructor')
  AND c.org_id IS NOT NULL;

-- Check for payment splits that should be superadmin but are still vendor
SELECT 
    'Payment Splits Still Vendor (Should Be Superadmin)' AS check_name,
    COUNT(*) AS count
FROM payment_splits ps
JOIN orders o ON o.id = ps.order_id
JOIN courses c ON c.id = o.item_id AND o.item_type = 'course'
JOIN users u ON u.id = c.created_by
WHERE ps.entity_type = 'vendor'
  AND u.role = 'superadmin';

-- ============================================================================
-- 4. Verify Organization Balances
-- ============================================================================
-- Check organization balances
SELECT 
    'Organization Balances' AS check_name,
    oa.org_id,
    o.name AS org_name,
    ob.withdrawable_amount,
    ob.pending_amount,
    ob.on_hold_amount,
    (ob.withdrawable_amount + ob.pending_amount + ob.on_hold_amount) AS total_balance,
    (
        SELECT COALESCE(SUM(ps.amount), 0)
        FROM payment_splits ps
        WHERE ps.entity_type = 'organization' AND ps.entity_id = oa.org_id
    ) AS calculated_total
FROM organization_accounts oa
JOIN organizations o ON o.id = oa.org_id
LEFT JOIN organization_balances ob ON ob.organization_account_id = oa.id
ORDER BY o.name;

-- Check for organizations with payment splits but no balance
SELECT 
    'Organizations With Splits But No Balance' AS check_name,
    oa.org_id,
    o.name AS org_name,
    COUNT(ps.id) AS split_count,
    SUM(ps.amount) AS total_amount
FROM organization_accounts oa
JOIN organizations o ON o.id = oa.org_id
JOIN payment_splits ps ON ps.entity_type = 'organization' AND ps.entity_id = oa.org_id
WHERE NOT EXISTS (
    SELECT 1 FROM organization_balances ob 
    WHERE ob.organization_account_id = oa.id
)
GROUP BY oa.org_id, o.name;

-- ============================================================================
-- 5. Verify Superadmin Balances
-- ============================================================================
-- Check superadmin balances
SELECT 
    'Superadmin Balances' AS check_name,
    sa.user_id,
    u.email,
    sb.withdrawable_amount,
    sb.pending_amount,
    sb.on_hold_amount,
    (sb.withdrawable_amount + sb.pending_amount + sb.on_hold_amount) AS total_balance,
    (
        SELECT COALESCE(SUM(ps.amount), 0)
        FROM payment_splits ps
        WHERE ps.entity_type = 'superadmin' AND ps.entity_id = sa.user_id
    ) AS calculated_total
FROM superadmin_accounts sa
JOIN users u ON u.id = sa.user_id
LEFT JOIN superadmin_balances sb ON sb.superadmin_account_id = sa.id
ORDER BY u.email;

-- Check for superadmin with payment splits but no balance
SELECT 
    'Superadmin With Splits But No Balance' AS check_name,
    sa.user_id,
    u.email,
    COUNT(ps.id) AS split_count,
    SUM(ps.amount) AS total_amount
FROM superadmin_accounts sa
JOIN users u ON u.id = sa.user_id
JOIN payment_splits ps ON ps.entity_type = 'superadmin' AND ps.entity_id = sa.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM superadmin_balances sb 
    WHERE sb.superadmin_account_id = sa.id
)
GROUP BY sa.user_id, u.email;

-- ============================================================================
-- 6. Summary Report
-- ============================================================================
-- Overall migration summary
SELECT 
    'Migration Summary' AS report_section,
    'Organization Accounts' AS metric,
    COUNT(DISTINCT oa.org_id) AS value
FROM organization_accounts oa
UNION ALL
SELECT 
    'Migration Summary',
    'Superadmin Accounts',
    COUNT(DISTINCT sa.user_id)
FROM superadmin_accounts sa
UNION ALL
SELECT 
    'Migration Summary',
    'Organization Payment Splits',
    COUNT(*)
FROM payment_splits ps
WHERE ps.entity_type = 'organization'
UNION ALL
SELECT 
    'Migration Summary',
    'Superadmin Payment Splits',
    COUNT(*)
FROM payment_splits ps
WHERE ps.entity_type = 'superadmin'
UNION ALL
SELECT 
    'Migration Summary',
    'Organization Balances',
    COUNT(*)
FROM organization_balances ob
UNION ALL
SELECT 
    'Migration Summary',
    'Superadmin Balances',
    COUNT(*)
FROM superadmin_balances sb;

-- ============================================================================
-- VERIFICATION COMPLETE
-- ============================================================================
-- Review the results above. All checks should show:
-- - No missing accounts
-- - Payment splits correctly updated
-- - Balances calculated correctly
-- - No discrepancies between calculated totals and balance snapshots
-- ============================================================================


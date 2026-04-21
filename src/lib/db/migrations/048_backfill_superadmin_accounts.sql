-- ============================================================================
-- Migration: 048_backfill_superadmin_accounts.sql
-- Description: Create superadmin_accounts for superadmin user
-- Created: 2025-01-27
-- Dependencies: 044_superadmin_accounts_balances.sql
-- ============================================================================
-- 
-- This migration creates superadmin_accounts for the superadmin user.
-- Sets default values:
-- - kyc_status = 'not_submitted'
-- - All other fields set to NULL/defaults
--
-- Idempotent: Only creates account if it doesn't exist
-- ============================================================================

-- Create superadmin account for superadmin user
INSERT INTO superadmin_accounts (
    user_id,
    linked_account_id,
    fund_account_id,
    kyc_status,
    kyc_submitted_at,
    kyc_verified_at,
    kyc_rejection_reason,
    created_at,
    updated_at
)
SELECT 
    u.id AS user_id,
    NULL AS linked_account_id,
    NULL AS fund_account_id,
    'not_submitted'::kyc_status AS kyc_status,
    NULL AS kyc_submitted_at,
    NULL AS kyc_verified_at,
    NULL AS kyc_rejection_reason,
    CURRENT_TIMESTAMP AS created_at,
    CURRENT_TIMESTAMP AS updated_at
FROM users u
WHERE u.role = 'superadmin'
  AND NOT EXISTS (
    SELECT 1 
    FROM superadmin_accounts sa 
    WHERE sa.user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERY (run separately to verify)
-- ============================================================================
-- SELECT 
--     u.id AS user_id,
--     u.email,
--     CASE WHEN sa.id IS NOT NULL THEN 'Has Account' ELSE 'Missing Account' END AS account_status
-- FROM users u
-- WHERE u.role = 'superadmin'
-- LEFT JOIN superadmin_accounts sa ON sa.user_id = u.id;
-- ============================================================================

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


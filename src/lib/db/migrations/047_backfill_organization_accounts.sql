-- ============================================================================
-- Migration: 047_backfill_organization_accounts.sql
-- Description: Create organization_accounts for all existing organizations
-- Created: 2025-01-27
-- Dependencies: 043_organization_accounts_balances.sql
-- ============================================================================
-- 
-- This migration creates organization_accounts for all existing organizations
-- that don't already have accounts. Sets default values:
-- - kyc_status = 'not_submitted'
-- - All other fields set to NULL/defaults
--
-- Idempotent: Only creates accounts for organizations that don't have one
-- ============================================================================

-- Create organization accounts for all organizations that don't have one
INSERT INTO organization_accounts (
    org_id,
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
    o.id AS org_id,
    NULL AS linked_account_id,
    NULL AS fund_account_id,
    'not_submitted'::kyc_status AS kyc_status,
    NULL AS kyc_submitted_at,
    NULL AS kyc_verified_at,
    NULL AS kyc_rejection_reason,
    CURRENT_TIMESTAMP AS created_at,
    CURRENT_TIMESTAMP AS updated_at
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 
    FROM organization_accounts oa 
    WHERE oa.org_id = o.id
)
ON CONFLICT (org_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERY (run separately to verify)
-- ============================================================================
-- SELECT 
--     o.id AS org_id,
--     o.name AS org_name,
--     CASE WHEN oa.id IS NOT NULL THEN 'Has Account' ELSE 'Missing Account' END AS account_status
-- FROM organizations o
-- LEFT JOIN organization_accounts oa ON oa.org_id = o.id
-- ORDER BY o.name;
-- ============================================================================

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


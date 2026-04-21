-- ============================================================================
-- Migration: 045_update_payment_splits_entity_type.sql
-- Description: Update payment_splits entity_type to include 'organization' and 'superadmin'
-- Created: 2025-01-27
-- Dependencies: 039_payment_schema.sql
-- ============================================================================
-- 
-- This migration updates the payment_splits table to support:
-- - 'organization' entity_type for organization payment splits (admin/instructor created content)
-- - 'superadmin' entity_type for superadmin payment splits (superadmin created content)
--
-- Updates the CHECK constraint to allow these new entity types
-- ============================================================================

-- Drop the existing CHECK constraint
ALTER TABLE payment_splits DROP CONSTRAINT IF EXISTS payment_splits_entity_type_check;

-- Add new CHECK constraint with 'organization' and 'superadmin' included
ALTER TABLE payment_splits ADD CONSTRAINT payment_splits_entity_type_check 
    CHECK (entity_type IN ('platform', 'vendor', 'tax', 'fee', 'organization', 'superadmin'));

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN payment_splits.entity_type IS 'Entity type: platform, vendor, tax, fee, organization (for admin/instructor content), or superadmin (for superadmin content)';
COMMENT ON COLUMN payment_splits.entity_id IS 'Entity ID: vendor user_id for vendor, org_id for organization, superadmin user_id for superadmin, NULL for platform/tax/fee';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


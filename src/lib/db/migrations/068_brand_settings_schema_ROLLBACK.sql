-- ============================================================================
-- Rollback Migration: 068_brand_settings_schema_ROLLBACK.sql
-- Description: Rollback brand_settings table
-- Created: 2025-01-27
-- ============================================================================

-- Drop index
DROP INDEX IF EXISTS idx_brand_settings_brand_id;

-- Drop table
DROP TABLE IF EXISTS brand_settings CASCADE;

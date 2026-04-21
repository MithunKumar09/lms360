-- ============================================================================
-- Migration: 066_brand_schema_ROLLBACK.sql
-- Description: Rollback script for 066_brand_schema.sql
--              Removes all brand-related tables and columns
-- Created: 2025-01-XX
-- ============================================================================
-- 
-- WARNING: This rollback will DELETE all brand data including:
-- - Brand profiles
-- - Brand certificates
-- - Issued certificates
-- - Brand event college allocations
-- 
-- Use with caution! Backup data before running rollback.
-- ============================================================================

-- ============================================================================
-- DROP TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_brand_profiles_updated_at ON brand_profiles;
DROP TRIGGER IF EXISTS update_brand_certificates_updated_at ON brand_certificates;

-- ============================================================================
-- DROP INDEXES
-- ============================================================================

-- Drop indexes for brand_profiles
DROP INDEX IF EXISTS idx_brand_profiles_user_id;
DROP INDEX IF EXISTS idx_brand_profiles_status;
DROP INDEX IF EXISTS idx_brand_profiles_approved_by;
DROP INDEX IF EXISTS idx_brand_profiles_created_at;
DROP INDEX IF EXISTS idx_brand_profiles_updated_at;
DROP INDEX IF EXISTS idx_brand_profiles_status_created;

-- Drop indexes for brand_certificates
DROP INDEX IF EXISTS idx_brand_certificates_brand_id;
DROP INDEX IF EXISTS idx_brand_certificates_status;
DROP INDEX IF EXISTS idx_brand_certificates_created_at;

-- Drop indexes for issued_certificates
DROP INDEX IF EXISTS idx_issued_certificates_certificate_id;
DROP INDEX IF EXISTS idx_issued_certificates_student_id;
DROP INDEX IF EXISTS idx_issued_certificates_verification_code;
DROP INDEX IF EXISTS idx_issued_certificates_issued_at;
DROP INDEX IF EXISTS idx_issued_certificates_student_issued;

-- Drop indexes for brand_event_college_allocations
DROP INDEX IF EXISTS idx_brand_event_college_allocations_event_id;
DROP INDEX IF EXISTS idx_brand_event_college_allocations_org_id;
DROP INDEX IF EXISTS idx_brand_event_college_allocations_allocated_by;
DROP INDEX IF EXISTS idx_brand_event_college_allocations_event_org;

-- Drop indexes for events.brand_id
DROP INDEX IF EXISTS idx_events_brand_id;
DROP INDEX IF EXISTS idx_events_brand_status;

-- ============================================================================
-- DROP TABLES (in reverse dependency order)
-- ============================================================================

-- Drop tables that reference other tables first
DROP TABLE IF EXISTS issued_certificates CASCADE;
DROP TABLE IF EXISTS brand_event_college_allocations CASCADE;
DROP TABLE IF EXISTS brand_certificates CASCADE;
DROP TABLE IF EXISTS brand_profiles CASCADE;

-- ============================================================================
-- REMOVE COLUMN FROM EXISTING TABLE
-- ============================================================================

-- Remove brand_id column from events table
ALTER TABLE events DROP COLUMN IF EXISTS brand_id;

-- ============================================================================
-- NOTE: ENUM ROLLBACK
-- ============================================================================
-- 
-- PostgreSQL does not support removing enum values directly.
-- To rollback the 'proposed' value from event_status_enum:
-- 
-- Option 1: Leave it (safest - no data loss)
--   - The 'proposed' value will remain but unused
-- 
-- Option 2: Manual rollback (requires data migration)
--   1. Update all events with status 'proposed' to 'draft' or 'cancelled'
--   2. Create new enum without 'proposed'
--   3. Alter table to use new enum
--   4. Drop old enum
-- 
-- This is complex and risky. Recommended: Leave enum value in place.
-- ============================================================================

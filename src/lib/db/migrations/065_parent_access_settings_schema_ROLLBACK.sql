-- ============================================================================
-- Rollback Script: 065_parent_access_settings_schema.sql
-- Description: Rollback migration 065 - Remove parent_access_settings table
--              and revert parent_student_links enhancements
-- WARNING: This will delete all parent access settings data!
-- ============================================================================

-- ============================================================================
-- ROLLBACK STEPS
-- ============================================================================

-- Step 1: Drop triggers
DROP TRIGGER IF EXISTS update_parent_access_settings_updated_at ON parent_access_settings;

-- Step 2: Drop indexes
DROP INDEX IF EXISTS idx_parent_access_settings_org_id;
DROP INDEX IF EXISTS idx_parent_access_settings_parent_user_id;
DROP INDEX IF EXISTS idx_parent_access_settings_student_user_id;
DROP INDEX IF EXISTS idx_parent_access_settings_created_by;
DROP INDEX IF EXISTS idx_parent_access_settings_org_default;
DROP INDEX IF EXISTS idx_parent_access_settings_parent_default;
DROP INDEX IF EXISTS idx_parent_access_settings_student_override;
DROP INDEX IF EXISTS idx_parent_student_links_can_view_progress;
DROP INDEX IF EXISTS idx_parent_student_links_can_view_attendance;
DROP INDEX IF EXISTS idx_parent_student_links_can_view_achievements;

-- Step 3: Remove columns from parent_student_links
ALTER TABLE parent_student_links
    DROP COLUMN IF EXISTS can_view_progress,
    DROP COLUMN IF EXISTS can_view_achievements,
    DROP COLUMN IF EXISTS can_view_certificates,
    DROP COLUMN IF EXISTS can_view_activity_log,
    DROP COLUMN IF EXISTS can_view_engagement_stats;

-- Step 4: Drop the parent_access_settings table
DROP TABLE IF EXISTS parent_access_settings;

-- Step 5: Remove migration record (if using schema_migrations table)
-- DELETE FROM schema_migrations WHERE migration_name = '065_parent_access_settings_schema.sql';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- After running this rollback:
-- 1. The parent_student_links table will revert to its original structure
--    (only can_view_grades and can_view_attendance will remain)
-- 2. All parent_access_settings data will be permanently deleted
-- 3. Any application code relying on the new fields will need to be reverted
-- 
-- To re-apply the migration:
-- 1. Run: node src/lib/db/migrations/run-migration.js 065_parent_access_settings_schema.sql
-- 
-- ============================================================================

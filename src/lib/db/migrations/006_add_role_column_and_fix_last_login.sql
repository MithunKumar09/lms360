-- ============================================================================
-- Migration: 006_add_role_column_and_fix_last_login.sql
-- Description: Add role column to users table for primary role storage and fix last_login_at
-- Created: 2025-11-18
-- ============================================================================

-- Add role column to users table if it doesn't exist
-- This stores the primary role for quick access and security guards
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) NULL;
        COMMENT ON COLUMN users.role IS 'Primary role for quick access and security guards. Values: superadmin, admin, instructor, student, vendor, parent, alumni';
    END IF;
END $$;

-- Create index on role column for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role IS NOT NULL;

-- Migrate existing roles from user_roles to role column
-- Priority: superadmin > admin > instructor > student > vendor > parent > alumni
DO $$
DECLARE
    user_record RECORD;
    primary_role_code TEXT;
BEGIN
    FOR user_record IN 
        SELECT DISTINCT u.id, u.email
        FROM users u
        WHERE u.role IS NULL
    LOOP
        -- Get the primary role based on priority
        SELECT r.code INTO primary_role_code
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = user_record.id
        ORDER BY CASE r.code
            WHEN 'superadmin' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'instructor' THEN 3
            WHEN 'student' THEN 4
            WHEN 'vendor' THEN 5
            WHEN 'parent' THEN 6
            WHEN 'alumni' THEN 7
            ELSE 8
        END
        LIMIT 1;
        
        -- Keep role codes as-is (no 'org' prefix needed - we use roles table now)
        IF primary_role_code IS NOT NULL THEN
            -- Update the user's role column with the role code from roles table
            UPDATE users 
            SET role = primary_role_code 
            WHERE id = user_record.id;
            
            RAISE NOTICE 'Updated user % (%) with role %', user_record.email, user_record.id, primary_role_code;
        END IF;
    END LOOP;
END $$;

-- Also check if there's a legacy 'role' column from old schema (user_role enum)
-- If it exists and user.role (new VARCHAR) is NULL, migrate from old enum
DO $$
DECLARE
    has_old_enum_role BOOLEAN;
    has_new_varchar_role BOOLEAN;
    old_role_col_name TEXT;
BEGIN
    -- Check if old enum role column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' 
          AND column_name='role' 
          AND data_type='USER-DEFINED'
          AND udt_name='user_role'
    ) INTO has_old_enum_role;
    
    -- Check if new VARCHAR role column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' 
          AND column_name='role' 
          AND data_type='character varying'
    ) INTO has_new_varchar_role;
    
    -- If we have old enum but new VARCHAR doesn't exist yet, we need to handle differently
    -- Actually, the migration above should have created the VARCHAR column
    -- So if old enum exists, we need to migrate data from enum to VARCHAR, then drop enum
    
    IF has_old_enum_role AND has_new_varchar_role THEN
        -- Both exist - migrate data from enum to VARCHAR
        -- First, update VARCHAR column from enum where VARCHAR is NULL
        UPDATE users u
        SET role = CASE 
            WHEN u.role::TEXT = 'superadmin' THEN 'superadmin'
            WHEN u.role::TEXT = 'admin' THEN 'admin'
            WHEN u.role::TEXT = 'instructor' THEN 'instructor'
            WHEN u.role::TEXT = 'student' THEN 'student'
            ELSE NULL
        END
        WHERE u.role IS NULL 
          AND u.role::TEXT IN ('superadmin', 'admin', 'instructor', 'student');
    ELSIF has_old_enum_role AND NOT has_new_varchar_role THEN
        -- Only enum exists - we need to add VARCHAR column first, then migrate
        -- But the migration above should have added it, so this shouldn't happen
        RAISE NOTICE 'Old enum role exists but new VARCHAR role column not found - this should not happen';
    END IF;
END $$;

-- Fix last_login column name if it exists (migration 001 used 'last_login', migration 004 uses 'last_login_at')
DO $$ BEGIN
    -- If both columns exist, migrate data and drop old one
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login_at') THEN
        UPDATE users SET last_login_at = last_login WHERE last_login_at IS NULL AND last_login IS NOT NULL;
        ALTER TABLE users DROP COLUMN IF EXISTS last_login;
    -- If only old column exists, rename it
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login_at') THEN
        ALTER TABLE users RENAME COLUMN last_login TO last_login_at;
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN users.role IS 'Primary role for authentication and authorization guards. Values: superadmin, admin, instructor, student, vendor, parent, alumni';


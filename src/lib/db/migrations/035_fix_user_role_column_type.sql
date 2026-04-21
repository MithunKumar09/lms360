-- Migration: Fix users.role column to be VARCHAR instead of user_role enum
-- Date: 2025-01-XX
-- Description: Ensures the users.role column is VARCHAR to support vendor and mentor roles

-- Check if role column exists and is enum type, convert to VARCHAR if needed
DO $$ 
DECLARE
    column_type TEXT;
    column_exists BOOLEAN;
BEGIN
    -- Check if role column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
    ) INTO column_exists;
    
    IF column_exists THEN
        -- Get the current data type
        SELECT data_type INTO column_type
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role';
        
        -- If it's a user-defined type (enum), convert it to VARCHAR
        IF column_type = 'USER-DEFINED' THEN
            -- First, check if it's the user_role enum
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns c
                JOIN pg_type t ON c.udt_name = t.typname
                WHERE c.table_name = 'users' 
                  AND c.column_name = 'role'
                  AND t.typname = 'user_role'
            ) INTO column_exists;
            
            IF column_exists THEN
                -- Convert enum to VARCHAR
                -- First, drop any default constraint on the enum column
                ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
                
                -- Create a temporary column with VARCHAR type
                ALTER TABLE users ADD COLUMN IF NOT EXISTS role_varchar VARCHAR(50);
                
                -- Copy data from enum to VARCHAR
                UPDATE users SET role_varchar = role::TEXT WHERE role_varchar IS NULL;
                
                -- Drop the old enum column
                ALTER TABLE users DROP COLUMN IF EXISTS role;
                
                -- Rename the new column
                ALTER TABLE users RENAME COLUMN role_varchar TO role;
                
                -- Set default value for VARCHAR column
                ALTER TABLE users ALTER COLUMN role SET DEFAULT 'student';
                
                -- Add index
                CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role IS NOT NULL;
                
                RAISE NOTICE 'Converted users.role from user_role enum to VARCHAR';
            END IF;
        END IF;
    ELSE
        -- Column doesn't exist, create it as VARCHAR
        ALTER TABLE users ADD COLUMN role VARCHAR(50);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role IS NOT NULL;
        RAISE NOTICE 'Created users.role as VARCHAR';
    END IF;
END $$;


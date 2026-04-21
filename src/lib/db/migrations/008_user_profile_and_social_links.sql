-- ============================================================================
-- Migration: 008_user_profile_and_social_links.sql
-- Description: Adds user profile fields and social links table for settings page
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USER PROFILE FIELDS
-- ============================================================================

-- Add additional profile fields to users table if they don't exist
DO $$ 
BEGIN
    -- Username field
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name='users' AND column_name='username'
    ) THEN
        ALTER TABLE users ADD COLUMN username VARCHAR(30) NULL;
    END IF;
    
    -- Create unique index for username if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'users' AND indexname = 'idx_users_username_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_users_username_unique ON users(username) WHERE username IS NOT NULL;
    END IF;

    -- Phone field
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name='users' AND column_name='phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL;
    END IF;

    -- Skill/Occupation field
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name='users' AND column_name='skill'
    ) THEN
        ALTER TABLE users ADD COLUMN skill VARCHAR(100) NULL;
    END IF;

    -- Display Name field
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name='users' AND column_name='display_name'
    ) THEN
        ALTER TABLE users ADD COLUMN display_name VARCHAR(100) NULL;
    END IF;

    -- Bio field
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name='users' AND column_name='bio'
    ) THEN
        ALTER TABLE users ADD COLUMN bio TEXT NULL;
    END IF;
EXCEPTION
    WHEN duplicate_column THEN
        -- Column already exists, ignore
        NULL;
END $$;

-- ============================================================================
-- SOCIAL LINKS TABLE
-- ============================================================================

-- Create user_social_links table
CREATE TABLE IF NOT EXISTS user_social_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    facebook VARCHAR(500) NULL,
    twitter VARCHAR(500) NULL,
    linkedin VARCHAR(500) NULL,
    website VARCHAR(500) NULL,
    github VARCHAR(500) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT user_social_links_user_id_unique UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_social_links_user_id ON user_social_links(user_id);

-- Create trigger for updated_at on user_social_links (function already exists from migration 001)
DROP TRIGGER IF EXISTS update_user_social_links_updated_at ON user_social_links;
CREATE TRIGGER update_user_social_links_updated_at
    BEFORE UPDATE ON user_social_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE user_social_links IS 'Stores social media links for users';
COMMENT ON COLUMN user_social_links.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN user_social_links.facebook IS 'Facebook profile URL';
COMMENT ON COLUMN user_social_links.twitter IS 'Twitter/X profile URL';
COMMENT ON COLUMN user_social_links.linkedin IS 'LinkedIn profile URL';
COMMENT ON COLUMN user_social_links.website IS 'Personal or professional website URL';
COMMENT ON COLUMN user_social_links.github IS 'GitHub profile URL';


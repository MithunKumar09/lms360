-- ============================================================================
-- Migration: 019_wishlist_schema.sql
-- Description: Creates wishlist table for user course wishlists
-- Created: 2025-01-XX
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Wishlist table
CREATE TABLE IF NOT EXISTS wishlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT wishlist_user_course_unique UNIQUE (user_id, course_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);

-- Index for course lookups
CREATE INDEX IF NOT EXISTS idx_wishlist_course_id ON wishlist(course_id);

-- Composite index for user-course lookups
CREATE INDEX IF NOT EXISTS idx_wishlist_user_course ON wishlist(user_id, course_id);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_wishlist_created_at ON wishlist(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $fn$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_wishlist_updated_at ON wishlist;
CREATE TRIGGER update_wishlist_updated_at
    BEFORE UPDATE ON wishlist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE wishlist IS 'User course wishlist - stores courses users want to save for later';
COMMENT ON COLUMN wishlist.user_id IS 'Reference to the user who added the course to wishlist';
COMMENT ON COLUMN wishlist.course_id IS 'Reference to the course in the wishlist';
COMMENT ON COLUMN wishlist.created_at IS 'When the course was added to wishlist';
COMMENT ON COLUMN wishlist.updated_at IS 'Last update timestamp (auto-updated)';


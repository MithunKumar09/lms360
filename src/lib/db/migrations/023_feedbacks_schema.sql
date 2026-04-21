-- ============================================================================
-- Migration: 023_feedbacks_schema.sql
-- Description: Feedback table for website feedback submissions
-- Created: 2025-01-XX
-- Dependencies: 001_initial_schema.sql, 004_users_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - feedbacks: Website feedback submissions from authenticated users
--
-- Supports feedback collection with user tracking, ratings, categories,
-- and admin review workflow
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Feedback table for website feedback submissions
CREATE TABLE IF NOT EXISTS feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_role VARCHAR(50) NOT NULL,
    email VARCHAR(255) NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    rating INTEGER NULL CHECK (rating >= 1 AND rating <= 5),
    category VARCHAR(50) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'archived')),
    admin_notes TEXT NULL,
    reviewed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT feedbacks_subject_length CHECK (char_length(subject) >= 3 AND char_length(subject) <= 255),
    CONSTRAINT feedbacks_message_length CHECK (char_length(message) >= 10 AND char_length(message) <= 5000),
    CONSTRAINT feedbacks_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_role ON feedbacks(user_role);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_category ON feedbacks(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedbacks_reviewed_by ON feedbacks(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- Composite index for common queries (status + created_at for listing)
CREATE INDEX IF NOT EXISTS idx_feedbacks_status_created ON feedbacks(status, created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedbacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feedbacks_updated_at
    BEFORE UPDATE ON feedbacks
    FOR EACH ROW
    EXECUTE FUNCTION update_feedbacks_updated_at();


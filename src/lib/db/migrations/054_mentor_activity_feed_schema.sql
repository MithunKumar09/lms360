-- ============================================================================
-- Migration: 054_mentor_activity_feed_schema.sql
-- Description: Mentor Activity Feed Schema - Track all mentor-student interactions
-- Created: 2025-01-XX
-- Dependencies: 053_mentor_tasks_schema.sql, 031_vendor_mentor_registration_schema.sql
-- ============================================================================
-- 
-- This migration creates table for:
-- - mentor_activity_feed: Activity feed entries for mentor-student interactions
--
-- Supports real-time activity feed showing task events, sessions, materials, notes, etc.
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- mentor_activity_feed table
-- Stores activity feed entries for mentor-student interactions
CREATE TABLE IF NOT EXISTS mentor_activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NULL REFERENCES users(id) ON DELETE SET NULL, -- NULL for cohort-wide activities
    cohort_id UUID NULL REFERENCES cohorts(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL, -- task_created, task_completed, task_updated, task_cancelled, session_scheduled, session_cancelled, session_completed, material_shared, material_updated, material_deleted, note_added, note_updated, note_deleted, feedback_submitted, feedback_updated
    activity_data JSONB, -- Flexible JSON for activity-specific data (e.g., task title, session details)
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT mentor_activity_feed_type_check CHECK (activity_type IN (
        'task_created', 'task_completed', 'task_updated', 'task_cancelled',
        'task_in_progress', 'session_scheduled', 'session_cancelled', 'session_completed',
        'material_shared', 'material_updated', 'material_deleted',
        'note_added', 'note_updated', 'note_deleted',
        'feedback_submitted', 'feedback_updated'
    ))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for mentor_activity_feed
CREATE INDEX IF NOT EXISTS idx_mentor_activity_feed_mentor_id ON mentor_activity_feed(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_activity_feed_student_id ON mentor_activity_feed(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_activity_feed_cohort_id ON mentor_activity_feed(cohort_id) WHERE cohort_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_activity_feed_created_at ON mentor_activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_activity_feed_type ON mentor_activity_feed(activity_type);
CREATE INDEX IF NOT EXISTS idx_mentor_activity_feed_mentor_student ON mentor_activity_feed(mentor_id, student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_activity_feed_mentor_cohort ON mentor_activity_feed(mentor_id, cohort_id) WHERE cohort_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_activity_feed_student_created ON mentor_activity_feed(student_id, created_at DESC) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_activity_feed_mentor_created ON mentor_activity_feed(mentor_id, created_at DESC);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE mentor_activity_feed IS 'Stores activity feed entries for mentor-student interactions. Tracks tasks, sessions, materials, notes, and feedback activities.';
COMMENT ON COLUMN mentor_activity_feed.mentor_id IS 'UUID of the mentor associated with this activity';
COMMENT ON COLUMN mentor_activity_feed.student_id IS 'UUID of the student associated with this activity (NULL for cohort-wide activities)';
COMMENT ON COLUMN mentor_activity_feed.cohort_id IS 'UUID of the cohort associated with this activity (if applicable)';
COMMENT ON COLUMN mentor_activity_feed.activity_type IS 'Type of activity: task_created, task_completed, task_updated, task_cancelled, task_in_progress, session_scheduled, session_cancelled, session_completed, material_shared, material_updated, material_deleted, note_added, note_updated, note_deleted, feedback_submitted, feedback_updated';
COMMENT ON COLUMN mentor_activity_feed.activity_data IS 'Flexible JSON data for activity-specific information (e.g., task title, description, session details)';
COMMENT ON COLUMN mentor_activity_feed.created_by IS 'UUID of the user who created this activity entry';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

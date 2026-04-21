-- ============================================================================
-- Migration: 053_mentor_tasks_schema.sql
-- Description: Mentor Tasks Schema - Task assignment system for mentors and students
-- Created: 2025-01-XX
-- Dependencies: 031_vendor_mentor_registration_schema.sql, 004_users_schema.sql, 003_classes_subjects_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - mentor_tasks: Tasks assigned by mentors to students
-- - mentor_task_attachments: File attachments for tasks
-- - mentor_task_comments: Comments on tasks for communication
--
-- Supports the mentor-student task assignment and tracking system
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. mentor_tasks table
-- Stores tasks assigned by mentors to students
CREATE TABLE IF NOT EXISTS mentor_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cohort_id UUID NULL REFERENCES cohorts(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL DEFAULT 'general', -- general, assignment, project, review
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, overdue, cancelled
    priority VARCHAR(10) NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    due_date TIMESTAMP WITH TIME ZONE NULL,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT mentor_tasks_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 255),
    CONSTRAINT mentor_tasks_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
    CONSTRAINT mentor_tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT mentor_tasks_task_type_check CHECK (task_type IN ('general', 'assignment', 'project', 'review'))
);

-- 2. mentor_task_attachments table
-- File attachments for tasks
CREATE TABLE IF NOT EXISTS mentor_task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES mentor_tasks(id) ON DELETE CASCADE,
    file_key TEXT NOT NULL, -- S3/R2 key
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT mentor_task_attachments_size_positive CHECK (file_size_bytes > 0),
    CONSTRAINT mentor_task_attachments_file_name_length CHECK (char_length(file_name) >= 1 AND char_length(file_name) <= 255)
);

-- 3. mentor_task_comments table
-- Comments on tasks for mentor-student communication
CREATE TABLE IF NOT EXISTS mentor_task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES mentor_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT mentor_task_comments_comment_length CHECK (char_length(comment) >= 1 AND char_length(comment) <= 5000)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for mentor_tasks
CREATE INDEX IF NOT EXISTS idx_mentor_tasks_mentor_id ON mentor_tasks(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_tasks_student_id ON mentor_tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_tasks_cohort_id ON mentor_tasks(cohort_id) WHERE cohort_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_tasks_status ON mentor_tasks(status);
CREATE INDEX IF NOT EXISTS idx_mentor_tasks_priority ON mentor_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_mentor_tasks_due_date ON mentor_tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_tasks_created_at ON mentor_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_tasks_mentor_student ON mentor_tasks(mentor_id, student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_tasks_mentor_status ON mentor_tasks(mentor_id, status);
CREATE INDEX IF NOT EXISTS idx_mentor_tasks_student_status ON mentor_tasks(student_id, status);

-- Indexes for mentor_task_attachments
CREATE INDEX IF NOT EXISTS idx_mentor_task_attachments_task_id ON mentor_task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_mentor_task_attachments_uploaded_by ON mentor_task_attachments(uploaded_by);

-- Indexes for mentor_task_comments
CREATE INDEX IF NOT EXISTS idx_mentor_task_comments_task_id ON mentor_task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_mentor_task_comments_user_id ON mentor_task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_task_comments_created_at ON mentor_task_comments(created_at DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMP
-- ============================================================================

-- Ensure update_updated_at_column function exists (reuse from previous migrations)
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

-- Trigger for mentor_tasks updated_at
DROP TRIGGER IF EXISTS trigger_update_mentor_tasks_updated_at ON mentor_tasks;
CREATE TRIGGER trigger_update_mentor_tasks_updated_at
    BEFORE UPDATE ON mentor_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for mentor_task_comments updated_at
DROP TRIGGER IF EXISTS trigger_update_mentor_task_comments_updated_at ON mentor_task_comments;
CREATE TRIGGER trigger_update_mentor_task_comments_updated_at
    BEFORE UPDATE ON mentor_task_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE mentor_tasks IS 'Stores tasks assigned by mentors to students. Tasks can be associated with a specific cohort.';
COMMENT ON COLUMN mentor_tasks.mentor_id IS 'UUID of the mentor who created/assigned this task';
COMMENT ON COLUMN mentor_tasks.student_id IS 'UUID of the student this task is assigned to';
COMMENT ON COLUMN mentor_tasks.cohort_id IS 'Optional cohort association for the task';
COMMENT ON COLUMN mentor_tasks.task_type IS 'Type of task: general, assignment, project, or review';
COMMENT ON COLUMN mentor_tasks.status IS 'Current status: pending, in_progress, completed, overdue, or cancelled';
COMMENT ON COLUMN mentor_tasks.priority IS 'Priority level: low, medium, high, or urgent';
COMMENT ON COLUMN mentor_tasks.due_date IS 'Optional due date for the task';
COMMENT ON COLUMN mentor_tasks.completed_at IS 'Timestamp when the task was marked as completed';

COMMENT ON TABLE mentor_task_attachments IS 'File attachments for mentor tasks. Supports file uploads from both mentors and students.';
COMMENT ON COLUMN mentor_task_attachments.file_key IS 'Storage key (S3/R2) for the uploaded file';
COMMENT ON COLUMN mentor_task_attachments.file_url IS 'Public URL for accessing the file';
COMMENT ON COLUMN mentor_task_attachments.uploaded_by IS 'UUID of the user who uploaded this attachment';

COMMENT ON TABLE mentor_task_comments IS 'Comments on tasks for mentor-student communication. Both mentors and students can add comments.';
COMMENT ON COLUMN mentor_task_comments.user_id IS 'UUID of the user who wrote this comment (mentor or student)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

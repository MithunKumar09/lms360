-- ============================================================================
-- Migration: 017_course_enrollments_schema.sql
-- Description: Create course_enrollments table to track student enrollments
-- Created: 2025-01-XX
-- ============================================================================

-- Course enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    enrollment_status VARCHAR(50) DEFAULT 'active', -- active, completed, dropped, suspended
    progress_percentage DECIMAL(5, 2) DEFAULT 0.00 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Ensure a user can only enroll once per course
    UNIQUE(course_id, user_id),
    
    CONSTRAINT course_enrollments_status_check CHECK (
        enrollment_status IN ('active', 'completed', 'dropped', 'suspended')
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_enrolled_at ON course_enrollments(enrolled_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_last_accessed ON course_enrollments(last_accessed_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_status ON course_enrollments(user_id, enrollment_status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_status ON course_enrollments(course_id, enrollment_status);

-- Comments
COMMENT ON TABLE course_enrollments IS 'Tracks student enrollments in courses';
COMMENT ON COLUMN course_enrollments.course_id IS 'Reference to the enrolled course';
COMMENT ON COLUMN course_enrollments.user_id IS 'Reference to the enrolled user (student)';
COMMENT ON COLUMN course_enrollments.enrolled_at IS 'Timestamp when the user enrolled';
COMMENT ON COLUMN course_enrollments.enrollment_status IS 'Status of the enrollment: active, completed, dropped, or suspended';
COMMENT ON COLUMN course_enrollments.progress_percentage IS 'Course completion progress (0-100)';
COMMENT ON COLUMN course_enrollments.last_accessed_at IS 'Last time the user accessed the course';
COMMENT ON COLUMN course_enrollments.completed_at IS 'Timestamp when the course was completed (null if not completed)';


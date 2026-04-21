-- ============================================================================
-- Migration: 061_student_stamps_schema.sql
-- Description: Create student_stamps table for gamification stamp tracking
-- Created: 2025-01-XX
-- Dependencies: 060_student_milestones_schema.sql
-- ============================================================================

-- Student Stamps Table
-- Tracks gamification stamps awarded to students for milestone completions
CREATE TABLE IF NOT EXISTS student_stamps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES student_course_milestones(id) ON DELETE CASCADE,
    
    -- Stamp Metadata
    stamp_type VARCHAR(50) NOT NULL, -- 'finishing', 'trophy_blue', 'trophy_gold'
    
    -- Timestamps
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT student_stamps_unique UNIQUE(student_id, course_id, milestone_id),
    CONSTRAINT stamp_type_check CHECK (
        stamp_type IN ('finishing', 'trophy_blue', 'trophy_gold')
    )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup: Get all stamps for a student
CREATE INDEX IF NOT EXISTS idx_student_stamps_student 
    ON student_stamps(student_id);

-- Course lookup: Get all stamps for a course
CREATE INDEX IF NOT EXISTS idx_student_stamps_course 
    ON student_stamps(course_id);

-- Student + Course: Get stamps for student in specific course
CREATE INDEX IF NOT EXISTS idx_student_stamps_student_course 
    ON student_stamps(student_id, course_id);

-- Stamp type lookup: Count stamps by type
CREATE INDEX IF NOT EXISTS idx_student_stamps_type 
    ON student_stamps(student_id, stamp_type);

-- Awarded date: For sorting by most recent
CREATE INDEX IF NOT EXISTS idx_student_stamps_awarded 
    ON student_stamps(awarded_at DESC);

-- Composite: Student + Course + Type for analytics
CREATE INDEX IF NOT EXISTS idx_student_stamps_student_course_type 
    ON student_stamps(student_id, course_id, stamp_type);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE student_stamps IS 'Gamification stamps awarded to students for milestone completions';
COMMENT ON COLUMN student_stamps.stamp_type IS 'Type: finishing, trophy_blue, or trophy_gold';
COMMENT ON COLUMN student_stamps.awarded_at IS 'Timestamp when stamp was awarded';

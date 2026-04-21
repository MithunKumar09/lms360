-- ============================================================================
-- Migration: 060_student_milestones_schema.sql
-- Description: Create student_course_milestones table for tracking course milestones
-- Created: 2025-01-XX
-- Dependencies: 001_initial_schema.sql, 011_courses_schema.sql, 017_course_enrollments_schema.sql
-- ============================================================================

-- Student Course Milestones Table
-- Tracks individual milestones for each student in each enrolled course
CREATE TABLE IF NOT EXISTS student_course_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Milestone Metadata
    milestone_number INTEGER NOT NULL, -- Sequential milestone number (1, 2, 3, 4...)
    milestone_type VARCHAR(50) NOT NULL, -- 'module', 'quiz', 'assignment', 'progress', 'completion'
    milestone_reference_id UUID NULL, -- References module_id, quiz_id, assignment_id, or NULL for progress/completion milestones
    
    -- Completion Tracking
    completed_at TIMESTAMP WITH TIME ZONE NULL, -- NULL = not completed, timestamp = completion time
    stamp_awarded BOOLEAN NOT NULL DEFAULT false, -- Whether stamp has been awarded for this milestone
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT student_course_milestones_unique UNIQUE(student_id, course_id, milestone_number),
    CONSTRAINT milestone_number_positive CHECK (milestone_number > 0),
    CONSTRAINT milestone_type_check CHECK (
        milestone_type IN ('module', 'quiz', 'assignment', 'progress', 'completion')
    ),
    
    -- Ensure milestone_reference_id is set for module/quiz/assignment types
    CONSTRAINT milestone_reference_check CHECK (
        (milestone_type IN ('module', 'quiz', 'assignment') AND milestone_reference_id IS NOT NULL) OR
        (milestone_type IN ('progress', 'completion') AND milestone_reference_id IS NULL)
    )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup: Get all milestones for a student in a course
CREATE INDEX IF NOT EXISTS idx_student_milestones_student_course 
    ON student_course_milestones(student_id, course_id);

-- Completion tracking: Find completed milestones
CREATE INDEX IF NOT EXISTS idx_student_milestones_completed 
    ON student_course_milestones(completed_at) 
    WHERE completed_at IS NOT NULL;

-- Stamp tracking: Find milestones that need stamp awarding
CREATE INDEX IF NOT EXISTS idx_student_milestones_stamp_pending 
    ON student_course_milestones(student_id, course_id) 
    WHERE completed_at IS NOT NULL AND stamp_awarded = false;

-- Milestone type lookup: Find milestones by type
CREATE INDEX IF NOT EXISTS idx_student_milestones_type 
    ON student_course_milestones(course_id, milestone_type, milestone_number);

-- Reference lookup: Find milestones by reference (module/quiz/assignment)
CREATE INDEX IF NOT EXISTS idx_student_milestones_reference 
    ON student_course_milestones(milestone_reference_id) 
    WHERE milestone_reference_id IS NOT NULL;

-- Composite index for common query: student + course + completion status
CREATE INDEX IF NOT EXISTS idx_student_milestones_student_course_completed 
    ON student_course_milestones(student_id, course_id, completed_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_student_milestones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_milestones_updated_at
    BEFORE UPDATE ON student_course_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_student_milestones_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE student_course_milestones IS 'Tracks course milestones for each student enrollment';
COMMENT ON COLUMN student_course_milestones.milestone_number IS 'Sequential milestone number (1, 2, 3, 4...)';
COMMENT ON COLUMN student_course_milestones.milestone_type IS 'Type: module, quiz, assignment, progress, or completion';
COMMENT ON COLUMN student_course_milestones.milestone_reference_id IS 'References module_id, quiz_id, or assignment_id for specific milestones';
COMMENT ON COLUMN student_course_milestones.completed_at IS 'Timestamp when milestone was completed, NULL if not completed';
COMMENT ON COLUMN student_course_milestones.stamp_awarded IS 'Whether gamification stamp has been awarded';

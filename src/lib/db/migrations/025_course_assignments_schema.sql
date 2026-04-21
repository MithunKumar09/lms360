-- ============================================================================
-- Migration: 025_course_assignments_schema.sql
-- Description: Course assignments table for assigning courses to cohorts/classes/subjects
-- Created: 2025-01-XX
-- Dependencies: 003_classes_subjects_schema.sql, 011_courses_schema.sql
-- ============================================================================
-- 
-- This migration creates the course_assignments table to support:
-- - Main course assignments (from course creation)
-- - Additional course assignments (elective assignments via Assign Course feature)
-- - Flexible assignment structure supporting cohorts, program nodes, classes, subjects, years, semesters
--
-- Also migrates existing course_classes and course_subjects relationships
-- to course_assignments with assignment_type = 'main'
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Course assignments table
-- Supports both main assignments (from course creation) and additional assignments (via Assign Course feature)
CREATE TABLE IF NOT EXISTS course_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    assigned_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    
    -- Assignment target (flexible structure)
    -- Note: cohort_id references cohorts table (which represents classes)
    cohort_id UUID NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    program_node_id UUID NULL REFERENCES program_nodes(id) ON DELETE CASCADE,
    -- class_id is represented by cohort_id (cohorts table represents classes)
    -- subject_id references subject_catalog table
    subject_id UUID NULL REFERENCES subject_catalog(id) ON DELETE CASCADE,
    year INTEGER NULL,
    semester INTEGER NULL,
    
    -- Assignment metadata
    assignment_type VARCHAR(20) NOT NULL DEFAULT 'assigned', -- 'main' or 'assigned'
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT course_assignments_type_check CHECK (assignment_type IN ('main', 'assigned')),
    CONSTRAINT course_assignments_target_check CHECK (
        (cohort_id IS NOT NULL) OR 
        (program_node_id IS NOT NULL) OR 
        (subject_id IS NOT NULL) OR
        (year IS NOT NULL) OR
        (semester IS NOT NULL)
    ),
    CONSTRAINT course_assignments_year_check CHECK (year IS NULL OR year > 0),
    CONSTRAINT course_assignments_semester_check CHECK (semester IS NULL OR (semester >= 1 AND semester <= 12))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_course_assignments_course_id ON course_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_assigned_by ON course_assignments(assigned_by_user_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_type ON course_assignments(assignment_type);
CREATE INDEX IF NOT EXISTS idx_course_assignments_active ON course_assignments(is_active) WHERE is_active = true;

-- Target-specific indexes (partial indexes for better performance)
CREATE INDEX IF NOT EXISTS idx_course_assignments_cohort ON course_assignments(cohort_id) WHERE cohort_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_course_assignments_program_node ON course_assignments(program_node_id) WHERE program_node_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_course_assignments_subject ON course_assignments(subject_id) WHERE subject_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_course_assignments_year ON course_assignments(year) WHERE year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_course_assignments_semester ON course_assignments(semester) WHERE semester IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_course_assignments_course_type ON course_assignments(course_id, assignment_type);
CREATE INDEX IF NOT EXISTS idx_course_assignments_course_active ON course_assignments(course_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_course_assignments_cohort_active ON course_assignments(cohort_id, is_active) WHERE cohort_id IS NOT NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_course_assignments_subject_active ON course_assignments(subject_id, is_active) WHERE subject_id IS NOT NULL AND is_active = true;

-- Unique constraint: Prevent duplicate assignments
-- Using unique partial indexes for better performance
-- For main assignments: prevent duplicates across all target types
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_assignments_unique_main_cohort 
    ON course_assignments(course_id, cohort_id) 
    WHERE assignment_type = 'main' AND cohort_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_assignments_unique_main_program 
    ON course_assignments(course_id, program_node_id) 
    WHERE assignment_type = 'main' AND program_node_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_assignments_unique_main_subject 
    ON course_assignments(course_id, subject_id) 
    WHERE assignment_type = 'main' AND subject_id IS NOT NULL;

-- For assigned (additional) assignments: prevent duplicates only for active assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_assignments_unique_assigned_cohort 
    ON course_assignments(course_id, cohort_id) 
    WHERE assignment_type = 'assigned' AND is_active = true AND cohort_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_assignments_unique_assigned_program 
    ON course_assignments(course_id, program_node_id) 
    WHERE assignment_type = 'assigned' AND is_active = true AND program_node_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_assignments_unique_assigned_subject 
    ON course_assignments(course_id, subject_id) 
    WHERE assignment_type = 'assigned' AND is_active = true AND subject_id IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER trigger_update_course_assignments_updated_at
    BEFORE UPDATE ON course_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DATA MIGRATION
-- ============================================================================

-- Migrate existing course_classes relationships to course_assignments
-- Note: course_classes.class_id should map to cohorts.id
-- We'll use the course creator as assigned_by_user_id
INSERT INTO course_assignments (
    course_id,
    assigned_by_user_id,
    cohort_id,
    assignment_type,
    is_active,
    created_at,
    updated_at
)
SELECT DISTINCT
    cc.course_id,
    c.created_by,
    cc.class_id::UUID as cohort_id,
    'main' as assignment_type,
    true as is_active,
    cc.created_at,
    cc.created_at
FROM course_classes cc
INNER JOIN courses c ON c.id = cc.course_id
WHERE NOT EXISTS (
    SELECT 1 FROM course_assignments ca
    WHERE ca.course_id = cc.course_id
    AND ca.cohort_id = cc.class_id::UUID
    AND ca.assignment_type = 'main'
)
ON CONFLICT DO NOTHING;

-- Migrate existing course_subjects relationships to course_assignments
-- Note: course_subjects.subject_id should map to subject_catalog.id
INSERT INTO course_assignments (
    course_id,
    assigned_by_user_id,
    subject_id,
    assignment_type,
    is_active,
    created_at,
    updated_at
)
SELECT DISTINCT
    cs.course_id,
    c.created_by,
    cs.subject_id::UUID as subject_id,
    'main' as assignment_type,
    true as is_active,
    cs.created_at,
    cs.created_at
FROM course_subjects cs
INNER JOIN courses c ON c.id = cs.course_id
WHERE NOT EXISTS (
    SELECT 1 FROM course_assignments ca
    WHERE ca.course_id = cs.course_id
    AND ca.subject_id = cs.subject_id::UUID
    AND ca.assignment_type = 'main'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE course_assignments IS 'Course assignments to cohorts/classes/subjects. Supports both main assignments (from course creation) and additional assignments (via Assign Course feature)';

COMMENT ON COLUMN course_assignments.course_id IS 'Course being assigned';
COMMENT ON COLUMN course_assignments.assigned_by_user_id IS 'User who assigned the course (course creator for main, admin/instructor for assigned)';
COMMENT ON COLUMN course_assignments.cohort_id IS 'Cohort/class ID (cohorts table represents classes)';
COMMENT ON COLUMN course_assignments.program_node_id IS 'Program node ID (for hierarchical program structure)';
COMMENT ON COLUMN course_assignments.subject_id IS 'Subject ID (from subject_catalog table)';
COMMENT ON COLUMN course_assignments.year IS 'Academic year (optional)';
COMMENT ON COLUMN course_assignments.semester IS 'Semester number (optional, 1-12)';
COMMENT ON COLUMN course_assignments.assignment_type IS 'Type of assignment: main (from course creation) or assigned (via Assign Course feature)';
COMMENT ON COLUMN course_assignments.is_active IS 'Whether this assignment is currently active';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
--
-- Performance:
-- - Partial indexes for nullable columns (cohort_id, program_node_id, subject_id)
-- - Composite indexes for common query patterns
-- - Unique partial indexes to prevent duplicates while allowing flexibility
--
-- Data Integrity:
-- - Foreign keys with appropriate CASCADE rules
-- - CHECK constraints for assignment_type and target validation
-- - Unique constraints prevent duplicate assignments
--
-- Migration Strategy:
-- - Migrates existing course_classes and course_subjects to course_assignments
-- - Sets assignment_type = 'main' for migrated data
-- - Uses course creator as assigned_by_user_id for migrated data
-- - Preserves original created_at timestamps
--
-- Notes:
-- - course_classes.class_id maps to cohorts.id (cohorts represent classes)
-- - course_subjects.subject_id maps to subject_catalog.id
-- - Main assignments are read-only in the Assign Course feature
-- - Additional assignments can be made via the Assign Course feature
-- ============================================================================


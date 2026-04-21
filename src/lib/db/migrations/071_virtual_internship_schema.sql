-- ============================================================================
-- Migration: 071_virtual_internship_schema.sql
-- Description: Virtual Internship Program schema - mirrors assignment functionality
-- Created: 2025-01-XX
-- Dependencies: 004_users_schema.sql, 002_organizations_schema.sql, 020_assignments_quizzes_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for virtual internship programs:
-- - Virtual internship programs (company-owned, like courses)
-- - Virtual internship tasks (like assignments, but within programs)
-- - Task attachments (resources provided by company)
-- - Program enrollments (students apply/enroll in programs)
-- - Task submissions (mirror assignment_submissions)
-- - Submission files (mirror assignment_submission_files)
-- - Submission messages (mirror submission_messages)
--
-- Virtual internships work like assignments but are independent:
-- - Company creates programs (like courses)
-- - Company creates tasks within programs (like assignments)
-- - Students enroll/apply to programs
-- - Students submit work for tasks (like assignment submissions)
-- - Company grades/evaluates submissions (like instructor grading)
-- - Completion leads to internship certificate (not assignment grade)
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. Virtual internship programs (like courses, but company-owned)
CREATE TABLE IF NOT EXISTS virtual_internship_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    organization_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    duration_weeks INTEGER,
    skill_requirements JSONB,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'closed'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT virtual_internship_programs_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
    CONSTRAINT virtual_internship_programs_status_check CHECK (status IN ('draft', 'published', 'closed')),
    CONSTRAINT virtual_internship_programs_duration_positive CHECK (duration_weeks IS NULL OR duration_weeks > 0)
);

-- 2. Virtual internship tasks (like assignments, but within programs)
CREATE TABLE IF NOT EXISTS virtual_internship_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES virtual_internship_programs(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    max_marks DECIMAL(10, 2) DEFAULT 100.00,
    passing_marks DECIMAL(10, 2) DEFAULT 50.00,
    due_date TIMESTAMPTZ NOT NULL,
    allow_late_submission BOOLEAN DEFAULT false,
    late_submission_penalty DECIMAL(5, 2) DEFAULT 0.00,
    max_file_size_mb INTEGER DEFAULT 10,
    allowed_file_types TEXT[],
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'closed'
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT virtual_internship_tasks_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
    CONSTRAINT virtual_internship_tasks_marks_positive CHECK (max_marks > 0 AND passing_marks >= 0),
    CONSTRAINT virtual_internship_tasks_passing_valid CHECK (passing_marks <= max_marks),
    CONSTRAINT virtual_internship_tasks_penalty_valid CHECK (late_submission_penalty >= 0 AND late_submission_penalty <= 100),
    CONSTRAINT virtual_internship_tasks_status_check CHECK (status IN ('draft', 'published', 'closed'))
);

-- 3. Task attachments (resources provided by company)
CREATE TABLE IF NOT EXISTS virtual_internship_task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES virtual_internship_tasks(id) ON DELETE CASCADE,
    file_key TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT virtual_internship_task_attachments_size_positive CHECK (file_size_bytes > 0)
);

-- 4. Program enrollments (students apply/enroll in programs)
CREATE TABLE IF NOT EXISTS virtual_internship_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES virtual_internship_programs(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrollment_status VARCHAR(20) DEFAULT 'applied', -- 'applied', 'accepted', 'in_progress', 'completed', 'withdrawn'
    enrolled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(program_id, student_id),
    CONSTRAINT virtual_internship_enrollments_status_check CHECK (enrollment_status IN ('applied', 'accepted', 'in_progress', 'completed', 'withdrawn'))
);

-- 5. Task submissions (mirror assignment_submissions)
CREATE TABLE IF NOT EXISTS virtual_internship_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES virtual_internship_tasks(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES virtual_internship_programs(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_late BOOLEAN DEFAULT false,
    marks_obtained DECIMAL(10, 2) NULL,
    feedback TEXT,
    graded_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ NULL,
    status VARCHAR(20) DEFAULT 'submitted', -- 'submitted', 'graded', 'returned'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(task_id, student_id),
    CONSTRAINT virtual_internship_submissions_marks_valid CHECK (marks_obtained IS NULL OR marks_obtained >= 0),
    CONSTRAINT virtual_internship_submissions_status_check CHECK (status IN ('submitted', 'graded', 'returned'))
);

-- 6. Submission files (mirror assignment_submission_files)
CREATE TABLE IF NOT EXISTS virtual_internship_submission_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES virtual_internship_submissions(id) ON DELETE CASCADE,
    file_key TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT virtual_internship_submission_files_size_positive CHECK (file_size_bytes > 0)
);

-- 7. Submission messages (mirror submission_messages)
CREATE TABLE IF NOT EXISTS virtual_internship_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES virtual_internship_submissions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT virtual_internship_messages_text_length CHECK (char_length(message_text) >= 1)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Virtual internship programs indexes
CREATE INDEX IF NOT EXISTS idx_virtual_internship_programs_company_user_id ON virtual_internship_programs(company_user_id);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_programs_organization_id ON virtual_internship_programs(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_virtual_internship_programs_status ON virtual_internship_programs(status);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_programs_created_at ON virtual_internship_programs(created_at DESC);

-- Virtual internship tasks indexes
CREATE INDEX IF NOT EXISTS idx_virtual_internship_tasks_program_id ON virtual_internship_tasks(program_id);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_tasks_created_by ON virtual_internship_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_tasks_status ON virtual_internship_tasks(status);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_tasks_due_date ON virtual_internship_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_tasks_program_status ON virtual_internship_tasks(program_id, status);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_tasks_order ON virtual_internship_tasks(program_id, order_index);

-- Task attachments indexes
CREATE INDEX IF NOT EXISTS idx_virtual_internship_task_attachments_task_id ON virtual_internship_task_attachments(task_id);

-- Program enrollments indexes
CREATE INDEX IF NOT EXISTS idx_virtual_internship_enrollments_program_id ON virtual_internship_enrollments(program_id);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_enrollments_student_id ON virtual_internship_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_enrollments_status ON virtual_internship_enrollments(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_enrollments_program_student ON virtual_internship_enrollments(program_id, student_id);

-- Task submissions indexes
CREATE INDEX IF NOT EXISTS idx_virtual_internship_submissions_task_id ON virtual_internship_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_submissions_student_id ON virtual_internship_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_submissions_program_id ON virtual_internship_submissions(program_id);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_submissions_status ON virtual_internship_submissions(status);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_submissions_graded_by ON virtual_internship_submissions(graded_by) WHERE graded_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_virtual_internship_submissions_submitted_at ON virtual_internship_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_submissions_task_student ON virtual_internship_submissions(task_id, student_id);

-- Submission files indexes
CREATE INDEX IF NOT EXISTS idx_virtual_internship_submission_files_submission_id ON virtual_internship_submission_files(submission_id);

-- Submission messages indexes
CREATE INDEX IF NOT EXISTS idx_virtual_internship_messages_submission_id ON virtual_internship_messages(submission_id);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_messages_sender_id ON virtual_internship_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_virtual_internship_messages_created_at ON virtual_internship_messages(created_at DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMP
-- ============================================================================

-- Ensure update_updated_at_column function exists (should already exist from previous migrations)
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

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_virtual_internship_programs_updated_at ON virtual_internship_programs;
CREATE TRIGGER trigger_update_virtual_internship_programs_updated_at
    BEFORE UPDATE ON virtual_internship_programs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_virtual_internship_tasks_updated_at ON virtual_internship_tasks;
CREATE TRIGGER trigger_update_virtual_internship_tasks_updated_at
    BEFORE UPDATE ON virtual_internship_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_virtual_internship_enrollments_updated_at ON virtual_internship_enrollments;
CREATE TRIGGER trigger_update_virtual_internship_enrollments_updated_at
    BEFORE UPDATE ON virtual_internship_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_virtual_internship_submissions_updated_at ON virtual_internship_submissions;
CREATE TRIGGER trigger_update_virtual_internship_submissions_updated_at
    BEFORE UPDATE ON virtual_internship_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE virtual_internship_programs IS 'Virtual internship programs created by companies. Similar to courses but company-owned and focused on real-world tasks.';
COMMENT ON TABLE virtual_internship_tasks IS 'Tasks within virtual internship programs. Similar to assignments but within programs. Students submit work for evaluation.';
COMMENT ON TABLE virtual_internship_task_attachments IS 'Resources/files provided by companies for virtual internship tasks.';
COMMENT ON TABLE virtual_internship_enrollments IS 'Student enrollments/applications to virtual internship programs. Tracks enrollment status and completion.';
COMMENT ON TABLE virtual_internship_submissions IS 'Student submissions for virtual internship tasks. Mirrors assignment_submissions structure.';
COMMENT ON TABLE virtual_internship_submission_files IS 'Files submitted by students for virtual internship tasks. Mirrors assignment_submission_files structure.';
COMMENT ON TABLE virtual_internship_messages IS 'Messages between companies and students regarding virtual internship submissions. Mirrors submission_messages structure.';

COMMENT ON COLUMN virtual_internship_programs.company_user_id IS 'Company user who created the program';
COMMENT ON COLUMN virtual_internship_tasks.program_id IS 'Virtual internship program this task belongs to';
COMMENT ON COLUMN virtual_internship_enrollments.enrollment_status IS 'Status: applied (pending), accepted (enrolled), in_progress (active), completed (finished), withdrawn (cancelled)';
COMMENT ON COLUMN virtual_internship_submissions.program_id IS 'Program ID for easier querying (denormalized for performance)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

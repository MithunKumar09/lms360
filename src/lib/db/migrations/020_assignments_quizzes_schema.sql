-- ============================================================================
-- Migration: 020_assignments_quizzes_schema.sql
-- Description: Assignments and Quizzes schema for complete assignment and quiz management
-- Created: 2025-01-XX
-- Dependencies: 001_initial_schema.sql, 011_courses_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - Assignments (course-linked, instructor-created)
-- - Assignment submissions and files
-- - Quizzes (global, org-specific, or course-linked)
-- - Quiz questions, options, and attempts
-- - Submission messages for instructor-student communication
--
-- Supports multi-tenancy with org_id and course_id (both optional for quizzes)
-- ============================================================================

-- ============================================================================
-- ENUMS (if needed - using VARCHAR with CHECK constraints instead for flexibility)
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    max_marks DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
    passing_marks DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    allow_late_submission BOOLEAN NOT NULL DEFAULT false,
    late_submission_penalty DECIMAL(5, 2) DEFAULT 0.00, -- Percentage penalty
    max_file_size_mb INTEGER DEFAULT 10,
    allowed_file_types TEXT[], -- ['pdf', 'doc', 'docx', 'jpg', 'png']
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'closed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT assignments_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
    CONSTRAINT assignments_marks_positive CHECK (max_marks > 0 AND passing_marks >= 0),
    CONSTRAINT assignments_passing_valid CHECK (passing_marks <= max_marks),
    CONSTRAINT assignments_penalty_valid CHECK (late_submission_penalty >= 0 AND late_submission_penalty <= 100),
    CONSTRAINT assignments_status_check CHECK (status IN ('draft', 'published', 'closed'))
);

-- 2. Assignment attachments table (Assignment Files/Resources)
CREATE TABLE IF NOT EXISTS assignment_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    file_key TEXT NOT NULL, -- S3/R2 key
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT assignment_attachments_size_positive CHECK (file_size_bytes > 0)
);

-- 3. Assignment submissions table
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_late BOOLEAN NOT NULL DEFAULT false,
    marks_obtained DECIMAL(10, 2) NULL,
    feedback TEXT,
    graded_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMP WITH TIME ZONE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted', -- 'submitted', 'graded', 'returned'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT assignment_submissions_marks_valid CHECK (marks_obtained IS NULL OR marks_obtained >= 0),
    CONSTRAINT assignment_submissions_status_check CHECK (status IN ('submitted', 'graded', 'returned')),
    CONSTRAINT assignment_submissions_unique_student_assignment UNIQUE(assignment_id, student_id)
);

-- 4. Assignment submission files table
CREATE TABLE IF NOT EXISTS assignment_submission_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    file_key TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT assignment_submission_files_size_positive CHECK (file_size_bytes > 0)
);

-- 5. Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NULL REFERENCES courses(id) ON DELETE CASCADE, -- NULL for global/org/standalone quizzes
    org_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL, -- NULL for global, set for org-specific
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    total_marks DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
    passing_marks DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
    time_limit_minutes INTEGER NULL, -- NULL = no time limit
    max_attempts INTEGER NOT NULL DEFAULT 1,
    show_results_immediately BOOLEAN NOT NULL DEFAULT false,
    show_correct_answers BOOLEAN NOT NULL DEFAULT false,
    randomize_questions BOOLEAN NOT NULL DEFAULT false,
    randomize_options BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'closed'
    start_date TIMESTAMP WITH TIME ZONE NULL,
    end_date TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT quizzes_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
    CONSTRAINT quizzes_marks_positive CHECK (total_marks > 0 AND passing_marks >= 0),
    CONSTRAINT quizzes_passing_valid CHECK (passing_marks <= total_marks),
    CONSTRAINT quizzes_time_limit_positive CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
    CONSTRAINT quizzes_max_attempts_positive CHECK (max_attempts > 0),
    CONSTRAINT quizzes_status_check CHECK (status IN ('draft', 'published', 'closed')),
    CONSTRAINT quizzes_date_range_valid CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- 6. Quiz questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL, -- 'multiple_choice', 'true_false', 'short_answer', 'essay'
    marks DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT quiz_questions_marks_positive CHECK (marks > 0),
    CONSTRAINT quiz_questions_type_check CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay'))
);

-- 7. Quiz question options table
CREATE TABLE IF NOT EXISTS quiz_question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT quiz_question_options_text_length CHECK (char_length(option_text) >= 1)
);

-- 8. Quiz attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE NULL,
    time_taken_seconds INTEGER NULL,
    marks_obtained DECIMAL(10, 2) NULL,
    percentage_score DECIMAL(5, 2) NULL,
    is_passed BOOLEAN NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'submitted', 'timeout', 'abandoned'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT quiz_attempts_marks_valid CHECK (marks_obtained IS NULL OR marks_obtained >= 0),
    CONSTRAINT quiz_attempts_percentage_valid CHECK (percentage_score IS NULL OR (percentage_score >= 0 AND percentage_score <= 100)),
    CONSTRAINT quiz_attempts_time_positive CHECK (time_taken_seconds IS NULL OR time_taken_seconds >= 0),
    CONSTRAINT quiz_attempts_status_check CHECK (status IN ('in_progress', 'submitted', 'timeout', 'abandoned'))
);

-- 9. Quiz attempt answers table
CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    answer_text TEXT NULL, -- For short_answer and essay
    selected_option_ids UUID[], -- For multiple_choice
    is_correct BOOLEAN NULL,
    marks_obtained DECIMAL(10, 2) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT quiz_attempt_answers_marks_valid CHECK (marks_obtained IS NULL OR marks_obtained >= 0)
);

-- 10. Submission messages table (For Instructor-Student Chat)
CREATE TABLE IF NOT EXISTS submission_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL, -- Can reference assignment_submissions or quiz_attempts
    submission_type VARCHAR(20) NOT NULL, -- 'assignment' or 'quiz'
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT submission_messages_type_check CHECK (submission_type IN ('assignment', 'quiz')),
    CONSTRAINT submission_messages_text_length CHECK (char_length(message_text) >= 1)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Assignments indexes
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_course_status ON assignments(course_id, status);

-- Assignment attachments indexes
CREATE INDEX IF NOT EXISTS idx_assignment_attachments_assignment_id ON assignment_attachments(assignment_id);

-- Assignment submissions indexes
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_graded_by ON assignment_submissions(graded_by);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_submitted_at ON assignment_submissions(submitted_at DESC);

-- Assignment submission files indexes
CREATE INDEX IF NOT EXISTS idx_assignment_submission_files_submission_id ON assignment_submission_files(submission_id);

-- Quizzes indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_org_id ON quizzes(org_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quizzes_start_date ON quizzes(start_date);
CREATE INDEX IF NOT EXISTS idx_quizzes_end_date ON quizzes(end_date);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_org ON quizzes(course_id, org_id) WHERE course_id IS NOT NULL OR org_id IS NOT NULL;

-- Quiz questions indexes
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON quiz_questions(quiz_id, order_index);

-- Quiz question options indexes
CREATE INDEX IF NOT EXISTS idx_quiz_question_options_question_id ON quiz_question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_options_order ON quiz_question_options(question_id, order_index);

-- Quiz attempts indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON quiz_attempts(status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_submitted_at ON quiz_attempts(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_student ON quiz_attempts(quiz_id, student_id);

-- Quiz attempt answers indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_attempt_id ON quiz_attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_question_id ON quiz_attempt_answers(question_id);

-- Submission messages indexes
CREATE INDEX IF NOT EXISTS idx_submission_messages_submission ON submission_messages(submission_id, submission_type);
CREATE INDEX IF NOT EXISTS idx_submission_messages_sender_id ON submission_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_submission_messages_created_at ON submission_messages(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Use existing update_updated_at_column() function from previous migrations
-- If it doesn't exist, create it
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

-- Triggers for updated_at timestamp
CREATE TRIGGER trigger_update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_assignment_submissions_updated_at
    BEFORE UPDATE ON assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_quizzes_updated_at
    BEFORE UPDATE ON quizzes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_quiz_questions_updated_at
    BEFORE UPDATE ON quiz_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_quiz_attempts_updated_at
    BEFORE UPDATE ON quiz_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_quiz_attempt_answers_updated_at
    BEFORE UPDATE ON quiz_attempt_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE assignments IS 'Assignments created by instructors for their courses';
COMMENT ON TABLE assignment_attachments IS 'File attachments/resources for assignments stored in R2/S3';
COMMENT ON TABLE assignment_submissions IS 'Student submissions for assignments with grading information';
COMMENT ON TABLE assignment_submission_files IS 'Files submitted by students for assignments';
COMMENT ON TABLE quizzes IS 'Quizzes that can be global, org-specific, or course-linked (course_id optional)';
COMMENT ON TABLE quiz_questions IS 'Questions for quizzes with different types (MC, True/False, Short Answer, Essay)';
COMMENT ON TABLE quiz_question_options IS 'Options for multiple choice and true/false questions';
COMMENT ON TABLE quiz_attempts IS 'Student attempts for quizzes with scoring and timing information';
COMMENT ON TABLE quiz_attempt_answers IS 'Answers provided by students for each question in a quiz attempt';
COMMENT ON TABLE submission_messages IS 'Messages between instructors and students regarding submissions';

COMMENT ON COLUMN assignments.course_id IS 'Course ID - REQUIRED for assignments (must be linked to a course)';
COMMENT ON COLUMN assignments.created_by IS 'Instructor who created the assignment';
COMMENT ON COLUMN quizzes.course_id IS 'Course ID - OPTIONAL for quizzes (NULL for standalone/global/org quizzes)';
COMMENT ON COLUMN quizzes.org_id IS 'Organization ID - NULL for global, set for org-specific quizzes';
COMMENT ON COLUMN submission_messages.submission_id IS 'References either assignment_submissions.id or quiz_attempts.id based on submission_type';
COMMENT ON COLUMN submission_messages.submission_type IS 'Type of submission: assignment or quiz';


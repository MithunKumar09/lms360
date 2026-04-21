-- ============================================================================
-- Migration: 056_mentor_sessions_materials_notes_schema.sql
-- Description: Mentor Sessions, Materials, and Notes Schema
-- Created: 2025-01-XX
-- Dependencies: 053_mentor_tasks_schema.sql, 031_vendor_mentor_registration_schema.sql, 004_users_schema.sql, 003_classes_subjects_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - mentor_sessions: Mentoring sessions scheduling and management
-- - mentor_materials: Learning materials sharing system
-- - mentor_notes: Private notes for mentors
--
-- Supports enhanced mentor-student interaction features
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. mentor_sessions table
-- Stores mentoring sessions (scheduled meetings, virtual sessions, etc.)
CREATE TABLE IF NOT EXISTS mentor_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cohort_id UUID NULL REFERENCES cohorts(id) ON DELETE SET NULL,
    session_type VARCHAR(20) NOT NULL DEFAULT 'one_on_one', -- one_on_one, group, virtual, in_person
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    meeting_link TEXT NULL,
    location TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT mentor_sessions_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 255),
    CONSTRAINT mentor_sessions_session_type_check CHECK (session_type IN ('one_on_one', 'group', 'virtual', 'in_person')),
    CONSTRAINT mentor_sessions_status_check CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT mentor_sessions_duration_positive CHECK (duration_minutes > 0)
);

-- 2. mentor_session_students table
-- Many-to-many relationship between sessions and students
CREATE TABLE IF NOT EXISTS mentor_session_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES mentor_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_status VARCHAR(20) NULL DEFAULT NULL, -- attended, absent, excused
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT mentor_session_students_unique UNIQUE (session_id, student_id),
    CONSTRAINT mentor_session_students_attendance_check CHECK (attendance_status IS NULL OR attendance_status IN ('attended', 'absent', 'excused'))
);

-- 3. mentor_materials table
-- Stores learning materials shared by mentors
CREATE TABLE IF NOT EXISTS mentor_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cohort_id UUID NULL REFERENCES cohorts(id) ON DELETE SET NULL,
    student_id UUID NULL REFERENCES users(id) ON DELETE SET NULL, -- NULL for cohort-wide materials
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NULL, -- document, video, link, other
    file_key TEXT NULL,
    file_url TEXT NULL,
    external_url TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT mentor_materials_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 255),
    CONSTRAINT mentor_materials_category_check CHECK (category IS NULL OR category IN ('document', 'video', 'link', 'other')),
    CONSTRAINT mentor_materials_has_content CHECK (file_url IS NOT NULL OR external_url IS NOT NULL)
);

-- 4. mentor_notes table
-- Private notes for mentors (not visible to students)
CREATE TABLE IF NOT EXISTS mentor_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cohort_id UUID NULL REFERENCES cohorts(id) ON DELETE SET NULL,
    note_type VARCHAR(50) NOT NULL DEFAULT 'general', -- general, progress, meeting, feedback
    title VARCHAR(255) NULL,
    content TEXT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT mentor_notes_title_length CHECK (title IS NULL OR (char_length(title) >= 1 AND char_length(title) <= 255)),
    CONSTRAINT mentor_notes_content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 10000),
    CONSTRAINT mentor_notes_note_type_check CHECK (note_type IN ('general', 'progress', 'meeting', 'feedback'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for mentor_sessions
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_mentor_id ON mentor_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_cohort_id ON mentor_sessions(cohort_id) WHERE cohort_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_status ON mentor_sessions(status);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_scheduled_at ON mentor_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_session_type ON mentor_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_mentor_scheduled ON mentor_sessions(mentor_id, scheduled_at);

-- Indexes for mentor_session_students
CREATE INDEX IF NOT EXISTS idx_mentor_session_students_session_id ON mentor_session_students(session_id);
CREATE INDEX IF NOT EXISTS idx_mentor_session_students_student_id ON mentor_session_students(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_session_students_attendance ON mentor_session_students(attendance_status) WHERE attendance_status IS NOT NULL;

-- Indexes for mentor_materials
CREATE INDEX IF NOT EXISTS idx_mentor_materials_mentor_id ON mentor_materials(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_materials_cohort_id ON mentor_materials(cohort_id) WHERE cohort_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_materials_student_id ON mentor_materials(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_materials_category ON mentor_materials(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_materials_created_at ON mentor_materials(created_at DESC);

-- Indexes for mentor_notes
CREATE INDEX IF NOT EXISTS idx_mentor_notes_mentor_id ON mentor_notes(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_notes_student_id ON mentor_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_notes_cohort_id ON mentor_notes(cohort_id) WHERE cohort_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mentor_notes_note_type ON mentor_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_mentor_notes_is_private ON mentor_notes(is_private);
CREATE INDEX IF NOT EXISTS idx_mentor_notes_created_at ON mentor_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_notes_mentor_student ON mentor_notes(mentor_id, student_id);

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

-- Trigger for mentor_sessions updated_at
DROP TRIGGER IF EXISTS trigger_update_mentor_sessions_updated_at ON mentor_sessions;
CREATE TRIGGER trigger_update_mentor_sessions_updated_at
    BEFORE UPDATE ON mentor_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for mentor_materials updated_at
DROP TRIGGER IF EXISTS trigger_update_mentor_materials_updated_at ON mentor_materials;
CREATE TRIGGER trigger_update_mentor_materials_updated_at
    BEFORE UPDATE ON mentor_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for mentor_notes updated_at
DROP TRIGGER IF EXISTS trigger_update_mentor_notes_updated_at ON mentor_notes;
CREATE TRIGGER trigger_update_mentor_notes_updated_at
    BEFORE UPDATE ON mentor_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE mentor_sessions IS 'Stores mentoring sessions (scheduled meetings, virtual sessions, etc.). Sessions can be one-on-one or group sessions.';
COMMENT ON COLUMN mentor_sessions.mentor_id IS 'UUID of the mentor hosting the session';
COMMENT ON COLUMN mentor_sessions.cohort_id IS 'Optional cohort association for the session';
COMMENT ON COLUMN mentor_sessions.session_type IS 'Type of session: one_on_one, group, virtual, or in_person';
COMMENT ON COLUMN mentor_sessions.status IS 'Current status: scheduled, in_progress, completed, or cancelled';
COMMENT ON COLUMN mentor_sessions.meeting_link IS 'Virtual meeting link (Zoom, Teams, etc.) for virtual sessions';
COMMENT ON COLUMN mentor_sessions.location IS 'Physical location for in-person sessions';

COMMENT ON TABLE mentor_session_students IS 'Many-to-many relationship between sessions and students. Tracks which students are invited to which sessions.';
COMMENT ON COLUMN mentor_session_students.attendance_status IS 'Attendance status: attended, absent, or excused';

COMMENT ON TABLE mentor_materials IS 'Stores learning materials shared by mentors. Materials can be cohort-wide or student-specific.';
COMMENT ON COLUMN mentor_materials.mentor_id IS 'UUID of the mentor sharing the material';
COMMENT ON COLUMN mentor_materials.student_id IS 'UUID of the student (NULL for cohort-wide materials)';
COMMENT ON COLUMN mentor_materials.category IS 'Material category: document, video, link, or other';
COMMENT ON COLUMN mentor_materials.file_key IS 'Storage key (S3/R2) for uploaded files';
COMMENT ON COLUMN mentor_materials.file_url IS 'Public URL for uploaded files';
COMMENT ON COLUMN mentor_materials.external_url IS 'External URL for linked materials';

COMMENT ON TABLE mentor_notes IS 'Private notes for mentors (not visible to students). Used for tracking student progress, meeting notes, feedback, etc.';
COMMENT ON COLUMN mentor_notes.mentor_id IS 'UUID of the mentor who owns the note';
COMMENT ON COLUMN mentor_notes.student_id IS 'UUID of the student this note is about';
COMMENT ON COLUMN mentor_notes.note_type IS 'Note type: general, progress, meeting, or feedback';
COMMENT ON COLUMN mentor_notes.is_private IS 'Whether the note is private (always true for now, but allows for future shared notes)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

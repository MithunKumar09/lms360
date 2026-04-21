-- ============================================================================
-- Migration: 011_courses_schema.sql
-- Description: Courses table schema for published courses
-- Created: 2025-01-XX
-- Dependencies: 001_initial_schema.sql, 009_course_settings_schema.sql
-- ============================================================================
-- 
-- This migration creates the courses table and related tables for:
-- - Published courses
-- - Course modules, chapters, and lessons
-- - Course instructors, classes, subjects relationships
-- - Course tags and skills
--
-- Supports multi-tenancy with org_id (NULL for global/superadmin)
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Course status enum
DO $$ BEGIN
    CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Lesson type enum
DO $$ BEGIN
    CREATE TYPE lesson_type AS ENUM ('video', 'text', 'quiz', 'assignment', 'material');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    org_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL,
    category_id UUID NULL REFERENCES course_categories(id) ON DELETE SET NULL,
    subcategory_id UUID NULL REFERENCES course_subcategories(id) ON DELETE SET NULL,
    course_type_id UUID NULL REFERENCES course_types(id) ON DELETE SET NULL,
    program_type_id UUID NULL REFERENCES program_types(id) ON DELETE SET NULL,
    course_level_id UUID NULL REFERENCES course_levels(id) ON DELETE SET NULL,
    regular_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discounted_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    about_course TEXT,
    intro_video_url TEXT,
    description TEXT,
    language VARCHAR(50) DEFAULT 'English',
    start_date TIMESTAMP WITH TIME ZONE NULL,
    certificate_template_id UUID NULL, -- Future FK to certificate_templates
    status course_status NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT courses_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
    CONSTRAINT courses_slug_format CHECK (slug ~* '^[a-z0-9-]+$'),
    CONSTRAINT courses_slug_length CHECK (char_length(slug) >= 3 AND char_length(slug) <= 255),
    CONSTRAINT courses_price_positive CHECK (regular_price >= 0 AND discounted_price >= 0),
    CONSTRAINT courses_discount_valid CHECK (discounted_price <= regular_price)
);

-- Course Modules table
CREATE TABLE IF NOT EXISTS course_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT course_modules_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 255)
);

-- Course Chapters table
CREATE TABLE IF NOT EXISTS course_chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT course_chapters_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 255)
);

-- Course Lessons table
CREATE TABLE IF NOT EXISTS course_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID NOT NULL REFERENCES course_chapters(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    lesson_type lesson_type NOT NULL DEFAULT 'video',
    video_url TEXT,
    text_content TEXT,
    quiz_id UUID NULL, -- Future FK to quizzes table
    assignment_id UUID NULL, -- Future FK to assignments table
    material_url TEXT,
    duration INTEGER NULL, -- Duration in seconds
    order_index INTEGER NOT NULL DEFAULT 0,
    is_preview BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT course_lessons_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 255)
);

-- Course Instructors (many-to-many)
CREATE TABLE IF NOT EXISTS course_instructors (
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (course_id, instructor_id)
);

-- Course Classes (many-to-many)
CREATE TABLE IF NOT EXISTS course_classes (
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    class_id UUID NOT NULL, -- Future FK to classes table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (course_id, class_id)
);

-- Course Subjects (many-to-many)
CREATE TABLE IF NOT EXISTS course_subjects (
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL, -- Future FK to subjects table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (course_id, subject_id)
);

-- Course Skills (many-to-many) - Junction table
CREATE TABLE IF NOT EXISTS courses_skills (
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES course_skills(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (course_id, skill_id)
);

-- Course Tags (stored as array in courses table, but also as separate table for better querying)
CREATE TABLE IF NOT EXISTS course_tags (
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (course_id, tag),
    CONSTRAINT course_tags_tag_length CHECK (char_length(tag) >= 1 AND char_length(tag) <= 100)
);

-- Course Requirements (stored as array in courses table, but also as separate table for better querying)
CREATE TABLE IF NOT EXISTS course_requirements (
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    requirement TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (course_id, order_index),
    CONSTRAINT course_requirements_requirement_length CHECK (char_length(requirement) >= 1)
);

-- Lesson Transcripts table
CREATE TABLE IF NOT EXISTS lesson_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
    transcript_text TEXT NOT NULL,
    transcript_data JSONB, -- Structured transcript with timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT lesson_transcripts_text_length CHECK (char_length(transcript_text) >= 1)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_org_id ON courses(org_id);
CREATE INDEX IF NOT EXISTS idx_courses_category_id ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_subcategory_id ON courses(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);

-- Course Modules indexes
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_order ON course_modules(course_id, order_index);

-- Course Chapters indexes
CREATE INDEX IF NOT EXISTS idx_course_chapters_module_id ON course_chapters(module_id);
CREATE INDEX IF NOT EXISTS idx_course_chapters_order ON course_chapters(module_id, order_index);

-- Course Lessons indexes
CREATE INDEX IF NOT EXISTS idx_course_lessons_chapter_id ON course_lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_order ON course_lessons(chapter_id, order_index);
CREATE INDEX IF NOT EXISTS idx_course_lessons_type ON course_lessons(lesson_type);

-- Relationship indexes
CREATE INDEX IF NOT EXISTS idx_course_instructors_course ON course_instructors(course_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_instructor ON course_instructors(instructor_id);
CREATE INDEX IF NOT EXISTS idx_course_classes_course ON course_classes(course_id);
CREATE INDEX IF NOT EXISTS idx_course_subjects_course ON course_subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_skills_course ON courses_skills(course_id);
CREATE INDEX IF NOT EXISTS idx_course_tags_course ON course_tags(course_id);
CREATE INDEX IF NOT EXISTS idx_course_requirements_course ON course_requirements(course_id);

-- Lesson Transcripts indexes
CREATE INDEX IF NOT EXISTS idx_lesson_transcripts_lesson_id ON lesson_transcripts(lesson_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp for courses
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_courses_updated_at();

-- Auto-update updated_at timestamp for course_modules
CREATE TRIGGER trigger_update_course_modules_updated_at
    BEFORE UPDATE ON course_modules
    FOR EACH ROW
    EXECUTE FUNCTION update_courses_updated_at();

-- Auto-update updated_at timestamp for course_chapters
CREATE TRIGGER trigger_update_course_chapters_updated_at
    BEFORE UPDATE ON course_chapters
    FOR EACH ROW
    EXECUTE FUNCTION update_courses_updated_at();

-- Auto-update updated_at timestamp for course_lessons
CREATE TRIGGER trigger_update_course_lessons_updated_at
    BEFORE UPDATE ON course_lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_courses_updated_at();

-- Auto-update updated_at timestamp for lesson_transcripts
CREATE TRIGGER trigger_update_lesson_transcripts_updated_at
    BEFORE UPDATE ON lesson_transcripts
    FOR EACH ROW
    EXECUTE FUNCTION update_courses_updated_at();


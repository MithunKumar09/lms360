-- ============================================================================
-- Migration: 009_course_settings_schema.sql
-- Description: Course settings schema with categories, types, levels, skills, testimonials, and access control
-- Created: 2025-01-XX
-- Dependencies: 001_initial_schema.sql (for UUID extension and users table)
-- ============================================================================
-- 
-- This migration creates tables for course settings management:
-- - course_categories: Course categories with optional thumbnails
-- - course_subcategories: Subcategories linked to parent categories
-- - course_types: Course types (Free, Paid, etc.)
-- - program_types: Program types (Academic, Soft-Skill, etc.)
-- - course_levels: Course levels (Beginner, Intermediate, etc.)
-- - course_skills: Course skills with optional category mapping
-- - testimonials: Student testimonials with ratings
-- - access_control_settings: RBAC settings for admin access control
--
-- All tables support org_id for multi-tenancy (NULL for global/superadmin)
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Course Categories
CREATE TABLE IF NOT EXISTS course_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NULL, -- NULL for global (superadmin), org_id for admin
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    thumbnail_url VARCHAR(500) NULL, -- Image upload URL
    status SMALLINT DEFAULT 1, -- 1=active, 0=inactive
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT course_categories_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
    CONSTRAINT course_categories_status_check CHECK (status IN (0, 1))
);

-- Course Subcategories
CREATE TABLE IF NOT EXISTS course_subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES course_categories(id) ON DELETE CASCADE,
    org_id UUID NULL, -- NULL for global, org_id for admin
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    status SMALLINT DEFAULT 1,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT course_subcategories_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
    CONSTRAINT course_subcategories_status_check CHECK (status IN (0, 1))
);

-- Course Types
CREATE TABLE IF NOT EXISTS course_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NULL, -- NULL for global, org_id for admin
    name VARCHAR(100) NOT NULL,
    fixed SMALLINT DEFAULT 0, -- 1=system default (Free, Paid), 0=editable
    status SMALLINT DEFAULT 1,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT course_types_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    CONSTRAINT course_types_fixed_check CHECK (fixed IN (0, 1)),
    CONSTRAINT course_types_status_check CHECK (status IN (0, 1)),
    CONSTRAINT course_types_unique_org_name UNIQUE(org_id, name)
);

-- Program Types
CREATE TABLE IF NOT EXISTS program_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NULL, -- NULL for global, org_id for admin
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(100) NULL, -- Icon class or name
    color VARCHAR(7) NULL, -- Hex color code
    status SMALLINT DEFAULT 1,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT program_types_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
    CONSTRAINT program_types_status_check CHECK (status IN (0, 1)),
    CONSTRAINT program_types_color_format CHECK (color IS NULL OR color ~* '^#[0-9A-Fa-f]{6}$')
);

-- Course Levels
CREATE TABLE IF NOT EXISTS course_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NULL, -- NULL for global, org_id for admin
    name VARCHAR(100) NOT NULL,
    status SMALLINT DEFAULT 1,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT course_levels_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    CONSTRAINT course_levels_status_check CHECK (status IN (0, 1))
);

-- Course Skills
CREATE TABLE IF NOT EXISTS course_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NULL, -- NULL for global, org_id for admin
    name VARCHAR(255) NOT NULL,
    category_id UUID NULL REFERENCES course_categories(id) ON DELETE SET NULL, -- Optional mapping
    subcategory_id UUID NULL REFERENCES course_subcategories(id) ON DELETE SET NULL, -- Optional mapping
    status SMALLINT DEFAULT 1,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT course_skills_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
    CONSTRAINT course_skills_status_check CHECK (status IN (0, 1))
);

-- Testimonials
CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NULL, -- NULL for global, org_id for admin
    student_name VARCHAR(255) NOT NULL,
    photo_url VARCHAR(500) NULL,
    course_id UUID NULL, -- Optional course reference (future FK to courses table)
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    message TEXT NOT NULL,
    status SMALLINT DEFAULT 1, -- 1=active/visible, 0=hidden
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT testimonials_student_name_length CHECK (char_length(student_name) >= 1 AND char_length(student_name) <= 255),
    CONSTRAINT testimonials_message_length CHECK (char_length(message) >= 1),
    CONSTRAINT testimonials_status_check CHECK (status IN (0, 1))
);

-- Access Control Settings
CREATE TABLE IF NOT EXISTS access_control_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(50) NOT NULL DEFAULT 'admin', -- Currently only 'admin'
    feature_name VARCHAR(100) NOT NULL, -- 'categories', 'subcategories', 'types', etc.
    read_access SMALLINT DEFAULT 0, -- 1=read allowed, 0=read denied
    write_access SMALLINT DEFAULT 0, -- 1=write allowed, 0=write denied
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT access_control_settings_role_format CHECK (role ~* '^[a-z_]+$'),
    CONSTRAINT access_control_settings_feature_format CHECK (feature_name ~* '^[a-z_]+$'),
    CONSTRAINT access_control_settings_read_check CHECK (read_access IN (0, 1)),
    CONSTRAINT access_control_settings_write_check CHECK (write_access IN (0, 1)),
    CONSTRAINT access_control_settings_unique_role_feature UNIQUE(role, feature_name)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Course Categories indexes
CREATE INDEX IF NOT EXISTS idx_course_categories_org_id ON course_categories(org_id);
CREATE INDEX IF NOT EXISTS idx_course_categories_status ON course_categories(status);
CREATE INDEX IF NOT EXISTS idx_course_categories_created_by ON course_categories(created_by);
CREATE INDEX IF NOT EXISTS idx_course_categories_created_at ON course_categories(created_at);

-- Course Subcategories indexes
CREATE INDEX IF NOT EXISTS idx_course_subcategories_category_id ON course_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_course_subcategories_org_id ON course_subcategories(org_id);
CREATE INDEX IF NOT EXISTS idx_course_subcategories_status ON course_subcategories(status);

-- Course Types indexes
CREATE INDEX IF NOT EXISTS idx_course_types_org_id ON course_types(org_id);
CREATE INDEX IF NOT EXISTS idx_course_types_fixed ON course_types(fixed);
CREATE INDEX IF NOT EXISTS idx_course_types_status ON course_types(status);

-- Program Types indexes
CREATE INDEX IF NOT EXISTS idx_program_types_org_id ON program_types(org_id);
CREATE INDEX IF NOT EXISTS idx_program_types_status ON program_types(status);

-- Course Levels indexes
CREATE INDEX IF NOT EXISTS idx_course_levels_org_id ON course_levels(org_id);
CREATE INDEX IF NOT EXISTS idx_course_levels_status ON course_levels(status);

-- Course Skills indexes
CREATE INDEX IF NOT EXISTS idx_course_skills_org_id ON course_skills(org_id);
CREATE INDEX IF NOT EXISTS idx_course_skills_category_id ON course_skills(category_id);
CREATE INDEX IF NOT EXISTS idx_course_skills_subcategory_id ON course_skills(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_course_skills_status ON course_skills(status);

-- Testimonials indexes
CREATE INDEX IF NOT EXISTS idx_testimonials_org_id ON testimonials(org_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_course_id ON testimonials(course_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_status ON testimonials(status);
CREATE INDEX IF NOT EXISTS idx_testimonials_rating ON testimonials(rating);

-- Access Control Settings indexes
CREATE INDEX IF NOT EXISTS idx_access_control_settings_role ON access_control_settings(role);
CREATE INDEX IF NOT EXISTS idx_access_control_settings_feature ON access_control_settings(feature_name);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger function for updated_at (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at on all tables
DROP TRIGGER IF EXISTS update_course_categories_updated_at ON course_categories;
CREATE TRIGGER update_course_categories_updated_at
    BEFORE UPDATE ON course_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_subcategories_updated_at ON course_subcategories;
CREATE TRIGGER update_course_subcategories_updated_at
    BEFORE UPDATE ON course_subcategories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_types_updated_at ON course_types;
CREATE TRIGGER update_course_types_updated_at
    BEFORE UPDATE ON course_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_program_types_updated_at ON program_types;
CREATE TRIGGER update_program_types_updated_at
    BEFORE UPDATE ON program_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_levels_updated_at ON course_levels;
CREATE TRIGGER update_course_levels_updated_at
    BEFORE UPDATE ON course_levels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_skills_updated_at ON course_skills;
CREATE TRIGGER update_course_skills_updated_at
    BEFORE UPDATE ON course_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_testimonials_updated_at ON testimonials;
CREATE TRIGGER update_testimonials_updated_at
    BEFORE UPDATE ON testimonials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_access_control_settings_updated_at ON access_control_settings;
CREATE TRIGGER update_access_control_settings_updated_at
    BEFORE UPDATE ON access_control_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default course types (Free, Paid) as global (org_id = NULL)
-- These are fixed and cannot be deleted
-- Note: created_by should be set to a superadmin user ID, using a placeholder UUID
-- In production, replace with actual superadmin user ID or handle via seeder

DO $$
DECLARE
    superadmin_user_id UUID;
BEGIN
    -- Get first superadmin user, or use a default UUID if none exists
    SELECT id INTO superadmin_user_id FROM users WHERE role = 'superadmin' LIMIT 1;
    
    -- If no superadmin exists, we'll skip default data insertion
    -- This can be handled later via a seeder script
    IF superadmin_user_id IS NOT NULL THEN
        -- Insert Free course type (if not exists)
        INSERT INTO course_types (org_id, name, fixed, status, created_by)
        SELECT NULL, 'Free', 1, 1, superadmin_user_id
        WHERE NOT EXISTS (
            SELECT 1 FROM course_types WHERE org_id IS NULL AND name = 'Free'
        );
        
        -- Insert Paid course type (if not exists)
        INSERT INTO course_types (org_id, name, fixed, status, created_by)
        SELECT NULL, 'Paid', 1, 1, superadmin_user_id
        WHERE NOT EXISTS (
            SELECT 1 FROM course_types WHERE org_id IS NULL AND name = 'Paid'
        );
        
        -- Insert default course levels (if not exists)
        INSERT INTO course_levels (org_id, name, status, created_by)
        SELECT NULL, level_name, 1, superadmin_user_id
        FROM (VALUES 
            ('Beginner'),
            ('Intermediate'),
            ('Advanced'),
            ('All levels')
        ) AS levels(level_name)
        WHERE NOT EXISTS (
            SELECT 1 FROM course_levels WHERE org_id IS NULL AND name = level_name
        );
    END IF;
END $$;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE course_categories IS 'Course categories with optional thumbnails. org_id NULL for global (superadmin), org_id for admin org-specific';
COMMENT ON TABLE course_subcategories IS 'Course subcategories linked to parent categories';
COMMENT ON TABLE course_types IS 'Course types (Free, Paid, etc.). fixed=1 for system defaults that cannot be deleted';
COMMENT ON TABLE program_types IS 'Program types (Academic, Soft-Skill, Internship, etc.)';
COMMENT ON TABLE course_levels IS 'Course levels (Beginner, Intermediate, Advanced, All levels)';
COMMENT ON TABLE course_skills IS 'Course skills with optional category/subcategory mapping';
COMMENT ON TABLE testimonials IS 'Student testimonials with ratings and optional course reference';
COMMENT ON TABLE access_control_settings IS 'RBAC settings for controlling admin access to course settings features';

-- Column comments
COMMENT ON COLUMN course_categories.org_id IS 'NULL for global (superadmin), org_id for admin org-specific';
COMMENT ON COLUMN course_categories.thumbnail_url IS 'Image upload URL for category thumbnail';
COMMENT ON COLUMN course_categories.status IS '1=active, 0=inactive';
COMMENT ON COLUMN course_types.fixed IS '1=system default (cannot be deleted), 0=editable';
COMMENT ON COLUMN course_types.org_id IS 'NULL for global, org_id for admin org-specific. Unique constraint on (org_id, name)';
COMMENT ON COLUMN program_types.icon IS 'Icon class or name for UI display';
COMMENT ON COLUMN program_types.color IS 'Hex color code (e.g., #5f2ded)';
COMMENT ON COLUMN course_skills.category_id IS 'Optional mapping to category';
COMMENT ON COLUMN course_skills.subcategory_id IS 'Optional mapping to subcategory';
COMMENT ON COLUMN testimonials.rating IS 'Rating from 1 to 5';
COMMENT ON COLUMN testimonials.status IS '1=active/visible, 0=hidden';
COMMENT ON COLUMN access_control_settings.role IS 'Role name (currently only admin)';
COMMENT ON COLUMN access_control_settings.feature_name IS 'Feature name: categories, subcategories, types, program_types, levels, skills, testimonials';
COMMENT ON COLUMN access_control_settings.read_access IS '1=read allowed, 0=read denied';
COMMENT ON COLUMN access_control_settings.write_access IS '1=write allowed, 0=write denied';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
--
-- Multi-tenancy Support:
-- - All tables support org_id for organization-specific data
-- - org_id = NULL means global (superadmin only)
-- - org_id = <uuid> means org-specific (admin can manage)
--
-- Default Data:
-- - Course Types: "Free" and "Paid" are inserted as fixed=1 (cannot be deleted)
-- - Course Levels: "Beginner", "Intermediate", "Advanced", "All levels" are inserted
-- - Default data is global (org_id = NULL)
-- - If no superadmin exists, default data insertion is skipped (can be handled via seeder)
--
-- Access Control:
-- - access_control_settings table controls admin read/write permissions
-- - Default: Admin has no access (read=0, write=0)
-- - Superadmin must enable access for each feature
--
-- Foreign Keys:
-- - All tables reference users(id) for created_by
-- - course_subcategories references course_categories(id) with CASCADE delete
-- - course_skills optionally references categories/subcategories with SET NULL on delete
--
-- Performance:
-- - Indexes added for org_id, status, and foreign keys
-- - Composite indexes for common query patterns
-- - Full-text search can be added later if needed
--
-- Next Steps:
-- - Run seeder script to populate default data if superadmin doesn't exist during migration
-- - Create API routes for CRUD operations
-- - Implement access control checks in API routes
-- ============================================================================


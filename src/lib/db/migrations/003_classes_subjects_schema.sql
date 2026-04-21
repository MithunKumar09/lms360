-- ============================================================================
-- Migration: 003_classes_subjects_schema.sql
-- Description: Database schema for Classes & Subjects feature
-- Created: 2025-01-XX
-- Dependencies: 001_initial_schema.sql, 002_organizations_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for academic management:
-- - academic_sessions: Academic year/session management
-- - terms: Year/semester terms (generic layer)
-- - sections: Class sections (A, B, C, etc.)
-- - program_nodes: Generic nodes for Stream/Faculty/Programme/Branch/Combination/Grade
-- - cohorts: Classes (combinations of program_node, section, session, term)
-- - subject_catalog: Master list of subjects per organization
-- - elective_groups: Elective pools/baskets
-- - elective_group_members: Members of elective groups
-- - subject_offerings: What a cohort studies (subjects + elective groups)
-- - teacher_assignments: Teacher assignments to subject offerings
--
-- All tables use UUID primary keys, TIMESTAMPTZ for timestamps, and include
-- comprehensive indexes, constraints, and triggers for data integrity.
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Academic sessions table
-- Represents academic years/sessions (e.g., 2025-26, 2026-27)
CREATE TABLE IF NOT EXISTS academic_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT academic_sessions_org_code_unique UNIQUE(org_id, code),
    CONSTRAINT academic_sessions_date_range CHECK (end_date > start_date)
);

-- Terms table
-- Generic year/semester layer (e.g., Year 1, Year 2, Sem 1, Sem 2)
CREATE TABLE IF NOT EXISTS terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    term_type VARCHAR(20) NOT NULL,
    number INTEGER NOT NULL,
    label VARCHAR(50) NOT NULL,
    scheme_year INTEGER NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT terms_term_type_check CHECK (term_type IN ('year', 'semester')),
    CONSTRAINT terms_org_type_number_label_unique UNIQUE(org_id, term_type, number, label)
);

-- Sections table
-- Class sections (A, B, C, etc.)
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    label VARCHAR(10) NOT NULL,
    capacity INTEGER NULL,
    room VARCHAR(50) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sections_org_label_unique UNIQUE(org_id, label),
    CONSTRAINT sections_capacity_check CHECK (capacity IS NULL OR capacity > 0)
);

-- Program nodes table
-- Generic node for Stream/Faculty/Programme/Branch/Combination/Grade/Department
-- Supports hierarchical structure via parent_id
CREATE TABLE IF NOT EXISTS program_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL,
    node_type VARCHAR(20) NOT NULL,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    parent_id UUID NULL REFERENCES program_nodes(id) ON DELETE CASCADE,
    metadata JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT program_nodes_level_check CHECK (level IN ('primary', 'high_school', 'puc', 'diploma', 'degree', 'engineering', 'post_graduation')),
    CONSTRAINT program_nodes_node_type_check CHECK (node_type IN ('stream', 'faculty', 'programme', 'branch', 'combination', 'grade', 'department')),
    CONSTRAINT program_nodes_status_check CHECK (status IN ('active', 'archived')),
    CONSTRAINT program_nodes_org_level_type_code_unique UNIQUE(org_id, level, node_type, code)
);

-- Cohorts table (the "class")
-- Represents a class: combination of program_node, section, session, and optionally term
CREATE TABLE IF NOT EXISTS cohorts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL,
    program_node_id UUID NOT NULL REFERENCES program_nodes(id) ON DELETE RESTRICT,
    term_id UUID NULL REFERENCES terms(id) ON DELETE SET NULL,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
    session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE RESTRICT,
    code VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_by_role VARCHAR(20) NOT NULL,
    locked_fields JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT cohorts_level_check CHECK (level IN ('primary', 'high_school', 'puc', 'diploma', 'degree', 'engineering', 'post_graduation')),
    CONSTRAINT cohorts_status_check CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT cohorts_created_by_role_check CHECK (created_by_role IN ('superadmin', 'admin')),
    CONSTRAINT cohorts_org_program_section_session_term_unique UNIQUE(org_id, program_node_id, section_id, session_id, term_id)
);

-- Subject catalog table
-- Master list of subjects per organization
CREATE TABLE IF NOT EXISTS subject_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(30) NOT NULL,
    credits NUMERIC(4,1) NULL,
    hours_per_week INTEGER NULL,
    syllabus_url TEXT NULL,
    exam_pattern JSONB NULL,
    level VARCHAR(20) NOT NULL,
    department_node_id UUID NULL REFERENCES program_nodes(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT subject_catalog_category_check CHECK (category IN ('core', 'elective', 'lab', 'mandatory', 'project', 'internship', 'aecc', 'sec', 'open_elective', 'prof_elective')),
    CONSTRAINT subject_catalog_level_check CHECK (level IN ('primary', 'high_school', 'puc', 'diploma', 'degree', 'engineering', 'post_graduation')),
    CONSTRAINT subject_catalog_status_check CHECK (status IN ('active', 'archived')),
    CONSTRAINT subject_catalog_credits_check CHECK (credits IS NULL OR credits >= 0),
    CONSTRAINT subject_catalog_hours_check CHECK (hours_per_week IS NULL OR hours_per_week > 0),
    CONSTRAINT subject_catalog_org_code_unique UNIQUE(org_id, code)
);

-- Elective groups table
-- Elective pools/baskets (groups of subjects students can choose from)
CREATE TABLE IF NOT EXISTS elective_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    program_node_id UUID NOT NULL REFERENCES program_nodes(id) ON DELETE CASCADE,
    term_id UUID NULL REFERENCES terms(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    pick_min INTEGER NOT NULL DEFAULT 1,
    pick_max INTEGER NOT NULL DEFAULT 1,
    rules JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT elective_groups_pick_min_check CHECK (pick_min >= 0),
    CONSTRAINT elective_groups_pick_max_check CHECK (pick_max >= pick_min),
    CONSTRAINT elective_groups_org_program_term_code_unique UNIQUE(org_id, program_node_id, term_id, code)
);

-- Elective group members table
-- Links subjects to elective groups
CREATE TABLE IF NOT EXISTS elective_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    elective_group_id UUID NOT NULL REFERENCES elective_groups(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subject_catalog(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT elective_group_members_unique UNIQUE(elective_group_id, subject_id)
);

-- Subject offerings table
-- What a cohort actually studies this term (subjects + elective groups)
CREATE TABLE IF NOT EXISTS subject_offerings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    subject_id UUID NULL REFERENCES subject_catalog(id) ON DELETE CASCADE,
    elective_group_id UUID NULL REFERENCES elective_groups(id) ON DELETE CASCADE,
    is_compulsory BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT subject_offerings_status_check CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT subject_offerings_subject_xor_elective CHECK (
        (subject_id IS NOT NULL AND elective_group_id IS NULL) OR
        (subject_id IS NULL AND elective_group_id IS NOT NULL)
    )
);

-- Teacher assignments table
-- Links teachers to subject offerings with load information
CREATE TABLE IF NOT EXISTS teacher_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subject_offering_id UUID NOT NULL REFERENCES subject_offerings(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    load JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT teacher_assignments_unique UNIQUE(subject_offering_id, teacher_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Academic sessions indexes
CREATE INDEX IF NOT EXISTS idx_academic_sessions_org_id ON academic_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_org_current ON academic_sessions(org_id, is_current);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_org_code ON academic_sessions(org_id, code);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_dates ON academic_sessions(start_date, end_date);

-- Terms indexes
CREATE INDEX IF NOT EXISTS idx_terms_org_id ON terms(org_id);
CREATE INDEX IF NOT EXISTS idx_terms_org_type ON terms(org_id, term_type);
CREATE INDEX IF NOT EXISTS idx_terms_org_type_number ON terms(org_id, term_type, number);

-- Sections indexes
CREATE INDEX IF NOT EXISTS idx_sections_org_id ON sections(org_id);
CREATE INDEX IF NOT EXISTS idx_sections_org_label ON sections(org_id, label);

-- Program nodes indexes
CREATE INDEX IF NOT EXISTS idx_program_nodes_org_id ON program_nodes(org_id);
CREATE INDEX IF NOT EXISTS idx_program_nodes_org_level ON program_nodes(org_id, level);
CREATE INDEX IF NOT EXISTS idx_program_nodes_org_node_type ON program_nodes(org_id, node_type);
CREATE INDEX IF NOT EXISTS idx_program_nodes_org_status ON program_nodes(org_id, status);
CREATE INDEX IF NOT EXISTS idx_program_nodes_parent_id ON program_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_program_nodes_metadata ON program_nodes USING GIN(metadata);

-- Cohorts indexes
CREATE INDEX IF NOT EXISTS idx_cohorts_org_id ON cohorts(org_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_org_status ON cohorts(org_id, status);
CREATE INDEX IF NOT EXISTS idx_cohorts_org_level ON cohorts(org_id, level);
CREATE INDEX IF NOT EXISTS idx_cohorts_program_node_id ON cohorts(program_node_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_session_id ON cohorts(session_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_term_id ON cohorts(term_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_section_id ON cohorts(section_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_created_by ON cohorts(created_by);

-- Subject catalog indexes
CREATE INDEX IF NOT EXISTS idx_subject_catalog_org_id ON subject_catalog(org_id);
CREATE INDEX IF NOT EXISTS idx_subject_catalog_org_code ON subject_catalog(org_id, code);
CREATE INDEX IF NOT EXISTS idx_subject_catalog_org_level ON subject_catalog(org_id, level);
CREATE INDEX IF NOT EXISTS idx_subject_catalog_org_status ON subject_catalog(org_id, status);
CREATE INDEX IF NOT EXISTS idx_subject_catalog_org_category ON subject_catalog(org_id, category);
CREATE INDEX IF NOT EXISTS idx_subject_catalog_department_node_id ON subject_catalog(department_node_id);
-- Full-text search index for subject code and title
CREATE INDEX IF NOT EXISTS idx_subject_catalog_search ON subject_catalog USING GIN(
    to_tsvector('simple', code || ' ' || title)
);

-- Elective groups indexes
CREATE INDEX IF NOT EXISTS idx_elective_groups_org_id ON elective_groups(org_id);
CREATE INDEX IF NOT EXISTS idx_elective_groups_program_node_id ON elective_groups(program_node_id);
CREATE INDEX IF NOT EXISTS idx_elective_groups_term_id ON elective_groups(term_id);
CREATE INDEX IF NOT EXISTS idx_elective_groups_org_program ON elective_groups(org_id, program_node_id);

-- Elective group members indexes
CREATE INDEX IF NOT EXISTS idx_elective_group_members_elective_group_id ON elective_group_members(elective_group_id);
CREATE INDEX IF NOT EXISTS idx_elective_group_members_subject_id ON elective_group_members(subject_id);

-- Subject offerings indexes
CREATE INDEX IF NOT EXISTS idx_subject_offerings_org_id ON subject_offerings(org_id);
CREATE INDEX IF NOT EXISTS idx_subject_offerings_cohort_id ON subject_offerings(cohort_id);
CREATE INDEX IF NOT EXISTS idx_subject_offerings_org_cohort ON subject_offerings(org_id, cohort_id);
CREATE INDEX IF NOT EXISTS idx_subject_offerings_org_status ON subject_offerings(org_id, status);
CREATE INDEX IF NOT EXISTS idx_subject_offerings_cohort_status ON subject_offerings(cohort_id, status);
CREATE INDEX IF NOT EXISTS idx_subject_offerings_subject_id ON subject_offerings(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_offerings_elective_group_id ON subject_offerings(elective_group_id);
-- Unique partial indexes for subject_id and elective_group_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_offerings_cohort_subject_unique 
    ON subject_offerings(cohort_id, subject_id) WHERE subject_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_offerings_cohort_elective_unique 
    ON subject_offerings(cohort_id, elective_group_id) WHERE elective_group_id IS NOT NULL;

-- Teacher assignments indexes
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_org_id ON teacher_assignments(org_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_subject_offering_id ON teacher_assignments(subject_offering_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_org_offering ON teacher_assignments(org_id, subject_offering_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_org_teacher ON teacher_assignments(org_id, teacher_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to validate cohort.level matches program_node.level
CREATE OR REPLACE FUNCTION validate_cohort_program_node_level()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM program_nodes
        WHERE id = NEW.program_node_id
        AND level = NEW.level
    ) THEN
        RAISE EXCEPTION 'Cohort level (%) does not match program_node level', NEW.level;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate subject_offerings has exactly one of subject_id or elective_group_id
CREATE OR REPLACE FUNCTION validate_subject_offering_xor()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.subject_id IS NULL AND NEW.elective_group_id IS NULL) OR
       (NEW.subject_id IS NOT NULL AND NEW.elective_group_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Subject offering must have exactly one of subject_id or elective_group_id';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at (using existing function)
DROP TRIGGER IF EXISTS update_academic_sessions_updated_at ON academic_sessions;
CREATE TRIGGER update_academic_sessions_updated_at
    BEFORE UPDATE ON academic_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_terms_updated_at ON terms;
CREATE TRIGGER update_terms_updated_at
    BEFORE UPDATE ON terms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sections_updated_at ON sections;
CREATE TRIGGER update_sections_updated_at
    BEFORE UPDATE ON sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_program_nodes_updated_at ON program_nodes;
CREATE TRIGGER update_program_nodes_updated_at
    BEFORE UPDATE ON program_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cohorts_updated_at ON cohorts;
CREATE TRIGGER update_cohorts_updated_at
    BEFORE UPDATE ON cohorts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subject_catalog_updated_at ON subject_catalog;
CREATE TRIGGER update_subject_catalog_updated_at
    BEFORE UPDATE ON subject_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_elective_groups_updated_at ON elective_groups;
CREATE TRIGGER update_elective_groups_updated_at
    BEFORE UPDATE ON elective_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subject_offerings_updated_at ON subject_offerings;
CREATE TRIGGER update_subject_offerings_updated_at
    BEFORE UPDATE ON subject_offerings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teacher_assignments_updated_at ON teacher_assignments;
CREATE TRIGGER update_teacher_assignments_updated_at
    BEFORE UPDATE ON teacher_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers for data validation
DROP TRIGGER IF EXISTS validate_cohort_level_trigger ON cohorts;
CREATE TRIGGER validate_cohort_level_trigger
    BEFORE INSERT OR UPDATE ON cohorts
    FOR EACH ROW
    EXECUTE FUNCTION validate_cohort_program_node_level();

DROP TRIGGER IF EXISTS validate_subject_offering_xor_trigger ON subject_offerings;
CREATE TRIGGER validate_subject_offering_xor_trigger
    BEFORE INSERT OR UPDATE ON subject_offerings
    FOR EACH ROW
    EXECUTE FUNCTION validate_subject_offering_xor();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

-- Table comments
COMMENT ON TABLE academic_sessions IS 'Academic year/session management (e.g., 2025-26, 2026-27)';
COMMENT ON TABLE terms IS 'Generic year/semester terms (e.g., Year 1, Year 2, Sem 1, Sem 2)';
COMMENT ON TABLE sections IS 'Class sections (A, B, C, etc.) with optional capacity and room';
COMMENT ON TABLE program_nodes IS 'Generic nodes for Stream/Faculty/Programme/Branch/Combination/Grade/Department with hierarchical support';
COMMENT ON TABLE cohorts IS 'Classes: combinations of program_node, section, session, and optionally term';
COMMENT ON TABLE subject_catalog IS 'Master list of subjects per organization with metadata';
COMMENT ON TABLE elective_groups IS 'Elective pools/baskets: groups of subjects students can choose from';
COMMENT ON TABLE elective_group_members IS 'Links subjects to elective groups';
COMMENT ON TABLE subject_offerings IS 'What a cohort actually studies: subjects and elective groups assigned to a cohort';
COMMENT ON TABLE teacher_assignments IS 'Teacher assignments to subject offerings with load information (LTP, slots, etc.)';

-- Academic sessions column comments
COMMENT ON COLUMN academic_sessions.code IS 'Session code (e.g., "2025-26")';
COMMENT ON COLUMN academic_sessions.start_date IS 'Start date of the academic session';
COMMENT ON COLUMN academic_sessions.end_date IS 'End date of the academic session (must be after start_date)';
COMMENT ON COLUMN academic_sessions.is_current IS 'Whether this is the current active session';

-- Terms column comments
COMMENT ON COLUMN terms.term_type IS 'Type of term: year or semester';
COMMENT ON COLUMN terms.number IS 'Term number (e.g., 1, 2, 3)';
COMMENT ON COLUMN terms.label IS 'Term label (e.g., "I PUC", "Sem 3")';
COMMENT ON COLUMN terms.scheme_year IS 'Scheme year (for regulation-based systems)';

-- Sections column comments
COMMENT ON COLUMN sections.label IS 'Section label (e.g., "A", "B", "C")';
COMMENT ON COLUMN sections.capacity IS 'Maximum capacity of the section (optional)';
COMMENT ON COLUMN sections.room IS 'Room/venue for the section (optional)';

-- Program nodes column comments
COMMENT ON COLUMN program_nodes.level IS 'Academic level: primary, high_school, puc, diploma, degree, engineering, post_graduation';
COMMENT ON COLUMN program_nodes.node_type IS 'Node type: stream, faculty, programme, branch, combination, grade, department';
COMMENT ON COLUMN program_nodes.code IS 'Node code (e.g., "ECBA", "PMCs", "CSE", "Grade-10")';
COMMENT ON COLUMN program_nodes.title IS 'Node title/name';
COMMENT ON COLUMN program_nodes.parent_id IS 'Parent node ID for hierarchical structure (NULL for root nodes)';
COMMENT ON COLUMN program_nodes.metadata IS 'Freeform JSONB for board, medium, regulation, etc.';
COMMENT ON COLUMN program_nodes.status IS 'Node status: active or archived';

-- Cohorts column comments
COMMENT ON COLUMN cohorts.level IS 'Academic level (must match program_node.level)';
COMMENT ON COLUMN cohorts.program_node_id IS 'Program node ID (combination/branch/grade)';
COMMENT ON COLUMN cohorts.term_id IS 'Term ID (optional, for term-specific cohorts)';
COMMENT ON COLUMN cohorts.section_id IS 'Section ID';
COMMENT ON COLUMN cohorts.session_id IS 'Academic session ID';
COMMENT ON COLUMN cohorts.code IS 'Human-readable cohort code (e.g., "I-PUC-ECBA-A-2025-27")';
COMMENT ON COLUMN cohorts.status IS 'Cohort status: draft, published, or archived';
COMMENT ON COLUMN cohorts.created_by IS 'User ID who created the cohort';
COMMENT ON COLUMN cohorts.created_by_role IS 'Role of the creator: superadmin or admin';
COMMENT ON COLUMN cohorts.locked_fields IS 'JSONB object of fields locked by superadmin (admins cannot edit these)';

-- Subject catalog column comments
COMMENT ON COLUMN subject_catalog.code IS 'Subject code (unique per organization)';
COMMENT ON COLUMN subject_catalog.title IS 'Subject title/name';
COMMENT ON COLUMN subject_catalog.category IS 'Subject category: core, elective, lab, mandatory, project, internship, aecc, sec, open_elective, prof_elective';
COMMENT ON COLUMN subject_catalog.credits IS 'Number of credits (NUMERIC 4,1)';
COMMENT ON COLUMN subject_catalog.hours_per_week IS 'Hours per week';
COMMENT ON COLUMN subject_catalog.syllabus_url IS 'URL to syllabus document';
COMMENT ON COLUMN subject_catalog.exam_pattern IS 'Exam pattern as JSONB (e.g., {"type": "semester", "weightage": {...}})';
COMMENT ON COLUMN subject_catalog.level IS 'Academic level for this subject';
COMMENT ON COLUMN subject_catalog.department_node_id IS 'Department node ID (for engineering/degree subjects)';
COMMENT ON COLUMN subject_catalog.status IS 'Subject status: active or archived';

-- Elective groups column comments
COMMENT ON COLUMN elective_groups.program_node_id IS 'Program node this elective group belongs to';
COMMENT ON COLUMN elective_groups.term_id IS 'Term ID (optional, for term-specific elective groups)';
COMMENT ON COLUMN elective_groups.code IS 'Elective group code';
COMMENT ON COLUMN elective_groups.title IS 'Elective group title';
COMMENT ON COLUMN elective_groups.pick_min IS 'Minimum number of subjects to pick from this group';
COMMENT ON COLUMN elective_groups.pick_max IS 'Maximum number of subjects to pick from this group';
COMMENT ON COLUMN elective_groups.rules IS 'Rules as JSONB (e.g., {"disallow_clash": true, "cross_dept": false})';

-- Subject offerings column comments
COMMENT ON COLUMN subject_offerings.cohort_id IS 'Cohort this offering belongs to';
COMMENT ON COLUMN subject_offerings.subject_id IS 'Subject ID (if offering a specific subject)';
COMMENT ON COLUMN subject_offerings.elective_group_id IS 'Elective group ID (if offering an elective group)';
COMMENT ON COLUMN subject_offerings.is_compulsory IS 'Whether this offering is compulsory';
COMMENT ON COLUMN subject_offerings.status IS 'Offering status: draft, published, or archived';

-- Teacher assignments column comments
COMMENT ON COLUMN teacher_assignments.subject_offering_id IS 'Subject offering ID';
COMMENT ON COLUMN teacher_assignments.teacher_id IS 'Teacher user ID';
COMMENT ON COLUMN teacher_assignments.load IS 'Load information as JSONB (e.g., {"L": 3, "T": 1, "P": 2, "slots": [...]})';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
--
-- Performance:
-- - Full-text search index on subject_catalog for fast code/title searching
-- - GIN index on program_nodes.metadata for JSONB queries
-- - Composite indexes for common query patterns (org_id + status, etc.)
-- - Partial unique indexes for subject_offerings (subject_id XOR elective_group_id)
--
-- Data Integrity:
-- - Triggers validate cohort.level matches program_node.level
-- - Triggers validate subject_offerings has exactly one of subject_id or elective_group_id
-- - Foreign keys with appropriate CASCADE/RESTRICT rules
-- - CHECK constraints for enum-like values
-- - UNIQUE constraints for business rules (e.g., org_id + code)
--
-- Security:
-- - All foreign keys properly indexed for performance
-- - CASCADE deletes for dependent data (e.g., sections when org deleted)
-- - RESTRICT deletes for critical references (e.g., cohorts when program_node deleted)
--
-- Next Steps:
-- - Run seeder to populate sample data for testing
-- - Create API routes for CRUD operations
-- - Implement validation schemas
-- ============================================================================


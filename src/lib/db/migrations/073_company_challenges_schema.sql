-- Migration: Company Challenges/Skill Testing Schema
-- Allows companies to create hackathons, coding challenges, case competitions, aptitude tests

-- Challenge types enum
DO $$ BEGIN
    CREATE TYPE challenge_type_enum AS ENUM ('hackathon', 'coding_challenge', 'case_competition', 'aptitude_test', 'project_submission');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Challenge status enum
DO $$ BEGIN
    CREATE TYPE challenge_status_enum AS ENUM ('draft', 'published', 'open', 'closed', 'evaluating', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Company challenges table
CREATE TABLE IF NOT EXISTS company_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    organization_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    challenge_type challenge_type_enum NOT NULL,
    instructions TEXT,
    evaluation_criteria TEXT,
    max_marks DECIMAL(10, 2) DEFAULT 100.00,
    passing_marks DECIMAL(10, 2) DEFAULT 50.00,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    submission_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    allow_late_submission BOOLEAN DEFAULT false,
    max_file_size_mb INTEGER DEFAULT 10,
    allowed_file_types TEXT[], -- ['pdf', 'zip', 'doc', 'docx', 'jpg', 'png', 'code']
    max_team_size INTEGER DEFAULT 1, -- 1 = individual, >1 = team challenge
    status challenge_status_enum DEFAULT 'draft',
    is_public BOOLEAN DEFAULT true, -- Public or invitation-only
    auto_evaluate BOOLEAN DEFAULT false, -- Automated scoring (for aptitude tests)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT company_challenges_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
    CONSTRAINT company_challenges_marks_positive CHECK (max_marks > 0 AND passing_marks >= 0),
    CONSTRAINT company_challenges_passing_valid CHECK (passing_marks <= max_marks),
    CONSTRAINT company_challenges_date_range_valid CHECK (end_date >= start_date AND submission_deadline >= start_date),
    CONSTRAINT company_challenges_file_size_positive CHECK (max_file_size_mb > 0),
    CONSTRAINT company_challenges_team_size_positive CHECK (max_team_size > 0)
);

-- Challenge attachments (resources, test cases, datasets)
CREATE TABLE IF NOT EXISTS company_challenge_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES company_challenges(id) ON DELETE CASCADE,
    file_key TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Challenge submissions
CREATE TABLE IF NOT EXISTS company_challenge_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES company_challenges(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_name VARCHAR(255) NULL, -- For team submissions
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_late BOOLEAN DEFAULT false,
    marks_obtained DECIMAL(10, 2) NULL,
    percentage_score DECIMAL(5, 2) NULL,
    is_passed BOOLEAN NULL,
    feedback TEXT,
    evaluated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    evaluated_at TIMESTAMP WITH TIME ZONE NULL,
    status VARCHAR(20) DEFAULT 'submitted', -- 'submitted', 'evaluating', 'evaluated', 'passed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT company_challenge_submissions_marks_valid CHECK (marks_obtained IS NULL OR marks_obtained >= 0),
    CONSTRAINT company_challenge_submissions_percentage_valid CHECK (percentage_score IS NULL OR (percentage_score >= 0 AND percentage_score <= 100))
);

-- Submission files
CREATE TABLE IF NOT EXISTS company_challenge_submission_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES company_challenge_submissions(id) ON DELETE CASCADE,
    file_key TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_challenges_company_user_id ON company_challenges(company_user_id);
CREATE INDEX IF NOT EXISTS idx_company_challenges_organization_id ON company_challenges(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_challenges_status ON company_challenges(status);
CREATE INDEX IF NOT EXISTS idx_company_challenges_challenge_type ON company_challenges(challenge_type);
CREATE INDEX IF NOT EXISTS idx_company_challenges_start_date ON company_challenges(start_date);
CREATE INDEX IF NOT EXISTS idx_company_challenges_end_date ON company_challenges(end_date);
CREATE INDEX IF NOT EXISTS idx_company_challenge_submissions_challenge_id ON company_challenge_submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_company_challenge_submissions_student_id ON company_challenge_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_company_challenge_submissions_status ON company_challenge_submissions(status);

-- Updated timestamp trigger
CREATE TRIGGER trigger_update_company_challenges_updated_at
    BEFORE UPDATE ON company_challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE company_challenges IS 'Company-created challenges (hackathons, coding challenges, case competitions, aptitude tests)';
COMMENT ON TABLE company_challenge_attachments IS 'Resources and files provided by company for challenges';
COMMENT ON TABLE company_challenge_submissions IS 'Student submissions for company challenges';
COMMENT ON TABLE company_challenge_submission_files IS 'Files submitted by students for challenges';

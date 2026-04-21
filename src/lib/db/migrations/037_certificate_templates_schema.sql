-- ============================================================================
-- Migration: 037_certificate_templates_schema.sql
-- Description: Create certificate_templates and certificates tables
-- Created: 2025-01-XX
-- Dependencies: 011_courses_schema.sql, 004_users_schema.sql
-- ============================================================================

-- Certificate Templates table
CREATE TABLE IF NOT EXISTS certificate_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('prebuilt', 'uploaded')),
    template_html TEXT, -- For prebuilt HTML templates with {{placeholders}}
    file_url TEXT, -- For uploaded PDFs/images
    thumbnail_url TEXT, -- Thumbnail for template selection UI
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT certificate_templates_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
    CONSTRAINT certificate_templates_prebuilt_has_html CHECK (
        (type = 'prebuilt' AND template_html IS NOT NULL) OR
        (type = 'uploaded' AND file_url IS NOT NULL)
    )
);

-- Certificates table (generated certificates per user/course)
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES certificate_templates(id) ON DELETE SET NULL,
    certificate_url TEXT NOT NULL, -- Generated PDF URL (stored in R2)
    qr_code_url TEXT, -- QR code image URL
    verification_code VARCHAR(100) UNIQUE, -- Unique verification code for certificate
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT certificates_unique_user_course UNIQUE(course_id, user_id),
    CONSTRAINT certificates_verification_code_length CHECK (char_length(verification_code) >= 10)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Certificate Templates indexes
CREATE INDEX IF NOT EXISTS idx_certificate_templates_type ON certificate_templates(type);
CREATE INDEX IF NOT EXISTS idx_certificate_templates_is_default ON certificate_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_certificate_templates_created_by ON certificate_templates(created_by);

-- Certificates indexes
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_template_id ON certificates(template_id);
CREATE INDEX IF NOT EXISTS idx_certificates_verification_code ON certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_at ON certificates(issued_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp for certificate_templates
CREATE TRIGGER trigger_update_certificate_templates_updated_at
    BEFORE UPDATE ON certificate_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_courses_updated_at();

-- Auto-update updated_at timestamp for certificates
CREATE TRIGGER trigger_update_certificates_updated_at
    BEFORE UPDATE ON certificates
    FOR EACH ROW
    EXECUTE FUNCTION update_courses_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE certificate_templates IS 'Prebuilt and uploaded certificate templates';
COMMENT ON COLUMN certificate_templates.type IS 'Type: prebuilt (HTML template) or uploaded (PDF/Image)';
COMMENT ON COLUMN certificate_templates.template_html IS 'HTML template with {{placeholders}} for prebuilt templates';
COMMENT ON COLUMN certificate_templates.file_url IS 'URL of uploaded PDF/image for uploaded templates';
COMMENT ON TABLE certificates IS 'Generated certificates for users who completed courses';
COMMENT ON COLUMN certificates.verification_code IS 'Unique code for certificate verification';
COMMENT ON COLUMN certificates.certificate_url IS 'URL of generated PDF certificate stored in R2';


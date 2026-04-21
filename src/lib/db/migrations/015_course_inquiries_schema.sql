-- ============================================================================
-- Migration: 015_course_inquiries_schema.sql
-- Description: Create course_inquiries table for course contact/inquiry form submissions
-- Created: 2024-01-XX
-- ============================================================================

-- Course Inquiries Table
CREATE TABLE IF NOT EXISTS course_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'new', -- new, read, replied, archived
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT course_inquiries_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT course_inquiries_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 255),
  CONSTRAINT course_inquiries_message_length CHECK (char_length(message) >= 10 AND char_length(message) <= 5000),
  CONSTRAINT course_inquiries_status_check CHECK (status IN ('new', 'read', 'replied', 'archived'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_inquiries_course_id ON course_inquiries(course_id);
CREATE INDEX IF NOT EXISTS idx_course_inquiries_status ON course_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_course_inquiries_created_at ON course_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_inquiries_email ON course_inquiries(email);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_course_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_course_inquiries_updated_at
  BEFORE UPDATE ON course_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_course_inquiries_updated_at();


-- ============================================================================
-- Migration: 016_course_comments_schema.sql
-- Description: Create course_comments table for course comment system with replies support
-- Created: 2024-01-XX
-- ============================================================================

-- Course Comments Table
CREATE TABLE IF NOT EXISTS course_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES course_comments(id) ON DELETE CASCADE, -- For replies
  comment_text TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT course_comments_text_length CHECK (char_length(comment_text) >= 1 AND char_length(comment_text) <= 5000),
  CONSTRAINT course_comments_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_comments_course_id ON course_comments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_comments_user_id ON course_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_comments_parent_id ON course_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_course_comments_status ON course_comments(status);
CREATE INDEX IF NOT EXISTS idx_course_comments_created_at ON course_comments(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_course_comments_course_status ON course_comments(course_id, status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_course_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_course_comments_updated_at
  BEFORE UPDATE ON course_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_course_comments_updated_at();


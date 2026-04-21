-- ============================================================================
-- Migration: 014_lesson_watch_progress_schema.sql
-- Description: Create lesson_watch_progress table for tracking lesson watch duration
-- Created: 2024-01-XX
-- ============================================================================

-- Lesson Watch Progress Table
CREATE TABLE IF NOT EXISTS lesson_watch_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  watch_duration INTEGER DEFAULT 0, -- seconds watched
  total_duration INTEGER NOT NULL, -- total lesson duration in seconds
  completed BOOLEAN DEFAULT FALSE,
  last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lesson_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lesson_watch_progress_lesson_id ON lesson_watch_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_watch_progress_user_id ON lesson_watch_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_watch_progress_completed ON lesson_watch_progress(completed);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lesson_watch_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lesson_watch_progress_updated_at
  BEFORE UPDATE ON lesson_watch_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_watch_progress_updated_at();


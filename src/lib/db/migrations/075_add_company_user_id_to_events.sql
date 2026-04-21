-- Migration: Add company_user_id to events table
-- Allows companies to host recruitment events (campus drives, workshops, webinars, etc.)

-- Add company_user_id column (nullable)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS company_user_id UUID NULL REFERENCES users(id) ON DELETE RESTRICT;

-- Add index for company_user_id lookups
CREATE INDEX IF NOT EXISTS idx_events_company_user_id ON events(company_user_id) WHERE company_user_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN events.company_user_id IS 'Company user who owns this event. NULL for vendor/mentor-created events.';

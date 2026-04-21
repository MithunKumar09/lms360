-- ============================================================================
-- Migration: 042_workshop_slot_tracking.sql
-- Description: Add slot tracking columns to workshop_registrations table
-- Created: 2025-01-XX
-- Dependencies: 040_event_workshop_registrations.sql
-- ============================================================================

-- Add slot tracking columns to workshop_registrations
ALTER TABLE workshop_registrations 
ADD COLUMN IF NOT EXISTS slot_number INTEGER NULL,
ADD COLUMN IF NOT EXISTS slot_booked_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS waitlist_position INTEGER NULL;

-- Index for slot queries
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_slot_number 
ON workshop_registrations(workshop_id, slot_number) 
WHERE slot_number IS NOT NULL;

-- Index for waitlist queries
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_waitlist 
ON workshop_registrations(workshop_id, waitlist_position) 
WHERE waitlist_position IS NOT NULL;

-- Index for slot booking time queries
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_slot_booked_at 
ON workshop_registrations(workshop_id, slot_booked_at DESC) 
WHERE slot_booked_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN workshop_registrations.slot_number IS 'Slot number assigned to this registration (1-based). NULL if on waitlist.';
COMMENT ON COLUMN workshop_registrations.slot_booked_at IS 'Timestamp when the slot was booked.';
COMMENT ON COLUMN workshop_registrations.waitlist_position IS 'Position in waitlist (1-based). NULL if not on waitlist.';

-- Migration: Update notifications table to support vendor_request and mentor_request types
-- Date: 2025-01-XX
-- Description: Adds vendor_request and mentor_request to the allowed notification types

-- Drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with vendor_request and mentor_request types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
        'instructor_request',
        'vendor_request',
        'mentor_request',
        'request_accepted',
        'request_rejected',
        'general'
    )
);


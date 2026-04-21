-- ============================================================================
-- Migration: 058_mentor_notifications_schema.sql
-- Description: Mentor notifications and preferences schema
-- Created: 2025-01-XX
-- Dependencies: 004_users_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - mentor_notifications: Stores notifications for mentors
-- - notification_preferences: Stores notification preferences for mentors
--
-- Supports the Mentor dashboard notification system
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Notification type enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum') THEN
        CREATE TYPE notification_type_enum AS ENUM (
            'new_registration',
            'new_application',
            'capacity_warning',
            'capacity_full',
            'event_reminder',
            'workshop_reminder',
            'application_status_change',
            'system_announcement'
        );
    END IF;
END $$;

-- Notification channel enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel_enum') THEN
        CREATE TYPE notification_channel_enum AS ENUM ('in_app', 'email', 'both');
    END IF;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- mentor_notifications table
-- Stores notifications for mentors
CREATE TABLE IF NOT EXISTS mentor_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification details
    type notification_type_enum NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB NULL, -- Additional data (event_id, application_id, etc.)
    
    -- Read status
    read BOOLEAN DEFAULT FALSE NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Indexes will be created below
    CONSTRAINT mentor_notifications_title_length CHECK (char_length(title) > 0),
    CONSTRAINT mentor_notifications_message_length CHECK (char_length(message) > 0)
);

-- notification_preferences table
-- Stores notification preferences for mentors
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Preference details
    notification_type notification_type_enum NOT NULL,
    enabled BOOLEAN DEFAULT TRUE NOT NULL,
    channel notification_channel_enum DEFAULT 'in_app' NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    UNIQUE(mentor_id, notification_type)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for mentor_notifications
CREATE INDEX IF NOT EXISTS idx_mentor_notifications_mentor_id ON mentor_notifications(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_notifications_read ON mentor_notifications(mentor_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_mentor_notifications_created_at ON mentor_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_notifications_type ON mentor_notifications(type);
CREATE INDEX IF NOT EXISTS idx_mentor_notifications_mentor_read_created ON mentor_notifications(mentor_id, read, created_at DESC);

-- Indexes for notification_preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_mentor_id ON notification_preferences(mentor_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_enabled ON notification_preferences(mentor_id, enabled) WHERE enabled = TRUE;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMP
-- ============================================================================

-- Trigger for notification_preferences updated_at
DROP TRIGGER IF EXISTS trigger_update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE mentor_notifications IS 'Stores notifications for mentors. Supports various notification types and read status tracking.';
COMMENT ON COLUMN mentor_notifications.mentor_id IS 'Reference to the mentor user';
COMMENT ON COLUMN mentor_notifications.type IS 'Type of notification: new_registration, new_application, capacity_warning, capacity_full, event_reminder, workshop_reminder, application_status_change, system_announcement';
COMMENT ON COLUMN mentor_notifications.title IS 'Notification title';
COMMENT ON COLUMN mentor_notifications.message IS 'Notification message/content';
COMMENT ON COLUMN mentor_notifications.data IS 'Additional JSON data (event_id, application_id, etc.)';
COMMENT ON COLUMN mentor_notifications.read IS 'Whether the notification has been read';
COMMENT ON COLUMN mentor_notifications.read_at IS 'Timestamp when the notification was read';

COMMENT ON TABLE notification_preferences IS 'Stores notification preferences for mentors. Allows mentors to configure which notifications they receive and through which channels.';
COMMENT ON COLUMN notification_preferences.mentor_id IS 'Reference to the mentor user';
COMMENT ON COLUMN notification_preferences.notification_type IS 'Type of notification this preference applies to';
COMMENT ON COLUMN notification_preferences.enabled IS 'Whether this notification type is enabled';
COMMENT ON COLUMN notification_preferences.channel IS 'Notification channel: in_app, email, or both';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- ============================================================================
-- Migration: 032_events_workshops_schema.sql
-- Description: Events & Workshops Schema for Vendor Dashboard
-- Created: 2025-01-XX
-- Dependencies: 004_users_schema.sql, 002_organizations_schema.sql, 031_vendor_mentor_registration_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - events: Events created by vendors
-- - workshops: Workshops created by vendors/mentors
--
-- Supports the Vendor & Mentor dashboard features
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Event/Workshop mode enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_mode_enum') THEN
        CREATE TYPE event_mode_enum AS ENUM ('online', 'offline', 'live');
    END IF;
END $$;

-- Event/Workshop status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status_enum') THEN
        CREATE TYPE event_status_enum AS ENUM ('draft', 'published', 'cancelled', 'completed');
    END IF;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. events table
-- Stores events created by vendors
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    banner_url TEXT NULL,
    
    -- Dates
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Mode and links
    mode event_mode_enum NOT NULL DEFAULT 'online',
    external_link TEXT NULL, -- Zoom/Meet/YouTube link
    
    -- Pricing
    is_free BOOLEAN NOT NULL DEFAULT true,
    price DECIMAL(10, 2) NULL CHECK (price IS NULL OR price >= 0),
    
    -- Capacity
    capacity INTEGER NULL CHECK (capacity IS NULL OR capacity > 0),
    
    -- Vendor information
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    organization_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Status
    status event_status_enum NOT NULL DEFAULT 'draft',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT events_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
    CONSTRAINT events_end_after_start CHECK (end_date >= start_date),
    CONSTRAINT events_price_when_paid CHECK (
        (is_free = true AND price IS NULL) OR 
        (is_free = false AND price IS NOT NULL)
    ),
    CONSTRAINT events_external_link_when_online CHECK (
        (mode != 'online') OR (external_link IS NOT NULL)
    )
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_organization_id ON events(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_mode ON events(mode);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- Full-text search index for events
CREATE INDEX IF NOT EXISTS idx_events_search ON events USING gin(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));

-- 2. workshops table
-- Stores workshops created by vendors/mentors
CREATE TABLE IF NOT EXISTS workshops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    banner_url TEXT NULL,
    
    -- Dates
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Mode and links
    mode event_mode_enum NOT NULL DEFAULT 'online',
    external_link TEXT NULL, -- Zoom/Meet/YouTube link
    
    -- Pricing
    is_free BOOLEAN NOT NULL DEFAULT true,
    price DECIMAL(10, 2) NULL CHECK (price IS NULL OR price >= 0),
    
    -- Capacity
    capacity INTEGER NULL CHECK (capacity IS NULL OR capacity > 0),
    
    -- Creator information
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    organization_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Status
    status event_status_enum NOT NULL DEFAULT 'draft',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT workshops_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
    CONSTRAINT workshops_end_after_start CHECK (end_date >= start_date),
    CONSTRAINT workshops_price_when_paid CHECK (
        (is_free = true AND price IS NULL) OR 
        (is_free = false AND price IS NOT NULL)
    ),
    CONSTRAINT workshops_external_link_when_online CHECK (
        (mode != 'online') OR (external_link IS NOT NULL)
    )
);

-- Indexes for workshops
CREATE INDEX IF NOT EXISTS idx_workshops_created_by ON workshops(created_by);
CREATE INDEX IF NOT EXISTS idx_workshops_organization_id ON workshops(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workshops_status ON workshops(status);
CREATE INDEX IF NOT EXISTS idx_workshops_start_date ON workshops(start_date);
CREATE INDEX IF NOT EXISTS idx_workshops_end_date ON workshops(end_date);
CREATE INDEX IF NOT EXISTS idx_workshops_mode ON workshops(mode);
CREATE INDEX IF NOT EXISTS idx_workshops_created_at ON workshops(created_at DESC);

-- Full-text search index for workshops
CREATE INDEX IF NOT EXISTS idx_workshops_search ON workshops USING gin(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMP
-- ============================================================================

-- Ensure update_updated_at_column function exists (reuse from previous migrations)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $fn$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Trigger for events updated_at
DROP TRIGGER IF EXISTS trigger_update_events_updated_at ON events;
CREATE TRIGGER trigger_update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for workshops updated_at
DROP TRIGGER IF EXISTS trigger_update_workshops_updated_at ON workshops;
CREATE TRIGGER trigger_update_workshops_updated_at
    BEFORE UPDATE ON workshops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE events IS 'Stores events created by vendors. Events can be online, offline, or live, and can be free or paid.';
COMMENT ON COLUMN events.mode IS 'Event mode: online (requires external_link), offline, or live';
COMMENT ON COLUMN events.external_link IS 'Zoom/Meet/YouTube link for online events';
COMMENT ON COLUMN events.is_free IS 'Whether the event is free. If false, price must be set.';
COMMENT ON COLUMN events.price IS 'Price in Indian Rupees (INR). Required if is_free is false.';
COMMENT ON COLUMN events.capacity IS 'Maximum number of participants. NULL means unlimited.';
COMMENT ON COLUMN events.organization_id IS 'Organization associated with the event (from vendor_organizations)';

COMMENT ON TABLE workshops IS 'Stores workshops created by vendors/mentors. Workshops can be online, offline, or live, and can be free or paid.';
COMMENT ON COLUMN workshops.mode IS 'Workshop mode: online (requires external_link), offline, or live';
COMMENT ON COLUMN workshops.external_link IS 'Zoom/Meet/YouTube link for online workshops';
COMMENT ON COLUMN workshops.is_free IS 'Whether the workshop is free. If false, price must be set.';
COMMENT ON COLUMN workshops.price IS 'Price in Indian Rupees (INR). Required if is_free is false.';
COMMENT ON COLUMN workshops.capacity IS 'Maximum number of participants. NULL means unlimited.';
COMMENT ON COLUMN workshops.organization_id IS 'Organization associated with the workshop (for vendors: from vendor_organizations, for mentors: from user.org_id)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


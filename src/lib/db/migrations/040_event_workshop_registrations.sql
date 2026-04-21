-- ============================================================================
-- Migration: 040_event_workshop_registrations.sql
-- Description: Event and Workshop registrations schema for payment integration
-- Created: 2025-01-XX
-- Dependencies: 032_events_workshops_schema.sql, 039_payment_schema.sql
-- ============================================================================

-- Event registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID NULL REFERENCES orders(id) ON DELETE SET NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    registration_status VARCHAR(50) DEFAULT 'registered', -- registered, cancelled, attended, no_show
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, refunded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Ensure a user can only register once per event
    UNIQUE(event_id, user_id),
    
    CONSTRAINT event_registrations_status_check CHECK (
        registration_status IN ('registered', 'cancelled', 'attended', 'no_show')
    ),
    CONSTRAINT event_registrations_payment_status_check CHECK (
        payment_status IN ('pending', 'paid', 'refunded')
    )
);

-- Workshop registrations table
CREATE TABLE IF NOT EXISTS workshop_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID NULL REFERENCES orders(id) ON DELETE SET NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    registration_status VARCHAR(50) DEFAULT 'registered', -- registered, cancelled, attended, no_show
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, refunded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Ensure a user can only register once per workshop
    UNIQUE(workshop_id, user_id),
    
    CONSTRAINT workshop_registrations_status_check CHECK (
        registration_status IN ('registered', 'cancelled', 'attended', 'no_show')
    ),
    CONSTRAINT workshop_registrations_payment_status_check CHECK (
        payment_status IN ('pending', 'paid', 'refunded')
    )
);

-- Indexes for event_registrations
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_order_id ON event_registrations(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON event_registrations(registration_status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_payment_status ON event_registrations(payment_status);

-- Indexes for workshop_registrations
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_workshop_id ON workshop_registrations(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_user_id ON workshop_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_order_id ON workshop_registrations(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_status ON workshop_registrations(registration_status);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_payment_status ON workshop_registrations(payment_status);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_event_registrations_updated_at ON event_registrations;
CREATE TRIGGER trigger_update_event_registrations_updated_at
    BEFORE UPDATE ON event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_workshop_registrations_updated_at ON workshop_registrations;
CREATE TRIGGER trigger_update_workshop_registrations_updated_at
    BEFORE UPDATE ON workshop_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE event_registrations IS 'Tracks user registrations for events. Links to orders for paid events.';
COMMENT ON TABLE workshop_registrations IS 'Tracks user registrations for workshops. Links to orders for paid workshops.';


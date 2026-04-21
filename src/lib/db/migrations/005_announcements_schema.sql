-- ============================================================================
-- Migration: 005_announcements_schema.sql
-- Description: Announcements schema (core, attachments, targets, deliveries),
--              indexes, constraints, triggers, and comments.
-- Created: 2025-11-16
-- ============================================================================

-- Ensure uuid extension is available (uuid_generate_v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Core announcements table
CREATE TABLE IF NOT EXISTS announcements (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	org_id UUID NULL REFERENCES organizations(id) ON DELETE SET NULL,
	created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
	visibility VARCHAR(20) NOT NULL,
	title VARCHAR(180) NOT NULL,
	message TEXT NOT NULL,
	category VARCHAR(40) NOT NULL,
	priority VARCHAR(20) NOT NULL,
	show_on_homepage BOOLEAN NOT NULL DEFAULT false,
	pin_to_dashboard BOOLEAN NOT NULL DEFAULT false,
	send_notification BOOLEAN NOT NULL DEFAULT false,
	status VARCHAR(20) NOT NULL DEFAULT 'active',
	start_at TIMESTAMPTZ NOT NULL,
	end_at TIMESTAMPTZ NULL,
	search_tsv tsvector GENERATED ALWAYS AS (
		to_tsvector(
			'simple',
			coalesce(title, '') || ' ' || coalesce(message, '')
		)
	) STORED,
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT announcements_visibility_check CHECK (visibility IN ('internal','public')),
	CONSTRAINT announcements_priority_check CHECK (priority IN ('normal','important','urgent','highlight','top_banner')),
	CONSTRAINT announcements_status_check CHECK (status IN ('active','inactive')),
	CONSTRAINT announcements_time_window CHECK (end_at IS NULL OR end_at >= start_at),
	-- Enforce category appropriateness at DB-level with broad allowlists
	CONSTRAINT announcements_category_allowed CHECK (
		(visibility = 'internal' AND category IN ('general','exam','assignment','notice','holiday','event','others'))
		OR
		(visibility = 'public' AND category IN ('admission','event','job_vacancy','circular','public_notice','holiday'))
	)
);

-- Attachments table
CREATE TABLE IF NOT EXISTS announcement_attachments (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
	key TEXT NOT NULL,
	url TEXT NOT NULL,
	content_type VARCHAR(100) NOT NULL,
	bytes BIGINT NULL,
	checksum VARCHAR(64) NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT announcement_attachments_bytes_check CHECK (bytes IS NULL OR bytes > 0),
	CONSTRAINT announcement_attachments_checksum_len CHECK (
		checksum IS NULL OR char_length(checksum) IN (32,64)
	)
);

-- Targets table (internal targeting)
CREATE TABLE IF NOT EXISTS announcement_targets (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
	target_role VARCHAR(20) NULL,
	target_class_id UUID NULL,
	target_class_label VARCHAR(120) NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT announcement_targets_role_check CHECK (
		target_role IS NULL OR target_role IN ('students','parents','teachers','vendor','admin','alumni','all')
	)
);

-- Deliveries table (notification tracking)
CREATE TABLE IF NOT EXISTS announcement_deliveries (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
	channel VARCHAR(20) NOT NULL,
	status VARCHAR(20) NOT NULL,
	error TEXT NULL,
	sent_at TIMESTAMPTZ NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT announcement_deliveries_channel_check CHECK (channel IN ('sms','email','push','web')),
	CONSTRAINT announcement_deliveries_status_check CHECK (status IN ('queued','sent','failed'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Lookup and filtering
CREATE INDEX IF NOT EXISTS idx_announcements_org_vis_status ON announcements(org_id, visibility, status);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at);
CREATE INDEX IF NOT EXISTS idx_announcements_updated_at ON announcements(updated_at);
CREATE INDEX IF NOT EXISTS idx_announcements_time_window ON announcements(status, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_announcements_search_tsv ON announcements USING GIN(search_tsv);

-- Attachments
CREATE INDEX IF NOT EXISTS idx_announcement_attachments_announcement_id ON announcement_attachments(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_attachments_key ON announcement_attachments(key);

-- Targets
CREATE INDEX IF NOT EXISTS idx_announcement_targets_announcement_id ON announcement_targets(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_targets_role ON announcement_targets(target_role);

-- Deliveries
CREATE INDEX IF NOT EXISTS idx_announcement_deliveries_announcement_id ON announcement_deliveries(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_deliveries_status ON announcement_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_announcement_deliveries_channel ON announcement_deliveries(channel);
CREATE INDEX IF NOT EXISTS idx_announcement_deliveries_sent_at ON announcement_deliveries(sent_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Ensure the update_updated_at_column() exists (defined in schema.sql); if not, create it.
DO $$
BEGIN
	PERFORM 1 FROM pg_proc WHERE proname = 'update_updated_at_column';
	IF NOT FOUND THEN
		EXECUTE $fn$
		CREATE OR REPLACE FUNCTION update_updated_at_column()
		RETURNS TRIGGER AS $BODY$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$BODY$ LANGUAGE plpgsql;
		$fn$;
	END IF;
END$$;

-- Updated_at triggers
CREATE TRIGGER update_announcements_updated_at
	BEFORE UPDATE ON announcements
	FOR EACH ROW
	EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcement_attachments_updated_at
	BEFORE UPDATE ON announcement_attachments
	FOR EACH ROW
	EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE announcements IS 'Announcements (internal/public) with scheduling, priority, and visibility';
COMMENT ON COLUMN announcements.org_id IS 'Owning organization; NULL for global public announcements';
COMMENT ON COLUMN announcements.visibility IS 'internal|public';
COMMENT ON COLUMN announcements.search_tsv IS 'Full-text search vector from title and message';
COMMENT ON TABLE announcement_attachments IS 'File attachments for announcements stored in R2 under announcements/';
COMMENT ON TABLE announcement_targets IS 'Targeting for internal announcements (roles and optional classes/departments)';
COMMENT ON TABLE announcement_deliveries IS 'Delivery tracking for notifications (sms/email/push/web)';



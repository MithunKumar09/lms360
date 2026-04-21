-- ============================================================================
-- Edurock Database Schema
-- Production-grade schema with proper indexing, constraints, and relationships
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- User roles enum
CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'instructor', 'student');

-- Organization type enum
CREATE TYPE organization_type AS ENUM ('college', 'university', 'institute', 'department', 'training_center');

-- Organization status enum
CREATE TYPE organization_status AS ENUM ('active', 'inactive', 'suspended');

-- Brand asset key name enum
CREATE TYPE brand_asset_key AS ENUM ('header_logo', 'square_icon', 'splash_image', 'loading_mark');

-- Brand asset variant enum
CREATE TYPE brand_asset_variant AS ENUM ('light', 'dark', 'default');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Organizations table (for multi-tenancy support with full configuration)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) UNIQUE,
    org_type organization_type NULL,
    display_name VARCHAR(255) NULL,
    org_code VARCHAR(8) UNIQUE,
    country VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    timezone VARCHAR(50) NULL,
    default_locale VARCHAR(10) NULL,
    currency VARCHAR(3) NULL,
    academic_year_start_month INTEGER NULL,
    academic_levels TEXT[] NULL,
    primary_admin_name VARCHAR(255) NULL,
    primary_admin_email VARCHAR(255) NULL,
    contact_email VARCHAR(255) NULL,
    contact_phone VARCHAR(20) NULL,
    website_url VARCHAR(500) NULL,
    status organization_status NOT NULL DEFAULT 'active',
    search_tsv tsvector GENERATED ALWAYS AS (
        to_tsvector('english', 
            COALESCE(name, '') || ' ' || 
            COALESCE(display_name, '') || ' ' || 
            COALESCE(city, '')
        )
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT organizations_name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 120),
    CONSTRAINT organizations_slug_format CHECK (slug IS NULL OR slug ~* '^[a-z0-9-]+$'),
    CONSTRAINT organizations_slug_length CHECK (slug IS NULL OR (char_length(slug) >= 3 AND char_length(slug) <= 120)),
    CONSTRAINT organizations_code_format CHECK (org_code IS NULL OR org_code ~* '^[A-Z0-9]+$'),
    CONSTRAINT organizations_code_length CHECK (org_code IS NULL OR (char_length(org_code) >= 2 AND char_length(org_code) <= 8)),
    CONSTRAINT organizations_academic_year_month CHECK (academic_year_start_month IS NULL OR (academic_year_start_month >= 1 AND academic_year_start_month <= 12)),
    CONSTRAINT organizations_academic_levels_check CHECK (
        academic_levels IS NULL OR 
        (
            array_length(academic_levels, 1) IS NULL OR
            (
                SELECT bool_and(elem IN ('primary', 'high_school', 'puc', 'degree', 'diploma', 'engineering', 'post_graduation'))
                FROM unnest(academic_levels) AS elem
            )
        )
    ),
    CONSTRAINT organizations_primary_admin_email_format CHECK (primary_admin_email IS NULL OR primary_admin_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT organizations_contact_email_format CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT organizations_website_url_format CHECK (website_url IS NULL OR website_url ~* '^https?://[^\s/$.?#].[^\s]*$')
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret VARCHAR(255) NULL,
    mfa_verified BOOLEAN NOT NULL DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_password_hash_length CHECK (char_length(password_hash) >= 60),
    CONSTRAINT users_mfa_secret_length CHECK (mfa_secret IS NULL OR char_length(mfa_secret) >= 16)
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET NULL,
    user_agent TEXT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT user_sessions_token_length CHECK (char_length(session_token) >= 32),
    CONSTRAINT user_sessions_refresh_token_length CHECK (char_length(refresh_token) >= 32),
    CONSTRAINT user_sessions_expires_future CHECK (expires_at > created_at)
);

-- Login attempts table (for rate limiting and security)
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    failure_reason VARCHAR(255) NULL,
    CONSTRAINT login_attempts_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- MFA backup codes table
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT mfa_backup_codes_hash_length CHECK (char_length(code_hash) >= 60)
);

-- Organization brand assets table
CREATE TABLE IF NOT EXISTS organization_brand_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key_name brand_asset_key NOT NULL,
    url TEXT NOT NULL,
    variant brand_asset_variant DEFAULT 'default',
    width INTEGER NULL,
    height INTEGER NULL,
    format VARCHAR(10) NULL,
    bytes BIGINT NULL,
    checksum VARCHAR(64) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT organization_brand_assets_unique_org_key_variant UNIQUE(org_id, key_name, variant),
    CONSTRAINT organization_brand_assets_format_check CHECK (format IS NULL OR format IN ('png', 'jpeg', 'svg', 'webp')),
    CONSTRAINT organization_brand_assets_width_check CHECK (width IS NULL OR width > 0),
    CONSTRAINT organization_brand_assets_height_check CHECK (height IS NULL OR height > 0),
    CONSTRAINT organization_brand_assets_bytes_check CHECK (bytes IS NULL OR bytes > 0),
    CONSTRAINT organization_brand_assets_checksum_length CHECK (checksum IS NULL OR char_length(checksum) = 32 OR char_length(checksum) = 64)
);

-- Audit events table (for audit logging)
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NULL,
    metadata JSONB NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT audit_events_action_format CHECK (action ~* '^[a-z_]+$'),
    CONSTRAINT audit_events_target_type_format CHECK (target_type ~* '^[a-z_]+$')
);

-- Schema migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    checksum VARCHAR(64) NULL,
    CONSTRAINT schema_migrations_name_format CHECK (migration_name ~* '^[0-9]{3}_[a-z0-9_]+\.sql$')
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_mfa_enabled ON users(mfa_enabled);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_users_org_active ON users(org_id, is_active) WHERE org_id IS NOT NULL;

-- User sessions table indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_expires ON user_sessions(user_id, expires_at);
-- Index for cleanup queries (expired sessions)
-- Note: Partial index with CURRENT_TIMESTAMP removed - use expires_at index for cleanup queries

-- Login attempts table indexes
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at);
-- Composite indexes for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip_address, attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_success ON login_attempts(email, success, attempted_at);
-- Index for cleanup queries (old attempts)
-- Note: Partial index with CURRENT_TIMESTAMP removed - use attempted_at index for cleanup queries

-- MFA backup codes table indexes
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user_id ON mfa_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_code_hash ON mfa_backup_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_used ON mfa_backup_codes(used);
CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user_unused ON mfa_backup_codes(user_id, used) WHERE used = false;

-- Organizations table indexes
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_slug_lower ON organizations(LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_organizations_code_lower ON organizations(LOWER(org_code));
CREATE INDEX IF NOT EXISTS idx_organizations_org_type ON organizations(org_type);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at);
CREATE INDEX IF NOT EXISTS idx_organizations_updated_at ON organizations(updated_at);
CREATE INDEX IF NOT EXISTS idx_organizations_location ON organizations(country, state, city);
CREATE INDEX IF NOT EXISTS idx_organizations_status_type ON organizations(status, org_type);
CREATE INDEX IF NOT EXISTS idx_organizations_status_created ON organizations(status, created_at);
CREATE INDEX IF NOT EXISTS idx_organizations_search_tsv ON organizations USING GIN(search_tsv);

-- Organization brand assets table indexes
CREATE INDEX IF NOT EXISTS idx_organization_brand_assets_org_id ON organization_brand_assets(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_brand_assets_key_name ON organization_brand_assets(key_name);
CREATE INDEX IF NOT EXISTS idx_organization_brand_assets_org_key ON organization_brand_assets(org_id, key_name);

-- Audit events table indexes
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_id ON audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_target ON audit_events(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_created ON audit_events(actor_id, created_at) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_events_target_created ON audit_events(target_type, target_id, created_at) WHERE target_id IS NOT NULL;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for organizations table
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for organization_brand_assets table
CREATE TRIGGER update_organization_brand_assets_updated_at
    BEFORE UPDATE ON organization_brand_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts with authentication and authorization information';
COMMENT ON TABLE user_sessions IS 'Active user sessions with tokens for authentication';
COMMENT ON TABLE login_attempts IS 'Login attempt history for rate limiting and security monitoring';
COMMENT ON TABLE mfa_backup_codes IS 'MFA backup codes for two-factor authentication recovery';
COMMENT ON TABLE organizations IS 'Organizations for multi-tenancy support with full configuration and settings';
COMMENT ON TABLE organization_brand_assets IS 'Brand assets (logos, icons, images) for organizations';
COMMENT ON TABLE audit_events IS 'Audit log for tracking all organization-related actions and changes';
COMMENT ON TABLE schema_migrations IS 'Tracks applied database migrations';

COMMENT ON COLUMN users.org_id IS 'Organization ID - NULL for superadmin (global owner)';
COMMENT ON COLUMN users.mfa_secret IS 'Encrypted TOTP secret for MFA';
COMMENT ON COLUMN user_sessions.expires_at IS 'Session expiration timestamp';
COMMENT ON COLUMN login_attempts.failure_reason IS 'Reason for login failure (e.g., invalid_password, account_locked)';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly unique identifier (lowercase, a-z0-9-, 3-120 chars)';
COMMENT ON COLUMN organizations.org_type IS 'Type of organization: college, university, institute, department, or training_center';
COMMENT ON COLUMN organizations.org_code IS 'Unique organization code (A-Z0-9, 2-8 chars)';
COMMENT ON COLUMN organizations.academic_levels IS 'Array of academic levels offered: primary, high_school, puc, degree, diploma, engineering, post_graduation';
COMMENT ON COLUMN organizations.search_tsv IS 'Generated full-text search vector from name, display_name, and city';
COMMENT ON COLUMN organization_brand_assets.key_name IS 'Type of brand asset: header_logo, square_icon, splash_image, or loading_mark';
COMMENT ON COLUMN organization_brand_assets.url IS 'URL of the brand asset (stored in S3/CloudFront)';
COMMENT ON COLUMN audit_events.actor_id IS 'User ID who performed the action (NULL for system actions)';
COMMENT ON COLUMN audit_events.action IS 'Action performed: create, update, delete, bulk_import, etc.';
COMMENT ON COLUMN audit_events.target_type IS 'Type of target: organization, user, etc.';

-- ============================================================================
-- ANNOUNCEMENTS (Schema snapshot for reference)
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_org_vis_status ON announcements(org_id, visibility, status);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at);
CREATE INDEX IF NOT EXISTS idx_announcements_updated_at ON announcements(updated_at);
CREATE INDEX IF NOT EXISTS idx_announcements_time_window ON announcements(status, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_announcements_search_tsv ON announcements USING GIN(search_tsv);

CREATE INDEX IF NOT EXISTS idx_announcement_attachments_announcement_id ON announcement_attachments(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_attachments_key ON announcement_attachments(key);

CREATE INDEX IF NOT EXISTS idx_announcement_targets_announcement_id ON announcement_targets(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_targets_role ON announcement_targets(target_role);

CREATE INDEX IF NOT EXISTS idx_announcement_deliveries_announcement_id ON announcement_deliveries(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_deliveries_status ON announcement_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_announcement_deliveries_channel ON announcement_deliveries(channel);
CREATE INDEX IF NOT EXISTS idx_announcement_deliveries_sent_at ON announcement_deliveries(sent_at);

-- Triggers (uses existing update_updated_at_column function)
CREATE TRIGGER update_announcements_updated_at
	BEFORE UPDATE ON announcements
	FOR EACH ROW
	EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcement_attachments_updated_at
	BEFORE UPDATE ON announcement_attachments
	FOR EACH ROW
	EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE announcements IS 'Announcements (internal/public) with scheduling, priority, and visibility';
COMMENT ON COLUMN announcements.org_id IS 'Owning organization; NULL for global public announcements';
COMMENT ON COLUMN announcements.visibility IS 'internal|public';
COMMENT ON COLUMN announcements.search_tsv IS 'Full-text search vector from title and message';
COMMENT ON TABLE announcement_attachments IS 'File attachments for announcements stored in R2 under announcements/';
COMMENT ON TABLE announcement_targets IS 'Targeting for internal announcements (roles and optional classes/departments)';
COMMENT ON TABLE announcement_deliveries IS 'Delivery tracking for notifications (sms/email/push/web)';



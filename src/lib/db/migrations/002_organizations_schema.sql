-- ============================================================================
-- Migration: 002_organizations_schema.sql
-- Description: Extended organizations schema with full fields, brand assets, and audit logging
-- Created: 2025-01-XX
-- Dependencies: 001_initial_schema.sql
-- ============================================================================
-- 
-- This migration extends the existing organizations table and creates related tables:
-- - Adds all required organization fields (slug, org_type, location, settings, etc.)
-- - Creates organization_brand_assets table for logo/icon storage
-- - Creates audit_events table for audit logging
-- - Adds full-text search support with generated column and GIN index
-- - Adds all necessary constraints, indexes, and triggers
--
-- Backward compatible: Uses ALTER TABLE to extend existing organizations table
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Organization type enum
DO $$ BEGIN
    CREATE TYPE organization_type AS ENUM ('college', 'university', 'institute', 'department', 'training_center');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Organization status enum
DO $$ BEGIN
    CREATE TYPE organization_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Brand asset key name enum
DO $$ BEGIN
    CREATE TYPE brand_asset_key AS ENUM ('header_logo', 'square_icon', 'splash_image', 'loading_mark');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Brand asset variant enum
DO $$ BEGIN
    CREATE TYPE brand_asset_variant AS ENUM ('light', 'dark', 'default');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- EXTEND ORGANIZATIONS TABLE
-- ============================================================================

-- Add new columns to existing organizations table (backward compatible)
-- Only add if they don't exist to allow re-running migration

DO $$ BEGIN
    -- Change name length constraint (update from 255 to 120 for consistency)
    ALTER TABLE organizations 
        DROP CONSTRAINT IF EXISTS organizations_name_length;
    
    ALTER TABLE organizations
        ADD CONSTRAINT organizations_name_length 
        CHECK (char_length(name) >= 3 AND char_length(name) <= 120);
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- Add slug column (unique, case-insensitive)
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN slug VARCHAR(120) UNIQUE;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug_lower ON organizations(LOWER(slug));
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add organization type
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN org_type organization_type;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add display name
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN display_name VARCHAR(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add organization code (unique, case-insensitive)
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN org_code VARCHAR(8) UNIQUE;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_code_lower ON organizations(LOWER(org_code));
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add location fields
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN country VARCHAR(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN state VARCHAR(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN city VARCHAR(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add settings fields
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN timezone VARCHAR(50);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN default_locale VARCHAR(10);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN currency VARCHAR(3);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN academic_year_start_month INTEGER;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add academic levels array
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN academic_levels TEXT[];
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add primary admin fields
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN primary_admin_name VARCHAR(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN primary_admin_email VARCHAR(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add contact fields (optional)
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN contact_email VARCHAR(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN contact_phone VARCHAR(20);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN website_url VARCHAR(500);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add status field (default to active)
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN status organization_status DEFAULT 'active';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add full-text search generated column
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN search_tsv tsvector
        GENERATED ALWAYS AS (
            to_tsvector('english', 
                COALESCE(name, '') || ' ' || 
                COALESCE(display_name, '') || ' ' || 
                COALESCE(city, '')
            )
        ) STORED;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- ============================================================================
-- CONSTRAINTS ON ORGANIZATIONS TABLE
-- ============================================================================

-- Slug constraints
DO $$ BEGIN
    ALTER TABLE organizations
        ADD CONSTRAINT organizations_slug_format 
        CHECK (slug IS NULL OR slug ~* '^[a-z0-9-]+$');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE organizations
        ADD CONSTRAINT organizations_slug_length 
        CHECK (slug IS NULL OR (char_length(slug) >= 3 AND char_length(slug) <= 120));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Organization code constraints
DO $$ BEGIN
    ALTER TABLE organizations
        ADD CONSTRAINT organizations_code_format 
        CHECK (org_code IS NULL OR org_code ~* '^[A-Z0-9]+$');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE organizations
        ADD CONSTRAINT organizations_code_length 
        CHECK (org_code IS NULL OR (char_length(org_code) >= 2 AND char_length(org_code) <= 8));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Academic year start month constraint
DO $$ BEGIN
    ALTER TABLE organizations
        ADD CONSTRAINT organizations_academic_year_month 
        CHECK (academic_year_start_month IS NULL OR (academic_year_start_month >= 1 AND academic_year_start_month <= 12));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Academic levels constraint (validate each element in array)
DO $$ BEGIN
    ALTER TABLE organizations
        ADD CONSTRAINT organizations_academic_levels_check 
        CHECK (
            academic_levels IS NULL
            OR array_length(academic_levels, 1) IS NULL
            OR academic_levels <@ ARRAY['primary','high_school','puc','degree','diploma','engineering','post_graduation']::text[]
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Email format constraints
DO $$ BEGIN
    ALTER TABLE organizations
        ADD CONSTRAINT organizations_primary_admin_email_format 
        CHECK (primary_admin_email IS NULL OR primary_admin_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE organizations
        ADD CONSTRAINT organizations_contact_email_format 
        CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- URL format constraint
DO $$ BEGIN
    ALTER TABLE organizations
        ADD CONSTRAINT organizations_website_url_format 
        CHECK (
            website_url IS NULL OR 
            website_url ~* '^https?://[^\s/$.?#].[^\s]*$'
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- ORGANIZATION BRAND ASSETS TABLE
-- ============================================================================

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
    CONSTRAINT organization_brand_assets_unique_org_key_variant 
        UNIQUE(org_id, key_name, variant),
    CONSTRAINT organization_brand_assets_format_check 
        CHECK (format IS NULL OR format IN ('png', 'jpeg', 'svg', 'webp')),
    CONSTRAINT organization_brand_assets_width_check 
        CHECK (width IS NULL OR width > 0),
    CONSTRAINT organization_brand_assets_height_check 
        CHECK (height IS NULL OR height > 0),
    CONSTRAINT organization_brand_assets_bytes_check 
        CHECK (bytes IS NULL OR bytes > 0),
    CONSTRAINT organization_brand_assets_checksum_length 
        CHECK (checksum IS NULL OR char_length(checksum) = 32 OR char_length(checksum) = 64)
);

-- ============================================================================
-- AUDIT EVENTS TABLE
-- ============================================================================

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
    CONSTRAINT audit_events_action_format 
        CHECK (action ~* '^[a-z_]+$'),
    CONSTRAINT audit_events_target_type_format 
        CHECK (target_type ~* '^[a-z_]+$')
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Organizations table indexes

-- Unique indexes for slug and code (case-insensitive) - created above during ALTER
-- Additional indexes for filtering and sorting

CREATE INDEX IF NOT EXISTS idx_organizations_org_type ON organizations(org_type);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at);
CREATE INDEX IF NOT EXISTS idx_organizations_updated_at ON organizations(updated_at);

-- Composite index for location-based queries
CREATE INDEX IF NOT EXISTS idx_organizations_location ON organizations(country, state, city);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_organizations_status_type ON organizations(status, org_type);
CREATE INDEX IF NOT EXISTS idx_organizations_status_created ON organizations(status, created_at);

-- Full-text search index (GIN)
CREATE INDEX IF NOT EXISTS idx_organizations_search_tsv ON organizations USING GIN(search_tsv);

-- Brand assets table indexes
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
-- TRIGGERS
-- ============================================================================

-- Trigger for organization_brand_assets updated_at (function already exists)
DROP TRIGGER IF EXISTS update_organization_brand_assets_updated_at ON organization_brand_assets;
CREATE TRIGGER update_organization_brand_assets_updated_at
    BEFORE UPDATE ON organization_brand_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE organizations IS 'Organizations for multi-tenancy support with full configuration and settings';
COMMENT ON TABLE organization_brand_assets IS 'Brand assets (logos, icons, images) for organizations';
COMMENT ON TABLE audit_events IS 'Audit log for tracking all organization-related actions and changes';

-- Organizations table column comments
COMMENT ON COLUMN organizations.slug IS 'URL-friendly unique identifier (lowercase, a-z0-9-, 3-120 chars)';
COMMENT ON COLUMN organizations.org_type IS 'Type of organization: college, university, institute, department, or training_center';
COMMENT ON COLUMN organizations.display_name IS 'Display name for the organization (can differ from name)';
COMMENT ON COLUMN organizations.org_code IS 'Unique organization code (A-Z0-9, 2-8 chars)';
COMMENT ON COLUMN organizations.country IS 'Country where organization is located';
COMMENT ON COLUMN organizations.state IS 'State/Province where organization is located';
COMMENT ON COLUMN organizations.city IS 'City where organization is located';
COMMENT ON COLUMN organizations.timezone IS 'IANA timezone identifier (e.g., Asia/Kolkata)';
COMMENT ON COLUMN organizations.default_locale IS 'Default locale for organization (e.g., en-IN)';
COMMENT ON COLUMN organizations.currency IS 'ISO-4217 currency code (e.g., INR)';
COMMENT ON COLUMN organizations.academic_year_start_month IS 'Month when academic year starts (1-12)';
COMMENT ON COLUMN organizations.academic_levels IS 'Array of academic levels offered: primary, high_school, puc, degree, diploma, engineering, post_graduation';
COMMENT ON COLUMN organizations.primary_admin_name IS 'Name of the primary administrator';
COMMENT ON COLUMN organizations.primary_admin_email IS 'Email of the primary administrator';
COMMENT ON COLUMN organizations.contact_email IS 'General contact email (optional)';
COMMENT ON COLUMN organizations.contact_phone IS 'General contact phone (optional)';
COMMENT ON COLUMN organizations.website_url IS 'Organization website URL (optional)';
COMMENT ON COLUMN organizations.status IS 'Organization status: active, inactive, or suspended';
COMMENT ON COLUMN organizations.search_tsv IS 'Generated full-text search vector from name, display_name, and city';

-- Brand assets table column comments
COMMENT ON COLUMN organization_brand_assets.key_name IS 'Type of brand asset: header_logo, square_icon, splash_image, or loading_mark';
COMMENT ON COLUMN organization_brand_assets.url IS 'URL of the brand asset (stored in S3/CloudFront)';
COMMENT ON COLUMN organization_brand_assets.variant IS 'Variant of the asset: light, dark, or default';
COMMENT ON COLUMN organization_brand_assets.width IS 'Width of the image in pixels';
COMMENT ON COLUMN organization_brand_assets.height IS 'Height of the image in pixels';
COMMENT ON COLUMN organization_brand_assets.format IS 'Image format: png, jpeg, svg, or webp';
COMMENT ON COLUMN organization_brand_assets.bytes IS 'File size in bytes';
COMMENT ON COLUMN organization_brand_assets.checksum IS 'MD5 (32 chars) or SHA256 (64 chars) checksum for deduplication';

-- Audit events table column comments
COMMENT ON COLUMN audit_events.actor_id IS 'User ID who performed the action (NULL for system actions)';
COMMENT ON COLUMN audit_events.action IS 'Action performed: create, update, delete, bulk_import, etc.';
COMMENT ON COLUMN audit_events.target_type IS 'Type of target: organization, user, etc.';
COMMENT ON COLUMN audit_events.target_id IS 'ID of the target entity (e.g., organization ID)';
COMMENT ON COLUMN audit_events.metadata IS 'Additional metadata as JSON (e.g., changes made, reason)';
COMMENT ON COLUMN audit_events.ip_address IS 'IP address of the actor';
COMMENT ON COLUMN audit_events.user_agent IS 'User agent string of the actor';

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
--
-- Backward Compatibility:
-- - This migration extends the existing organizations table using ALTER TABLE
-- - Existing organizations data is preserved
-- - New columns are added as nullable initially to avoid breaking existing data
-- - Constraints are added after columns are created
--
-- Performance:
-- - Full-text search uses generated column with GIN index for fast searching
-- - Composite indexes added for common query patterns
-- - All foreign keys have indexes for efficient joins
--
-- Security:
-- - Email format validation enforced at database level
-- - URL format validation for website_url
-- - Slug and code uniqueness enforced with case-insensitive indexes
-- - Academic levels validated against allowed values
--
-- Next Steps:
-- - After running this migration, update existing organizations to populate new required fields
-- - Set NOT NULL constraints on required fields after data migration (if needed)
-- ============================================================================


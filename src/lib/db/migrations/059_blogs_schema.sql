-- ============================================================================
-- Migration: 059_blogs_schema.sql
-- Description: Blogs schema for multi-role blog management system
-- Created: 2025-01-XX
-- Dependencies: 001_initial_schema.sql, 002_organizations_schema.sql, 004_users_schema.sql
-- ============================================================================
-- 
-- This migration creates tables for:
-- - blogs: Main blog posts with scope support (global, organization, personal)
-- - blog_media: Optional separate table for blog media metadata
--
-- Supports three blog scopes:
-- - global: Superadmin-created blogs visible to all users (displayed on home page)
-- - organization: Admin-created blogs visible only to org users (displayed on /blogs page)
-- - personal: Student-created blogs visible only to the creating student (displayed on /blogs/1)
--
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Blog scope enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blog_scope') THEN
        CREATE TYPE blog_scope AS ENUM ('global', 'organization', 'personal');
    END IF;
END $$;

-- Blog status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blog_status') THEN
        CREATE TYPE blog_status AS ENUM ('draft', 'published', 'archived');
    END IF;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Blogs table
-- Main table for blog posts with multi-scope support
CREATE TABLE IF NOT EXISTS blogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic blog information
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image_url TEXT,
    
    -- Author and scope
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    org_id UUID NULL REFERENCES organizations(id) ON DELETE CASCADE,
    scope blog_scope NOT NULL,
    
    -- Status and publishing
    status blog_status NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ NULL,
    
    -- Metadata (JSONB for flexible storage of links, YouTube URLs, tags, etc.)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT blogs_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
    CONSTRAINT blogs_slug_format CHECK (slug ~* '^[a-z0-9-]+$'),
    CONSTRAINT blogs_slug_length CHECK (char_length(slug) >= 3 AND char_length(slug) <= 255),
    CONSTRAINT blogs_content_not_empty CHECK (char_length(TRIM(content)) > 0),
    CONSTRAINT blogs_org_id_scope_check CHECK (
        (scope = 'global' AND org_id IS NULL) OR
        (scope = 'organization' AND org_id IS NOT NULL) OR
        (scope = 'personal' AND org_id IS NULL)
    ),
    CONSTRAINT blogs_published_at_check CHECK (
        (status = 'published' AND published_at IS NOT NULL) OR
        (status != 'published')
    )
);

-- Blog media table (optional - for storing media metadata separately)
-- If not using, media info can be stored in blogs.metadata JSONB field
CREATE TABLE IF NOT EXISTS blog_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
    
    -- Media information
    media_type VARCHAR(20) NOT NULL, -- 'image', 'video', 'document', 'youtube'
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    title VARCHAR(255),
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT blog_media_type_check CHECK (media_type IN ('image', 'video', 'document', 'youtube'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for blogs table
CREATE INDEX IF NOT EXISTS idx_blogs_author_id ON blogs(author_id);
CREATE INDEX IF NOT EXISTS idx_blogs_org_id ON blogs(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blogs_scope ON blogs(scope);
CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status);
CREATE INDEX IF NOT EXISTS idx_blogs_published_at ON blogs(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON blogs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_scope_status ON blogs(scope, status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blogs_org_status ON blogs(org_id, status) WHERE org_id IS NOT NULL AND status = 'published';

-- Full-text search index for blog content
CREATE INDEX IF NOT EXISTS idx_blogs_search ON blogs USING GIN(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, ''))
);

-- Indexes for blog_media table
CREATE INDEX IF NOT EXISTS idx_blog_media_blog_id ON blog_media(blog_id);
CREATE INDEX IF NOT EXISTS idx_blog_media_display_order ON blog_media(blog_id, display_order);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blogs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_blogs_updated_at
    BEFORE UPDATE ON blogs
    FOR EACH ROW
    EXECUTE FUNCTION update_blogs_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE blogs IS 'Blog posts with multi-scope support (global, organization, personal)';
COMMENT ON COLUMN blogs.scope IS 'Blog visibility scope: global (superadmin), organization (admin), personal (student)';
COMMENT ON COLUMN blogs.metadata IS 'JSONB field for storing links, YouTube URLs, tags, categories, and additional media';
COMMENT ON COLUMN blogs.published_at IS 'Timestamp when blog was published (auto-set when status changes to published)';
COMMENT ON TABLE blog_media IS 'Optional table for storing blog media metadata separately';
COMMENT ON COLUMN blog_media.media_type IS 'Type of media: image, video, document, or youtube';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

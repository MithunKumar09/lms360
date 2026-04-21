-- ============================================================================
-- Migration: 004_users_schema.sql
-- Description: Users feature schema (roles, user_auth, invites, links, sessions, audits)
-- Notes:
-- - Adds new tables alongside existing ones to avoid breaking current auth.
-- - Uses UUID PKs, TIMESTAMPTZ, updated_at triggers where applicable.
-- - Idempotent: guarded by IF NOT EXISTS and DO $$ blocks.
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active','suspended');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE mfa_method_enum AS ENUM ('none','totp','email_otp');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE invite_mode_enum AS ENUM ('invite_link','temp_password_email');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE login_event_enum AS ENUM ('login_success','login_fail','mfa_challenge','logout','password_reset');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Roles code set aligned with requirements
DO $$ BEGIN
    CREATE TYPE role_code_enum AS ENUM ('superadmin','admin','instructor','student','vendor','parent','alumni');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users profile fields extension (non-breaking): If columns exist skip
-- Add first_name, last_name, avatar_url, status/email_verified_at/last_login_at if absent
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='first_name'
    ) THEN
        ALTER TABLE users ADD COLUMN first_name TEXT NULL;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='last_name'
    ) THEN
        ALTER TABLE users ADD COLUMN last_name TEXT NULL;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='avatar_url'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar_url TEXT NULL;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='status'
    ) THEN
        ALTER TABLE users ADD COLUMN status user_status DEFAULT 'active' NOT NULL;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='email_verified_at'
    ) THEN
        ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ NULL;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='last_login_at'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ NULL;
    END IF;
END $$;

-- Note: Skipping functional/FTS indexes here to avoid IMMUTABLE function constraints in some environments.
-- You can add these in a later migration once confirmed:
-- CREATE UNIQUE INDEX users_email_ci_unique ON users (LOWER(email));
-- CREATE INDEX idx_users_search_tsv ON users USING GIN (to_tsvector('simple', coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(email,'')));

-- Partial index on status
CREATE INDEX IF NOT EXISTS idx_users_status_active ON users(status) WHERE status = 'active';

-- user_auth table (separate from users to avoid breaking existing fields)
CREATE TABLE IF NOT EXISTS user_auth (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    mfa_required BOOLEAN NOT NULL DEFAULT false,
    mfa_method mfa_method_enum NOT NULL DEFAULT 'none',
    totp_secret_enc BYTEA NULL,
    backup_codes_enc BYTEA NULL,
    must_reset_password BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code role_code_enum UNIQUE NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    org_id UUID NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_roles_unique UNIQUE (user_id, role_id, org_id)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org ON user_roles(org_id);

-- user_metadata
CREATE TABLE IF NOT EXISTS user_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_metadata_unique UNIQUE (user_id, key)
);
CREATE INDEX IF NOT EXISTS idx_user_metadata_user ON user_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_user_metadata_value_gin ON user_metadata USING GIN(value);

-- Note: student_links, instructor_links, instructor_classes, parent_links are omitted
-- here to avoid dependencies on non-existent tables (cohorts/sections/etc.).

-- invite_tokens
CREATE TABLE IF NOT EXISTS invite_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email CITEXT NOT NULL,
    org_id UUID NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode invite_mode_enum NOT NULL,
    mfa_required BOOLEAN NOT NULL DEFAULT false,
    mfa_method mfa_method_enum NOT NULL DEFAULT 'none',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    token_hash BYTEA NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_email_ci ON invite_tokens(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires_at ON invite_tokens(expires_at);
-- Prevent duplicate invites within a short window (10 minutes)
-- Deduplication index omitted to avoid IMMUTABLE function constraints; consider adding later with a trigger-based guard if needed.

-- login_audit
CREATE TABLE IF NOT EXISTS login_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip INET NULL,
    ua TEXT NULL,
    event login_event_enum NOT NULL,
    at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_login_audit_user ON login_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_event ON login_audit(event);
CREATE INDEX IF NOT EXISTS idx_login_audit_at ON login_audit(at);

-- sessions (lightweight presence tracking, distinct from existing user_sessions)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip INET NULL,
    ua TEXT NULL,
    revoked_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON sessions(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(user_id, last_seen_at) WHERE revoked_at IS NULL;

-- ============================================================================
-- TRIGGERS (reuse update_updated_at_column if defined in 001)
-- ============================================================================

DO $$ BEGIN
    PERFORM 1 FROM pg_proc WHERE proname = 'update_updated_at_column';
    IF NOT FOUND THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $fn$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Attach triggers
DROP TRIGGER IF EXISTS update_user_auth_updated_at ON user_auth;
CREATE TRIGGER update_user_auth_updated_at
    BEFORE UPDATE ON user_auth
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_metadata_updated_at ON user_metadata;
CREATE TRIGGER update_user_metadata_updated_at
    BEFORE UPDATE ON user_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for optional link tables omitted as those tables are not created here.

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_auth IS 'Authentication details decoupled from users profile';
COMMENT ON TABLE roles IS 'Role catalog';
COMMENT ON TABLE user_roles IS 'User-to-Role assignments (optional org scope)';
COMMENT ON TABLE user_metadata IS 'Arbitrary key/value metadata per user';
-- Optional link tables comments omitted
COMMENT ON TABLE invite_tokens IS 'Hashed invite tokens with role/org scoping';
COMMENT ON TABLE login_audit IS 'Authentication events';
COMMENT ON TABLE sessions IS 'Lightweight presence sessions';



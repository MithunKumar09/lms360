-- ============================================================================
-- Migration: 022_assign_org_to_admin.sql
-- Description: Assign organization to existing admin user
-- Created: 2025-12-02
-- ============================================================================

-- Admin user ID: 84231fc7-54bb-4177-a8d5-44f77b79d77f
-- Organization ID: c55a9d9d-095b-41b5-90f3-cae43490bffb
-- Organization Name: Alpha Academy

DO $$
DECLARE
    admin_user_id UUID := '84231fc7-54bb-4177-a8d5-44f77b79d77f';
    target_org_id UUID := 'c55a9d9d-095b-41b5-90f3-cae43490bffb';
    org_exists BOOLEAN;
    user_exists BOOLEAN;
    current_org_id UUID;
BEGIN
    -- Check if organization exists, create if not
    SELECT EXISTS (
        SELECT 1 FROM organizations WHERE id = target_org_id
    ) INTO org_exists;
    
    IF NOT org_exists THEN
        -- Create the organization if it doesn't exist
        INSERT INTO organizations (id, name, created_at, updated_at)
        VALUES (target_org_id, 'Alpha Academy', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Created organization "Alpha Academy" with ID %', target_org_id;
    END IF;
    
    -- Check if user exists
    SELECT EXISTS (
        SELECT 1 FROM users WHERE id = admin_user_id
    ) INTO user_exists;
    
    IF NOT user_exists THEN
        -- Skip if user doesn't exist (fresh database)
        RAISE NOTICE 'User with ID % does not exist. Skipping organization assignment.', admin_user_id;
        RETURN;
    END IF;
    
    -- Get current org_id
    SELECT u.org_id INTO current_org_id
    FROM users u
    WHERE u.id = admin_user_id;
    
    -- Update user's org_id
    UPDATE users
    SET org_id = target_org_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE users.id = admin_user_id;
    
    -- Log the update
    IF current_org_id IS NULL THEN
        RAISE NOTICE 'Assigned organization % to admin user % (previously had no organization)', target_org_id, admin_user_id;
    ELSIF current_org_id = target_org_id THEN
        RAISE NOTICE 'Admin user % already has organization % assigned', admin_user_id, target_org_id;
    ELSE
        RAISE NOTICE 'Updated admin user % organization from % to %', admin_user_id, current_org_id, target_org_id;
    END IF;
    
END $$;

-- Verify the update
DO $$
DECLARE
    admin_user_id UUID := '84231fc7-54bb-4177-a8d5-44f77b79d77f';
    target_org_id UUID := 'c55a9d9d-095b-41b5-90f3-cae43490bffb';
    updated_org_id UUID;
    user_email TEXT;
    org_name TEXT;
BEGIN
    -- Get updated user info
    SELECT u.org_id, u.email, o.name
    INTO updated_org_id, user_email, org_name
    FROM users u
    LEFT JOIN organizations o ON o.id = u.org_id
    WHERE u.id = admin_user_id;
    
    IF updated_org_id = target_org_id THEN
        RAISE NOTICE '✅ Successfully assigned organization "%" (ID: %) to user % (%)', 
            COALESCE(org_name, 'Unknown'), target_org_id, user_email, admin_user_id;
    ELSE
        RAISE WARNING '⚠️ Organization assignment may have failed. Current org_id: %, Expected: %', 
            updated_org_id, target_org_id;
    END IF;
END $$;


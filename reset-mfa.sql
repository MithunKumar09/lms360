-- Reset MFA and Unlock Account for Superadmin
-- Run this in pgAdmin or psql to reset MFA state and unlock the account

-- Replace with your email if different
\set email 'mithunkumarkulal33@gmail.com'

BEGIN;

-- 1. Unlock the account by deleting recent failed login attempts
-- This removes the account lock caused by 5+ failed attempts
DELETE FROM login_attempts
WHERE email = :'email'
  AND success = false
  AND attempted_at > NOW() - INTERVAL '30 minutes';

-- 2. Reset MFA verification status
-- Set mfa_verified to false so user can verify again
UPDATE users
SET 
  mfa_verified = false,
  mfa_secret = NULL,  -- Clear the secret so a fresh one can be generated
  updated_at = CURRENT_TIMESTAMP
WHERE email = :'email';

-- 3. Delete old backup codes (optional but recommended for clean slate)
DELETE FROM mfa_backup_codes
WHERE user_id = (SELECT id FROM users WHERE email = :'email');

-- Verify the changes
SELECT 
  id,
  email,
  mfa_enabled,
  mfa_verified,
  CASE WHEN mfa_secret IS NULL THEN 'NULL (will be generated)' ELSE 'Present (will be replaced)' END as mfa_secret_status
FROM users
WHERE email = :'email';

-- Show remaining failed attempts (should be 0 or very few)
SELECT COUNT(*) as remaining_failed_attempts
FROM login_attempts
WHERE email = :'email'
  AND success = false
  AND attempted_at > NOW() - INTERVAL '30 minutes';

COMMIT;

-- After running this script:
-- 1. The account will be unlocked immediately
-- 2. MFA verification will be reset to false
-- 3. MFA secret will be cleared (a new one will be generated on next setup)
-- 4. You can now log in and set up MFA fresh


-- SIMPLE SQL to Reset MFA and Unlock Account
-- Copy and paste these commands directly in pgAdmin Query Tool

-- Replace 'mithunkumarkulal33@gmail.com' with your email if different

BEGIN;

-- 1. Unlock account: Delete recent failed login attempts
DELETE FROM login_attempts
WHERE email = 'mithunkumarkulal33@gmail.com'
  AND success = false;

-- 2. Reset MFA: Set verified to false and clear secret
UPDATE users
SET
  mfa_enabled = TRUE,
  mfa_verified = FALSE,
  mfa_secret = NULL,
  updated_at = CURRENT_TIMESTAMP
WHERE email = 'mithunkumarkulal33@gmail.com';

-- 3. Clear backup codes
DELETE FROM mfa_backup_codes
WHERE user_id = (SELECT id FROM users WHERE email = 'mithunkumarkulal33@gmail.com');

COMMIT;

-- Verify it worked:
SELECT email, mfa_enabled, mfa_verified, 
       CASE WHEN mfa_secret IS NULL THEN 'NULL' ELSE 'Has Secret' END as secret_status
FROM users 
WHERE email = 'mithunkumarkulal33@gmail.com';

-- /mfa?mode=setup&email=mithunkumarkulal33@gmail.com
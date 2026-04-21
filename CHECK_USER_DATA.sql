-- ============================================================================
-- Database Commands to Check User Data
-- Run these commands in your PostgreSQL database to check user credentials and data
-- ============================================================================

-- 1. Check user by email
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.status,
    u.email_verified_at,
    u.last_login_at,
    u.org_id,
    u.created_at,
    u.updated_at
FROM users u
WHERE LOWER(u.email) = LOWER('mithunkumarkulal33@gmail.com');

-- 2. Check user roles from user_roles table
SELECT 
    u.email,
    r.code AS role_code,
    r.title AS role_title,
    ur.org_id,
    o.name AS organization_name
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r ON r.id = ur.role_id
LEFT JOIN organizations o ON o.id = ur.org_id
WHERE LOWER(u.email) = LOWER('mithunkumarkulal33@gmail.com');

-- 3. Check if user has direct role field (old schema)
SELECT 
    u.email,
    u.role AS direct_role_field
FROM users u
WHERE LOWER(u.email) = LOWER('mithunkumarkulal33@gmail.com');

-- 4. Check user's organization from users table directly
SELECT 
    u.email,
    u.org_id,
    o.name AS organization_name
FROM users u
LEFT JOIN organizations o ON o.id = u.org_id
WHERE LOWER(u.email) = LOWER('mithunkumarkulal33@gmail.com');

-- 5. Check user's active sessions
SELECT 
    u.email,
    COUNT(s.id) AS active_sessions_count
FROM users u
LEFT JOIN sessions s ON s.user_id = u.id AND s.revoked_at IS NULL
WHERE LOWER(u.email) = LOWER('mithunkumarkulal33@gmail.com')
GROUP BY u.email;

-- 6. Check all roles available in the system
SELECT id, code, title FROM roles ORDER BY code;

-- 7. Check all user_roles for this user
SELECT 
    ur.id,
    ur.user_id,
    ur.role_id,
    ur.org_id,
    r.code AS role_code,
    r.title AS role_title,
    o.name AS org_name
FROM user_roles ur
JOIN users u ON u.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
LEFT JOIN organizations o ON o.id = ur.org_id
WHERE LOWER(u.email) = LOWER('mithunkumarkulal33@gmail.com');

-- 8. Test the exact query used by listUsers function
WITH user_roles_data AS (
  SELECT 
    ur.user_id,
    json_agg(r.code ORDER BY r.code) AS roles_array,
    MAX(CASE WHEN ur.org_id IS NOT NULL THEN o.name END) AS org_name_from_roles,
    BOOL_OR(ur.org_id IS NULL) AS has_global_role
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  LEFT JOIN organizations o ON o.id = ur.org_id
  GROUP BY ur.user_id
)
SELECT 
  u.id, 
  u.email, 
  u.first_name, 
  u.last_name, 
  u.avatar_url, 
  u.status,
  u.email_verified_at, 
  u.last_login_at, 
  u.created_at, 
  u.updated_at,
  COALESCE(urd.roles_array, '[]'::json) AS roles,
  COALESCE(
    urd.org_name_from_roles,
    (SELECT o.name FROM organizations o WHERE o.id = u.org_id LIMIT 1),
    CASE 
      WHEN urd.has_global_role = true OR u.org_id IS NULL THEN 'Global'
      ELSE NULL
    END
  ) AS org_label,
  COALESCE(
    (SELECT COUNT(*)::int FROM sessions s WHERE s.user_id = u.id AND s.revoked_at IS NULL),
    0
  ) AS active_sessions
FROM users u
LEFT JOIN user_roles_data urd ON urd.user_id = u.id
LEFT JOIN organizations o_direct ON o_direct.id = u.org_id
WHERE LOWER(u.email) = LOWER('mithunkumarkulal33@gmail.com');


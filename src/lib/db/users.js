/**
 * Users DB Utilities
 * - Parameterized queries
 * - INDEX-aware filters
 * - Pagination with cap 50
 * - Stable error mapping
 */

import { query, getClient } from './index.js';
import crypto from 'crypto';

const PAGE_MAX = 50;

function capPageSize(pageSize) {
	const n = parseInt(pageSize || '20', 10);
	return Math.min(Math.max(n, 1), PAGE_MAX);
}

function toOffset(page, pageSize) {
	const p = Math.max(parseInt(page || '1', 10), 1);
	return (p - 1) * pageSize;
}

function getSortClause(sort) {
	if (!sort) return 'u.created_at DESC';
	
	const [field, direction] = sort.split(':');
	const dir = direction?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
	
	const validFields = {
		'email': 'u.email',
		'name': 'u.first_name, u.last_name',
		'created_at': 'u.created_at',
		'last_login': 'u.last_login_at',
		'status': 'u.status',
	};
	
	const sortField = validFields[field] || 'u.created_at';
	return `${sortField} ${dir}`;
}

export function mapDbError(err) {
	if (!err || !err.code) return err;
	// PostgreSQL SQLSTATE codes
	switch (err.code) {
		case '23505': {
			const e = new Error('Unique constraint violation');
			e.code = 'UNIQUE_VIOLATION';
			return e;
		}
		case '23503': {
			const e = new Error('Foreign key violation');
			e.code = 'FOREIGN_KEY_VIOLATION';
			return e;
		}
		case '23514': {
			const e = new Error('Check constraint violation');
			e.code = 'CHECK_VIOLATION';
			return e;
		}
		default:
			return err;
	}
}

// ---------------------------
// Roles
// ---------------------------
/**
 * Map role code from application format to database format
 * Note: The enum role_code_enum uses 'instructor', not 'orginstructor'
 * The 'orginstructor' mapping is only for display purposes when reading from users.role column
 * @param {string} code - Role code from application (e.g., 'instructor')
 * @returns {string} - Role code for database (should be 'instructor' for enum)
 */
function mapRoleCodeToDb(code) {
	// The enum role_code_enum has 'instructor', not 'orginstructor'
	// So we keep 'instructor' as-is for database queries
	// The 'orginstructor' is only used when reading from users.role column (legacy)
	return code;
}

export async function getRoleByCode(code) {
	// Map alumni → mentor for backward compatibility
	let mappedCode = code;
	if (code === 'alumni') {
		mappedCode = 'mentor';
	}
	
	// Try with enum cast first, if that fails, try with text cast (in case code is 'orginstructor' but enum doesn't have it)
	let dbCode = mapRoleCodeToDb(mappedCode);
	let res = await query('SELECT id, code, title FROM roles WHERE code = $1::role_code_enum', [dbCode]);
	if (res.rows.length > 0) {
		return res.rows[0];
	}
	// If not found with enum cast, try with text cast (for cases where code might be 'orginstructor')
	// Map 'instructor' to 'orginstructor' for direct code lookup
	if (mappedCode === 'instructor') {
		res = await query('SELECT id, code, title FROM roles WHERE code::text = $1', ['orginstructor']);
		if (res.rows.length > 0) {
			return res.rows[0];
		}
	}
	return null;
}

export async function listRoles() {
	const res = await query('SELECT id, code, title FROM roles ORDER BY code ASC', []);
	return res.rows;
}

export async function assignRole({ userId, roleCode, orgId = null }) {
	const client = await getClient();
	try {
		await client.query('BEGIN');
		// Try with enum cast first, if that fails, try with text cast (in case code is 'orginstructor')
		let dbRoleCode = mapRoleCodeToDb(roleCode);
		let roleRow = await client.query('SELECT id FROM roles WHERE code=$1::role_code_enum', [dbRoleCode]);
		if (roleRow.rows.length === 0 && roleCode === 'instructor') {
			// Try 'orginstructor' with text cast (cast column to text to avoid enum validation)
			roleRow = await client.query('SELECT id FROM roles WHERE code::text=$1', ['orginstructor']);
		}
		if (roleRow.rows.length === 0) throw Object.assign(new Error('Role not found'), { code: 'NOT_FOUND' });
		const roleId = roleRow.rows[0].id;
		
		// Validate organization exists if orgId is provided
		// Note: org_id validation should be done before calling assignRole
		// This is a safety check within the transaction
		let validatedOrgId = orgId;
		if (orgId) {
			try {
				// Normalize orgId to string and trim
				const normalizedOrgId = String(orgId).trim();
				
				// Ensure orgId is a valid UUID format
				const orgCheck = await client.query(
					'SELECT id, name, status FROM organizations WHERE id = $1::uuid',
					[normalizedOrgId]
				);
				if (orgCheck.rows.length === 0) {
					// Organization doesn't exist - throw error (don't silently use null)
					// The caller should have validated this, but this is a safety check
					throw Object.assign(new Error(`Organization ${normalizedOrgId} not found`), { 
						code: 'ORG_NOT_FOUND',
						orgId: normalizedOrgId
					});
				}
				
				const org = orgCheck.rows[0];
				if (org.status && org.status !== 'active') {
					throw Object.assign(new Error(`Organization "${org.name}" is ${org.status}`), { 
						code: 'ORG_INACTIVE',
						orgId: normalizedOrgId,
						orgStatus: org.status
					});
				}
				
				// Use the validated UUID from database (ensures correct format)
				validatedOrgId = String(org.id);
				console.log(`[assignRole] Organization validated: ${org.name} (${org.id}), using orgId: ${validatedOrgId}`);
			} catch (orgCheckError) {
				// If UUID format is invalid, throw error
				if (orgCheckError.code === '22P02' || orgCheckError.message?.includes('invalid input syntax')) {
					throw Object.assign(new Error(`Invalid organization ID format: ${orgId}`), { 
						code: 'INVALID_ORG_ID',
						orgId 
					});
				}
				// Re-throw other errors (ORG_NOT_FOUND, ORG_INACTIVE, etc.)
				throw orgCheckError;
			}
		}
		
		// Insert user role (org_id can be null only for superadmin, which should be validated upstream)
		// Use validatedOrgId which is guaranteed to be a valid UUID or null
		try {
		await client.query(
			`INSERT INTO user_roles (id, user_id, role_id, org_id, created_at, updated_at)
				VALUES (uuid_generate_v4(), $1, $2, $3::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, role_id, org_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
				[userId, roleId, validatedOrgId]
		);
		} catch (insertError) {
			// Log detailed error for debugging
			console.error('[assignRole] Insert error:', {
				code: insertError.code,
				constraint: insertError.constraint,
				table: insertError.table,
				detail: insertError.detail,
				message: insertError.message,
				userId,
				roleId,
				orgId: validatedOrgId
			});
			throw insertError;
		}
		
		await client.query('COMMIT');
		return { ok: true };
	} catch (err) {
		await client.query('ROLLBACK');
		// Preserve original error details for better debugging
		const mappedError = mapDbError(err);
		if (err.code === '23503' && err.constraint) {
			// Foreign key violation - add more context
			mappedError.constraint = err.constraint;
			mappedError.table = err.table;
			mappedError.detail = err.detail;
		}
		throw mappedError;
	} finally {
		client.release();
	}
}

export async function removeRole({ userId, roleCode, orgId = null }) {
	const client = await getClient();
	try {
		await client.query('BEGIN');
		// Try with enum cast first, if that fails, try with text cast (in case code is 'orginstructor')
		let dbRoleCode = mapRoleCodeToDb(roleCode);
		let roleRow = await client.query('SELECT id FROM roles WHERE code=$1::role_code_enum', [dbRoleCode]);
		if (roleRow.rows.length === 0 && roleCode === 'instructor') {
			// Try 'orginstructor' with text cast (cast column to text to avoid enum validation)
			roleRow = await client.query('SELECT id FROM roles WHERE code::text=$1', ['orginstructor']);
		}
		if (roleRow.rows.length === 0) throw Object.assign(new Error('Role not found'), { code: 'NOT_FOUND' });
		const roleId = roleRow.rows[0].id;
		await client.query(
			`DELETE FROM user_roles WHERE user_id=$1 AND role_id=$2 AND ((org_id IS NULL AND $3 IS NULL) OR org_id=$3)`,
			[userId, roleId, orgId]
		);
		await client.query('COMMIT');
		return { ok: true };
	} catch (err) {
		await client.query('ROLLBACK');
		throw mapDbError(err);
	} finally {
		client.release();
	}
}

// ---------------------------
// Users
// ---------------------------
export async function createUserWithRole({
	email,
	first_name,
	last_name,
	avatar_url = null,
	status = 'active',
	password_hash,
	mfa_required = false,
	mfa_method = 'none',
	must_reset_password = true,
	roleCode,
	orgId = null,
}) {
	const client = await getClient();
	try {
		await client.query('BEGIN');
		
		// Check if user already exists (case-insensitive)
		const existingUser = await client.query(
			`SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)`,
			[email]
		);
		
		// Check if user_auth table exists (new schema) or password_hash is in users (old schema)
		const schemaCheck = await client.query(`
			SELECT column_name 
			FROM information_schema.columns 
			WHERE table_name = 'users' AND column_name = 'password_hash'
			LIMIT 1
		`);
		const hasPasswordHashInUsers = schemaCheck.rows.length > 0;
		
		let user;
		if (existingUser.rows.length > 0) {
			// User exists, update profile fields
			user = existingUser.rows[0];
			
			// CRITICAL FIX: Get current user data to prevent clearing orgId
			const currentUserData = await client.query(
				`SELECT org_id, role FROM users WHERE id = $1`,
				[user.id]
			);
			const currentOrgId = currentUserData.rows[0]?.org_id;
			const currentRole = currentUserData.rows[0]?.role;
			
			// CRITICAL FIX: Determine final orgId for existing user update
			// For existing users, handle org_id based on role and provided value
			let finalOrgId;
			
			// Force brand role to have org_id = null (global role)
			if (roleCode === 'brand') {
				finalOrgId = null;
				console.log('[createUserWithRole] Brand role detected - forcing org_id = null for existing user');
			} else if (orgId !== null && orgId !== undefined) {
				// orgId is explicitly provided - use it
				finalOrgId = orgId;
			} else {
				// orgId not provided - preserve existing value
				finalOrgId = currentOrgId;
			}
			
			// CRITICAL SAFEGUARD: Prevent clearing orgId for non-global users
			const globalRoles = ['superadmin', 'brand'];
			if (finalOrgId === null && currentOrgId !== null && !globalRoles.includes(roleCode) && !globalRoles.includes(currentRole)) {
				console.warn(`[createUserWithRole] ⚠️ Attempted to clear orgId for non-global user. Preserving existing orgId.`, {
					userId: user.id,
					email: user.email,
					roleCode: roleCode,
					currentRole: currentRole,
					currentOrgId: currentOrgId,
					providedOrgId: orgId,
				});
				finalOrgId = currentOrgId; // Preserve existing orgId
			}
			
			if (hasPasswordHashInUsers) {
				// Old schema: update password_hash in users table
				// Also update role column and org_id to match the roleCode and orgId being assigned
				await client.query(
					`UPDATE users SET
						first_name = COALESCE($1, first_name),
						last_name = COALESCE($2, last_name),
						avatar_url = COALESCE($3, avatar_url),
						status = COALESCE($4, status),
						password_hash = $5,
						role = $6,
						org_id = $7,
						updated_at = CURRENT_TIMESTAMP
					WHERE id = $8`,
					[first_name || null, last_name || null, avatar_url, status, password_hash, roleCode, finalOrgId, user.id]
				);
			} else {
				// New schema: update profile, role, and org_id
				await client.query(
					`UPDATE users SET
						first_name = COALESCE($1, first_name),
						last_name = COALESCE($2, last_name),
						avatar_url = COALESCE($3, avatar_url),
						status = COALESCE($4, status),
						role = $5,
						org_id = $6,
						updated_at = CURRENT_TIMESTAMP
					WHERE id = $7`,
					[first_name || null, last_name || null, avatar_url, status, roleCode, finalOrgId, user.id]
				);
			}
		} else {
			// User doesn't exist, insert new user
			// CRITICAL FIX: Enforce org_id rules based on role
			// Brand & superadmin can have org_id = null (global users)
			// All other roles must have org_id set
			let insertOrgId = orgId;
			
			// Force brand role to have org_id = null (global role)
			if (roleCode === 'brand') {
				insertOrgId = null;
				console.log('[createUserWithRole] Brand role detected - forcing org_id = null');
			}
			
			// Validate: Non-global roles must have org_id
			const globalRoles = ['superadmin', 'brand'];
			if (!globalRoles.includes(roleCode) && !insertOrgId) {
				console.error(`[createUserWithRole] ❌ Missing org_id for non-global role: ${roleCode}`);
				throw Object.assign(
					new Error(`Organization is required for ${roleCode} role`),
					{ code: 'ORG_REQUIRED', role: roleCode }
				);
			}
			
			// Default to null if not provided (for superadmin/brand only)
			if (insertOrgId === undefined) {
				insertOrgId = null;
			}
			
			if (hasPasswordHashInUsers) {
				// Old schema: include password_hash in users table
				// Also set role column and org_id to match the roleCode and orgId being assigned
				const userRes = await client.query(
					`INSERT INTO users (id, email, first_name, last_name, avatar_url, status, password_hash, role, org_id, created_at, updated_at)
					VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
					ON CONFLICT (email) DO UPDATE SET
						first_name = EXCLUDED.first_name,
						last_name = EXCLUDED.last_name,
						avatar_url = EXCLUDED.avatar_url,
						status = EXCLUDED.status,
						password_hash = EXCLUDED.password_hash,
						role = EXCLUDED.role,
						-- CRITICAL FIX: Only update org_id if explicitly provided (not null), or preserve existing for non-global roles
						-- Brand and superadmin are global roles (can have org_id = null)
						org_id = CASE 
							WHEN EXCLUDED.org_id IS NOT NULL THEN EXCLUDED.org_id
							WHEN EXCLUDED.role IN ('superadmin', 'brand') THEN EXCLUDED.org_id
							ELSE users.org_id
						END,
						updated_at = CURRENT_TIMESTAMP
					RETURNING id, email, org_id, role`,
					[email, first_name || null, last_name || null, avatar_url, status, password_hash, roleCode, insertOrgId]
				);
				user = userRes.rows[0];
				
				// CRITICAL SAFEGUARD: Check if orgId was incorrectly cleared
				const globalRoles = ['superadmin', 'brand'];
				if (user.org_id === null && !globalRoles.includes(user.role) && insertOrgId === null) {
					// This shouldn't happen, but if it does, log a warning
					console.warn(`[createUserWithRole] ⚠️ New user created with null orgId for non-global role`, {
						userId: user.id,
						email: user.email,
						roleCode: roleCode,
						userRole: user.role,
					});
				}
			} else {
				// New schema: password_hash goes in user_auth table
				// Set role column and org_id to match the roleCode and orgId being assigned
				const userRes = await client.query(
					`INSERT INTO users (id, email, first_name, last_name, avatar_url, status, role, org_id, created_at, updated_at)
					VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
					ON CONFLICT (email) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         avatar_url = EXCLUDED.avatar_url,
         status = EXCLUDED.status,
						role = EXCLUDED.role,
						-- CRITICAL FIX: Only update org_id if explicitly provided (not null), or preserve existing for non-global roles
						-- Brand and superadmin are global roles (can have org_id = null)
						org_id = CASE 
							WHEN EXCLUDED.org_id IS NOT NULL THEN EXCLUDED.org_id
							WHEN EXCLUDED.role IN ('superadmin', 'brand') THEN EXCLUDED.org_id
							ELSE users.org_id
						END,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, email, org_id, role`,
					[email, first_name || null, last_name || null, avatar_url, status, roleCode, insertOrgId]
				);
				user = userRes.rows[0];
				
				// CRITICAL SAFEGUARD: Check if orgId was incorrectly cleared
				const globalRoles = ['superadmin', 'brand'];
				if (user.org_id === null && !globalRoles.includes(user.role) && insertOrgId === null) {
					// This shouldn't happen, but if it does, log a warning
					console.warn(`[createUserWithRole] ⚠️ New user created with null orgId for non-global role`, {
						userId: user.id,
						email: user.email,
						roleCode: roleCode,
						userRole: user.role,
					});
				}
			}
		}

		// Only insert/update user_auth if the table exists (new schema)
		if (!hasPasswordHashInUsers) {
			const authTableCheck = await client.query(`
				SELECT table_name 
				FROM information_schema.tables 
				WHERE table_name = 'user_auth'
				LIMIT 1
			`);
			
			if (authTableCheck.rows.length > 0) {
		await client.query(
			`INSERT INTO user_auth (user_id, password_hash, mfa_required, mfa_method, must_reset_password, created_at, updated_at)
       VALUES ($1, $2, $3, $4::mfa_method_enum, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         mfa_required = EXCLUDED.mfa_required,
         mfa_method = EXCLUDED.mfa_method,
         must_reset_password = EXCLUDED.must_reset_password,
         updated_at = CURRENT_TIMESTAMP`,
			[user.id, password_hash, mfa_required, mfa_method, must_reset_password]
		);
			}
		}

		// Assign role within the same transaction (don't call assignRole which uses a different client)
		// Get role_id from roles table
		// Handle the mismatch: enum has 'instructor' but DB might have 'orginstructor' or vice versa
		// Also auto-create missing roles if they don't exist
		let roleRow = null;
		
		// Role title mapping for auto-creation
		// Note: 'alumni' is mapped to 'mentor' for backward compatibility
		const roleTitles = {
			'instructor': 'Instructor',
			'orginstructor': 'Organization Instructor',
			'admin': 'Organization Admin',
			'superadmin': 'Super Admin',
			'student': 'Student',
			'vendor': 'Vendor',
			'orgvendor': 'Organization Vendor',
			'parent': 'Parent/Guardian',
			'orgparent': 'Organization Parent/Guardian',
			'alumni': 'Mentor', // Map alumni to Mentor for backward compatibility
			'orgalumni': 'Organization Alumni',
			'mentor': 'Mentor',
			'brand': 'Brand',
		};
		
		// Map alumni → mentor for backward compatibility (at DB level)
		// This ensures alumni role codes are converted to mentor
		if (roleCode === 'alumni') {
			roleCode = 'mentor';
			console.log('[createUserWithRole] Mapped alumni → mentor for backward compatibility');
		}
		
		if (roleCode === 'instructor') {
			// Try multiple approaches to find the instructor role
			// 1. Try 'instructor' with enum cast (standard case)
			roleRow = await client.query('SELECT id, code FROM roles WHERE code = $1::role_code_enum', ['instructor']);
			
			// 2. If not found, try 'orginstructor' with enum cast (after migration 012)
			if (roleRow.rows.length === 0) {
				roleRow = await client.query('SELECT id, code FROM roles WHERE code = $1::role_code_enum', ['orginstructor']);
			}
			
			// 3. If still not found, try 'orginstructor' by casting column to text (fallback)
			if (roleRow.rows.length === 0) {
				roleRow = await client.query('SELECT id, code FROM roles WHERE code::text = $1', ['orginstructor']);
			}
			
			// 3. If still not found, query all roles and find by matching pattern
			if (roleRow.rows.length === 0) {
				const allRoles = await client.query('SELECT id, code::text as code_text FROM roles');
				console.log(`[createUserWithRole] Available roles in DB:`, allRoles.rows.map(r => r.code_text));
				// Try to find any role that contains 'instructor' or 'orginstructor'
				const instructorRole = allRoles.rows.find(r => 
					r.code_text === 'instructor' || 
					r.code_text === 'orginstructor' ||
					r.code_text?.toLowerCase().includes('instructor')
				);
				if (instructorRole) {
					roleRow = { rows: [{ id: instructorRole.id, code: instructorRole.code_text }] };
					console.log(`[createUserWithRole] Found instructor role with code: ${instructorRole.code_text}`);
				}
			}
			
			// 4. If still not found, auto-create the 'instructor' role
			if (roleRow.rows.length === 0) {
				console.log(`[createUserWithRole] Instructor role not found, auto-creating...`);
				try {
					const insertResult = await client.query(
						`INSERT INTO roles (id, code, title, created_at, updated_at)
						VALUES (uuid_generate_v4(), $1::role_code_enum, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
						RETURNING id, code`,
						['instructor', roleTitles['instructor'] || 'Instructor']
					);
					roleRow = insertResult;
					console.log(`[createUserWithRole] Auto-created instructor role with ID: ${insertResult.rows[0].id}`);
				} catch (insertError) {
					// If enum doesn't allow 'instructor', the role might need to be created differently
					console.error(`[createUserWithRole] Failed to auto-create instructor role:`, insertError.message);
					// Try to create with text cast (if column allows it)
					try {
						const insertResult = await client.query(
							`INSERT INTO roles (id, code, title, created_at, updated_at)
							VALUES (uuid_generate_v4(), $1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
							RETURNING id, code`,
							['orginstructor', roleTitles['instructor'] || 'Instructor']
						);
						roleRow = insertResult;
						console.log(`[createUserWithRole] Auto-created orginstructor role with ID: ${insertResult.rows[0].id}`);
					} catch (textInsertError) {
						console.error(`[createUserWithRole] Failed to create orginstructor role:`, textInsertError.message);
					}
				}
			}
		} else {
			// For other roles, try with enum cast first
			try {
				roleRow = await client.query('SELECT id, code FROM roles WHERE code = $1::role_code_enum', [roleCode]);
			} catch (enumError) {
				// Check if this is an invalid enum value error (code 22P02)
				if (enumError.code === '22P02' && enumError.message.includes('role_code_enum')) {
					// The enum value doesn't exist - this means the migration hasn't been run
					const helpfulMessage = roleCode === 'brand' 
						? `The 'brand' role is not available in the database. Please run migration 066_brand_schema.sql to add it: npm run db:migrate`
						: `The '${roleCode}' role is not available in the database enum. Please ensure the appropriate migration has been run.`;
					
					throw Object.assign(
						new Error(helpfulMessage),
						{ code: 'ENUM_VALUE_MISSING', originalError: enumError, roleCode }
					);
				}
				// Re-throw if it's a different error
				throw enumError;
			}
			
			// If not found, try with text cast (for org-prefixed roles that might not be in enum yet)
			if (roleRow.rows.length === 0) {
				roleRow = await client.query('SELECT id, code FROM roles WHERE code::text = $1', [roleCode]);
			}
			
			// Auto-create missing role if it doesn't exist
			if (roleRow.rows.length === 0 && roleTitles[roleCode]) {
				console.log(`[createUserWithRole] Role ${roleCode} not found, auto-creating...`);
				try {
					// Try with enum cast first
					const insertResult = await client.query(
						`INSERT INTO roles (id, code, title, created_at, updated_at)
						VALUES (uuid_generate_v4(), $1::role_code_enum, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
						RETURNING id, code`,
						[roleCode, roleTitles[roleCode]]
					);
					roleRow = insertResult;
					console.log(`[createUserWithRole] Auto-created ${roleCode} role with ID: ${insertResult.rows[0].id}`);
				} catch (insertError) {
					// Check if this is an invalid enum value error
					if (insertError.code === '22P02' && insertError.message.includes('role_code_enum')) {
						const helpfulMessage = roleCode === 'brand'
							? `Cannot create 'brand' role: The 'brand' value is not in the role_code_enum. Please run migration 066_brand_schema.sql: npm run db:migrate`
							: `Cannot create '${roleCode}' role: The enum value is missing. Please ensure the appropriate migration has been run.`;
						
						throw Object.assign(
							new Error(helpfulMessage),
							{ code: 'ENUM_VALUE_MISSING', originalError: insertError, roleCode }
						);
					}
					// If enum doesn't allow it, try without cast (shouldn't happen if enum is updated)
					console.error(`[createUserWithRole] Failed to auto-create ${roleCode} role with enum:`, insertError.message);
					// Don't try text cast here as the column is enum-typed, migration should add it to enum first
					throw insertError;
				}
			}
		}
		
		if (!roleRow || roleRow.rows.length === 0) {
			// Get all available roles for better error message
			const allRoles = await client.query('SELECT code::text as code_text FROM roles');
			const availableCodes = allRoles.rows.map(r => r.code_text).join(', ');
			throw Object.assign(
				new Error(`Role ${roleCode} not found and could not be created. Available roles: ${availableCodes || 'none'}`), 
				{ code: 'ROLE_NOT_FOUND' }
			);
		}
		const roleId = roleRow.rows[0].id;
		console.log(`[createUserWithRole] Found/created role with ID: ${roleId}, code: ${roleRow.rows[0].code}`);
		
		// Important: users.role column uses user_role enum which has 'instructor', not 'orginstructor'
		// So we need to ensure we use 'instructor' for users.role, not 'orginstructor'
		// The roleCode from the form is already 'instructor', so we keep it as-is for users.role
		
		// Validate organization exists if orgId is provided (within same transaction)
		// Note: Brand and superadmin roles can have orgId = null (global users)
		let validatedOrgId = orgId;
		
		// Force brand role to have org_id = null
		if (roleCode === 'brand') {
			validatedOrgId = null;
			console.log('[createUserWithRole] Brand role - validated org_id = null');
		} else if (orgId) {
			try {
				const normalizedOrgId = String(orgId).trim();
				const orgCheck = await client.query(
					'SELECT id, name, status FROM organizations WHERE id = $1::uuid',
					[normalizedOrgId]
				);
				if (orgCheck.rows.length === 0) {
					throw Object.assign(new Error(`Organization ${normalizedOrgId} not found`), { 
						code: 'ORG_NOT_FOUND',
						orgId: normalizedOrgId
					});
				}
				
				const org = orgCheck.rows[0];
				if (org.status && org.status !== 'active') {
					throw Object.assign(new Error(`Organization "${org.name}" is ${org.status}`), { 
						code: 'ORG_INACTIVE',
						orgId: normalizedOrgId,
						orgStatus: org.status
					});
				}
				
				validatedOrgId = String(org.id);
				console.log(`[createUserWithRole] Organization validated: ${org.name} (${org.id})`);
			} catch (orgCheckError) {
				if (orgCheckError.code === '22P02' || orgCheckError.message?.includes('invalid input syntax')) {
					throw Object.assign(new Error(`Invalid organization ID format: ${orgId}`), { 
						code: 'INVALID_ORG_ID',
						orgId 
					});
				}
				throw orgCheckError;
			}
		} else {
			// orgId is null/undefined - validate this is allowed for this role
			const globalRoles = ['superadmin', 'brand'];
			if (!globalRoles.includes(roleCode) && !validatedOrgId) {
				console.error(`[createUserWithRole] ❌ Missing org_id for non-global role: ${roleCode}`);
				throw Object.assign(
					new Error(`Organization is required for ${roleCode} role`),
					{ code: 'ORG_REQUIRED', role: roleCode }
				);
			}
		}
		
		// Insert user role within the same transaction
		// Handle null org_id properly (don't cast null to uuid)
		if (validatedOrgId) {
			await client.query(
				`INSERT INTO user_roles (id, user_id, role_id, org_id, created_at, updated_at)
				VALUES (uuid_generate_v4(), $1, $2, $3::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
				ON CONFLICT (user_id, role_id, org_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
				[user.id, roleId, validatedOrgId]
			);
		} else {
			await client.query(
				`INSERT INTO user_roles (id, user_id, role_id, org_id, created_at, updated_at)
				VALUES (uuid_generate_v4(), $1, $2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
				ON CONFLICT (user_id, role_id, org_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
				[user.id, roleId]
			);
		}
		
		console.log(`[createUserWithRole] Role assigned: ${roleCode} for user ${user.id} with org ${validatedOrgId || 'null'}`);
		
		await client.query('COMMIT');
		return user;
	} catch (err) {
		await client.query('ROLLBACK');
		throw mapDbError(err);
	} finally {
		client.release();
	}
}

export async function getUserById(id) {
	try {
		// console.log('🔍 [GET USER BY ID] Fetching user:', id);
		const res = await query(
			`SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.status,
                u.email_verified_at, u.last_login_at, u.created_at, u.updated_at,
                COALESCE(u.username, NULL) as username,
                COALESCE(u.phone, NULL) as phone,
                COALESCE(u.skill, NULL) as skill,
                COALESCE(u.display_name, NULL) as display_name,
                COALESCE(u.bio, NULL) as bio,
                u.org_id,
                o.name as organization_name,
                o.display_name as organization_display_name
         FROM users u
         LEFT JOIN organizations o ON o.id = u.org_id
         WHERE u.id=$1`,
			[id]
		);
		const user = res.rows[0] || null;
		if (user) {
			// console.log('🔍 [GET USER BY ID] Raw user data from DB:', {
			// 	id: user.id,
			// 	email: user.email,
			// 	first_name: user.first_name,
			// 	last_name: user.last_name,
			// 	org_id: user.org_id,
			// 	organization_name: user.organization_name,
			// 	organization_display_name: user.organization_display_name,
			// 	full_user_object: user
			// });
		} else {
			// console.log('🔍 [GET USER BY ID] User not found');
		}
		return user;
	} catch (error) {
		// If columns don't exist yet (migration not run), try without new columns
		if (error.code === '42703') {
			const res = await query(
				`SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.status,
                    u.email_verified_at, u.last_login_at, u.created_at, u.updated_at,
                    u.org_id,
                    o.name as organization_name,
                    o.display_name as organization_display_name
             FROM users u
             LEFT JOIN organizations o ON o.id = u.org_id
             WHERE u.id=$1`,
				[id]
			);
			const user = res.rows[0] || null;
			if (user) {
				// Add null values for missing columns
				return {
					...user,
					username: null,
					phone: null,
					skill: null,
					display_name: null,
					bio: null,
				};
			}
			return null;
		}
		throw error;
	}
}

export async function getUserByEmail(email) {
	const res = await query(
		`SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.status
     FROM users u WHERE LOWER(u.email)=LOWER($1)`,
		[email]
	);
	return res.rows[0] || null;
}

export async function updateUser(id, updates) {
	const fields = [];
	const values = [];
	let idx = 1;
	for (const [k, v] of Object.entries(updates)) {
		fields.push(`${k} = $${idx++}`);
		values.push(v);
	}
	if (fields.length === 0) return await getUserById(id);
	values.push(id);
	const res = await query(
		`UPDATE users SET ${fields.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=$${idx} RETURNING *`,
		values
	);
	return res.rows[0] || null;
}

export async function suspendUser(id) {
	await query(`UPDATE users SET status='suspended', updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [id]);
	return { ok: true };
}

export async function activateUser(id) {
	await query(`UPDATE users SET status='active', updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [id]);
	return { ok: true };
}

export async function listUsers({ 
	q, 
	role, 
	roles, // Array of roles for multi-role filter
	status, 
	verified, 
	orgId, 
	cohortId,
	classIds, // Array of class IDs to filter instructors (instructors who hold these classes)
	vendor_category,
	dateFrom,
	dateTo,
	sort,
	excludeUserId, // Exclude specific user ID from results
	instructorUserId, // For instructor filtering: only show students in their assigned cohorts/subjects
	instructorCohortIds, // Array of cohort IDs the instructor is assigned to
	instructorOfferingIds, // Array of subject offering IDs the instructor is assigned to
	page = 1, 
	pageSize = 20 
} = {}) {
	const limit = capPageSize(pageSize);
	const offset = toOffset(page, limit);
	const where = [];
	const params = [];
	let i = 1;

	// Exclude current user from the list (don't show own profile)
	if (excludeUserId) {
		where.push(`u.id != $${i++}`);
		params.push(excludeUserId);
	}

	// Search query
	if (q) {
		where.push(`to_tsvector('simple', coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'') || ' ' || coalesce(u.email,'')) @@ plainto_tsquery('simple', $${i++})`);
		params.push(q);
	}

	// Status filter
	if (status) {
		where.push(`u.status = $${i++}::user_status`);
		params.push(status);
	}

	// Email verified filter
	if (typeof verified === 'boolean') {
		if (verified) {
			where.push(`u.email_verified_at IS NOT NULL`);
		} else {
			where.push(`u.email_verified_at IS NULL`);
		}
	}

	// Date range filters
	if (dateFrom) {
		where.push(`u.created_at >= $${i++}::timestamptz`);
		params.push(dateFrom);
	}
	if (dateTo) {
		where.push(`u.created_at <= $${i++}::timestamptz`);
		params.push(dateTo);
	}

	// Role filtering (support both single role and multiple roles)
	if (roles && Array.isArray(roles) && roles.length > 0) {
		// Multi-role filter
		const roleParamIndex = i++;
		const orgParamIndex = orgId ? i++ : null;
		where.push(`EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = u.id
        AND r.code = ANY($${roleParamIndex}::role_code_enum[])
        ${orgId ? `AND ((ur.org_id IS NULL AND $${orgParamIndex}::uuid IS NULL) OR ur.org_id = $${orgParamIndex}::uuid)` : ''}
    )`);
		params.push(roles);
		if (orgId) {
			params.push(orgId);
		}
	} else if (role) {
		// Single role filter (backward compatibility)
		const roleParamIndex = i++;
		const orgParamIndex = orgId ? i++ : null;
		where.push(`EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = u.id
        AND r.code = $${roleParamIndex}::role_code_enum
        ${orgId ? `AND ((ur.org_id IS NULL AND $${orgParamIndex}::uuid IS NULL) OR ur.org_id = $${orgParamIndex}::uuid)` : ''}
    )`);
		params.push(role);
		if (orgId) {
			params.push(orgId);
		}
	} else if (orgId) {
		// Organization filter only
		const orgParamIndex = i++;
		where.push(`EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = u.id
        AND ((ur.org_id IS NULL AND $${orgParamIndex}::uuid IS NULL) OR ur.org_id = $${orgParamIndex}::uuid)
    )`);
		params.push(orgId);
	}

	// Cohort filter (for students)
	if (cohortId) {
		where.push(`EXISTS (
      SELECT 1 FROM student_links sl
      WHERE sl.user_id = u.id AND sl.cohort_id = $${i++}
    )`);
		params.push(cohortId);
	}

	// Class IDs filter (for instructors - filter instructors who hold at least one of the specified classes)
	if (classIds && Array.isArray(classIds) && classIds.length > 0) {
		const classIdsParamIndex = i++;
		where.push(`EXISTS (
      SELECT 1 FROM instructor_classes ic
      WHERE ic.instructor_user_id = u.id 
        AND ic.cohort_id = ANY($${classIdsParamIndex}::uuid[])
    )`);
		params.push(classIds);
	}

	// Vendor category filter
	if (vendor_category) {
		where.push(`EXISTS (
      SELECT 1 FROM user_metadata um
      WHERE um.user_id = u.id 
        AND um.key = 'vendor_category'
        AND um.value->>'category' = $${i++}
    )`);
		params.push(vendor_category);
	}

	// Instructor-specific filtering: Only show students that belong to instructor's assigned cohorts/subjects
	// This applies ONLY when instructorUserId is provided (instructor viewing users)
	// Instructor-specific filtering for students
	// If an instructor is requesting the list, filter students to only show those assigned to the instructor's cohorts/offerings.
	if (instructorUserId) {
		// console.log('👨‍🏫 [LIST USERS] Applying instructor filtering:', {
		// 	instructorUserId,
		// 	instructorCohortIds: instructorCohortIds?.length || 0,
		// 	instructorOfferingIds: instructorOfferingIds?.length || 0,
		// });

		// If instructor has no assignments, show NO students (not all students)
		if ((!instructorCohortIds || instructorCohortIds.length === 0) && 
		    (!instructorOfferingIds || instructorOfferingIds.length === 0)) {
			// console.log('👨‍🏫 [LIST USERS] Instructor has no assignments - excluding all students');
			// Exclude all students when instructor has no assignments
			where.push(`NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = u.id
          AND r.code = 'student'
      )`);
		} else {
			// Instructor has assignments - filter students to match
			// Filter students: Must have at least one cohort that matches instructor's cohorts
			// AND must have at least one subject offering that matches instructor's offerings
			// Exclude students with no cohorts or no subjects
			const instructorCohortParamIndex = instructorCohortIds?.length > 0 ? i++ : null;
			const instructorOfferingParamIndex = instructorOfferingIds?.length > 0 ? i++ : null;

			// Build conditions for student filtering
			const studentFilterConditions = [];

			// Condition 1: Student must have at least one cohort in student_links
			// AND that cohort must match one of instructor's assigned cohorts
			if (instructorCohortIds?.length > 0) {
				studentFilterConditions.push(`EXISTS (
          SELECT 1 FROM student_links sl
          WHERE sl.user_id = u.id
            AND sl.cohort_id IS NOT NULL
            AND sl.cohort_id = ANY($${instructorCohortParamIndex}::uuid[])
        )`);
				params.push(instructorCohortIds);
			} else {
				// If instructor has no cohorts but has offerings, still require student to have at least one cohort
				// This ensures we don't show students with no assignments
				studentFilterConditions.push(`EXISTS (
          SELECT 1 FROM student_links sl
          WHERE sl.user_id = u.id
            AND sl.cohort_id IS NOT NULL
        )`);
			}

			// Condition 2: Student must have at least one subject offering in user_class_subject_links
			// AND that offering must match one of instructor's assigned offerings
			if (instructorOfferingIds?.length > 0) {
				studentFilterConditions.push(`EXISTS (
          SELECT 1 FROM user_class_subject_links ucsl
          WHERE ucsl.user_id = u.id
            AND ucsl.link_type = 'student'
            AND ucsl.subject_offering_id IS NOT NULL
            AND ucsl.subject_offering_id = ANY($${instructorOfferingParamIndex}::uuid[])
        )`);
				params.push(instructorOfferingIds);
			} else {
				// If instructor has no offerings but has cohorts, still require student to have at least one subject offering
				// This ensures we don't show students with no assignments
				studentFilterConditions.push(`EXISTS (
          SELECT 1 FROM user_class_subject_links ucsl
          WHERE ucsl.user_id = u.id
            AND ucsl.link_type = 'student'
            AND ucsl.subject_offering_id IS NOT NULL
        )`);
			}

			// Apply filtering: For students, must match all conditions. For other roles, no filtering.
			if (studentFilterConditions.length > 0) {
				where.push(`(
          -- If user is NOT a student, don't apply instructor filtering
          NOT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = u.id
              AND r.code = 'student'
          )
          OR
          -- If user IS a student, apply instructor filtering (must match ALL conditions)
          (
            EXISTS (
              SELECT 1 FROM user_roles ur
              JOIN roles r ON r.id = ur.role_id
              WHERE ur.user_id = u.id
                AND r.code = 'student'
            )
            AND (${studentFilterConditions.join(' AND ')})
          )
        )`);
			}

			// console.log('👨‍🏫 [LIST USERS] Instructor filter applied:', {
			// 	conditionsCount: studentFilterConditions.length,
			// 	willFilterStudents: studentFilterConditions.length > 0,
			// });
		}
	}

	const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

	const dataSql = `
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
      -- Primary role from role column (cast to text to handle both enum and varchar types)
      CASE 
        WHEN u.role::text = 'superadmin' THEN 'superadmin'
        WHEN u.role::text = 'admin' THEN 'orgadmin'
        WHEN u.role::text = 'instructor' THEN 'orginstructor'
        WHEN u.role::text = 'student' THEN 'orgstudent'
        ELSE u.role::text
      END AS role,
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
    ${whereSql}
    ORDER BY ${getSortClause(sort)}
    LIMIT ${limit} OFFSET ${offset}
  `;
	const countSql = `
    SELECT COUNT(*)::int AS total
    FROM users u
    ${whereSql}
  `;

	const [dataRes, countRes] = await Promise.all([query(dataSql, params), query(countSql, params)]);
	const rows = dataRes.rows;
	const total = countRes.rows[0]?.total || 0;

	// Debug logging
	// if (rows.length > 0) {
	// 	console.log('🔍 [DB DEBUG] ===== LIST USERS QUERY RESULTS =====');
	// 	console.log('🔍 [DB DEBUG] Total users found:', total);
	// 	console.log('🔍 [DB DEBUG] Rows returned:', rows.length);
	// 	console.log('🔍 [DB DEBUG] First user raw data:', JSON.stringify(rows[0], null, 2));
	// 	console.log('🔍 [DB DEBUG] First user roles (raw):', rows[0].roles, 'Type:', typeof rows[0].roles);
	// 	console.log('🔍 [DB DEBUG] First user org_label (raw):', rows[0].org_label);
	// 	console.log('🔍 [DB DEBUG] First user last_login_at (raw):', rows[0].last_login_at);
	// 	console.log('🔍 [DB DEBUG] First user active_sessions (raw):', rows[0].active_sessions);
	// 	console.log('🔍 [DB DEBUG] SQL Query:', dataSql);
	// 	console.log('🔍 [DB DEBUG] Query params:', params);
	// 	console.log('🔍 [DB DEBUG] ===== END DB DEBUG =====');
	// }

	// ETag suggestion: hash result for client
	const etag = crypto.createHash('sha1').update(JSON.stringify({ q, role, status, verified, orgId, page, pageSize, total })).digest('hex');
	return { items: rows, total, page: parseInt(page || '1', 10), pageSize: limit, etag };
}

// ---------------------------
// Links
// ---------------------------
export async function attachStudentLink({ userId, orgId, cohortId, subjectOfferingIds = [], rollNo = null, programNodeId = null }) {
	const client = await getClient();
	try {
		await client.query('BEGIN');
		
		// Create student_links record (section_id removed as it's in cohort)
		await client.query(
			`INSERT INTO student_links (id, user_id, org_id, cohort_id, roll_no, program_node_id, created_at, updated_at)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, cohort_id) DO UPDATE SET
         roll_no = EXCLUDED.roll_no,
         program_node_id = EXCLUDED.program_node_id,
         updated_at = CURRENT_TIMESTAMP`,
			[userId, orgId, cohortId, rollNo, programNodeId]
		);
		
		// Create user_class_subject_links for each subject offering
		// First, validate all offerings before creating any links
		if (subjectOfferingIds && subjectOfferingIds.length > 0) {
			const invalidOfferings = [];
			const missingOfferings = [];
			
			// Validate all offerings first
			for (const offeringId of subjectOfferingIds) {
				// Get cohort_id from subject_offering to ensure consistency
				const offeringRes = await client.query(
					`SELECT cohort_id FROM subject_offerings WHERE id = $1`,
					[offeringId]
				);
				
				if (offeringRes.rows.length === 0) {
					missingOfferings.push(offeringId);
					continue;
				}
				
				const offeringCohortId = offeringRes.rows[0].cohort_id;
				
				// Ensure cohort_id matches
				if (offeringCohortId !== cohortId) {
					invalidOfferings.push({ offeringId, expectedCohort: cohortId, actualCohort: offeringCohortId });
				}
			}
			
			// If any validation errors, rollback and throw error
			if (missingOfferings.length > 0 || invalidOfferings.length > 0) {
				await client.query('ROLLBACK');
				const errors = [];
				if (missingOfferings.length > 0) {
					errors.push(`Subject offerings not found: ${missingOfferings.join(', ')}`);
				}
				if (invalidOfferings.length > 0) {
					const invalidIds = invalidOfferings.map(i => i.offeringId).join(', ');
					errors.push(`Subject offerings do not belong to the selected cohort: ${invalidIds}`);
				}
				const error = new Error(errors.join('. '));
				error.code = 'VALIDATION_ERROR';
				throw error;
			}
			
			// All validations passed, create links
			for (const offeringId of subjectOfferingIds) {
				await client.query(
					`INSERT INTO user_class_subject_links (id, user_id, org_id, cohort_id, subject_offering_id, link_type, created_at, updated_at)
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, 'student', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, cohort_id, subject_offering_id) DO UPDATE SET
             updated_at = CURRENT_TIMESTAMP`,
					[userId, orgId, cohortId, offeringId]
				);
			}
		}
		
		await client.query('COMMIT');
		
		// Sync cohort summaries to user_metadata for futuristic access
		await syncUserCohortMetadata(userId);
		
		return { ok: true };
	} catch (err) {
		await client.query('ROLLBACK');
		throw mapDbError(err);
	} finally {
		client.release();
	}
}

export async function attachInstructorLinks({ userId, orgId, cohortIds = [], offeringIds = [] }) {
	const client = await getClient();
	try {
		await client.query('BEGIN');
		// ensure instructor_links record
		await client.query(
			`INSERT INTO instructor_links (id, user_id, org_id, created_at, updated_at)
       VALUES (uuid_generate_v4(), $1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
			[userId, orgId]
		);
		for (const cid of cohortIds) {
			await client.query(
				`INSERT INTO instructor_classes (id, instructor_user_id, cohort_id, subject_offering_id, created_at, updated_at)
         VALUES (uuid_generate_v4(), $1, $2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (instructor_user_id, cohort_id, subject_offering_id) DO NOTHING`,
				[userId, cid]
			);
		}
		for (const oid of offeringIds) {
			await client.query(
				`INSERT INTO instructor_classes (id, instructor_user_id, cohort_id, subject_offering_id, created_at, updated_at)
         SELECT uuid_generate_v4(), $1, so.cohort_id, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         FROM subject_offerings so WHERE so.id=$2
         ON CONFLICT (instructor_user_id, cohort_id, subject_offering_id) DO NOTHING`,
				[userId, oid]
			);
		}
		await client.query('COMMIT');
		
		// Sync cohort summaries to user_metadata for futuristic access
		await syncUserCohortMetadata(userId);
		
		return { ok: true };
	} catch (err) {
		await client.query('ROLLBACK');
		throw mapDbError(err);
	} finally {
		client.release();
	}
}

/**
 * Sync user cohort and assignment metadata to user_metadata table
 * This provides futuristic quick access to user's cohort/subject information
 */
export async function syncUserCohortMetadata(userId) {
	try {
		const { query } = await import('@/lib/db/index.js');
		
		// Fetch user's roles to determine what metadata to sync
		const rolesResult = await query(
			`SELECT r.code 
			 FROM user_roles ur
			 JOIN roles r ON r.id = ur.role_id
			 WHERE ur.user_id = $1`,
			[userId]
		);
		const userRoles = rolesResult.rows.map(row => row.code);
		
		const metadata = {
			lastSyncedAt: new Date().toISOString(),
			roles: userRoles,
		};
		
		// If user is a student, sync student cohort data
		if (userRoles.includes('student')) {
			const studentLinksResult = await query(
				`SELECT 
					sl.cohort_id,
					sl.roll_no,
					sl.program_node_id,
					c.code as cohort_code,
					c.level as cohort_level,
					pn.title as program_node_title,
					pn.code as program_node_code
				 FROM student_links sl
				 LEFT JOIN cohorts c ON c.id = sl.cohort_id
				 LEFT JOIN program_nodes pn ON pn.id = sl.program_node_id
				 WHERE sl.user_id = $1`,
				[userId]
			);
			
			const subjectLinksResult = await query(
				`SELECT 
					ucsl.cohort_id,
					ucsl.subject_offering_id,
					so.subject_id,
					sc.title as subject_title,
					sc.code as subject_code
				 FROM user_class_subject_links ucsl
				 LEFT JOIN subject_offerings so ON so.id = ucsl.subject_offering_id
				 LEFT JOIN subject_catalog sc ON sc.id = so.subject_id
				 WHERE ucsl.user_id = $1 AND ucsl.link_type = 'student'`,
				[userId]
			);
			
			metadata.student = {
				cohorts: studentLinksResult.rows.map(row => ({
					cohortId: row.cohort_id,
					cohortCode: row.cohort_code,
					cohortLevel: row.cohort_level,
					rollNo: row.roll_no,
					programNodeId: row.program_node_id,
					programNodeTitle: row.program_node_title,
					programNodeCode: row.program_node_code,
				})),
				subjects: subjectLinksResult.rows.map(row => ({
					cohortId: row.cohort_id,
					subjectOfferingId: row.subject_offering_id,
					subjectId: row.subject_id,
					subjectTitle: row.subject_title,
					subjectCode: row.subject_code,
				})),
			};
		}
		
		// If user is an instructor, sync instructor assignment data
		if (userRoles.includes('instructor') || userRoles.includes('orginstructor')) {
			const instructorClassesResult = await query(
				`SELECT 
					ic.cohort_id,
					ic.subject_offering_id,
					c.code as cohort_code,
					c.level as cohort_level,
					so.subject_id,
					sc.title as subject_title,
					sc.code as subject_code
				 FROM instructor_classes ic
				 LEFT JOIN cohorts c ON c.id = ic.cohort_id
				 LEFT JOIN subject_offerings so ON so.id = ic.subject_offering_id
				 LEFT JOIN subject_catalog sc ON sc.id = so.subject_id
				 WHERE ic.instructor_user_id = $1`,
				[userId]
			);
			
			const instructorSubjectLinksResult = await query(
				`SELECT 
					ucsl.cohort_id,
					ucsl.subject_offering_id,
					so.subject_id,
					sc.title as subject_title,
					sc.code as subject_code
				 FROM user_class_subject_links ucsl
				 LEFT JOIN subject_offerings so ON so.id = ucsl.subject_offering_id
				 LEFT JOIN subject_catalog sc ON sc.id = so.subject_id
				 WHERE ucsl.user_id = $1 AND ucsl.link_type = 'instructor'`,
				[userId]
			);
			
			// Combine results from both tables
			const allAssignments = [
				...instructorClassesResult.rows,
				...instructorSubjectLinksResult.rows,
			];
			
			// Deduplicate by cohort_id and subject_offering_id
			const uniqueAssignments = new Map();
			allAssignments.forEach(row => {
				const key = `${row.cohort_id || 'null'}_${row.subject_offering_id || 'null'}`;
				if (!uniqueAssignments.has(key)) {
					uniqueAssignments.set(key, row);
				}
			});
			
			metadata.instructor = {
				cohorts: Array.from(uniqueAssignments.values())
					.filter(row => row.cohort_id)
					.map(row => ({
						cohortId: row.cohort_id,
						cohortCode: row.cohort_code,
						cohortLevel: row.cohort_level,
					})),
				subjects: Array.from(uniqueAssignments.values())
					.filter(row => row.subject_offering_id)
					.map(row => ({
						cohortId: row.cohort_id,
						subjectOfferingId: row.subject_offering_id,
						subjectId: row.subject_id,
						subjectTitle: row.subject_title,
						subjectCode: row.subject_code,
					})),
			};
		}
		
		// Upsert metadata
		await query(
			`INSERT INTO user_metadata (user_id, key, value, created_at, updated_at)
			 VALUES ($1, 'cohorts_summary', $2::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			 ON CONFLICT (user_id, key) DO UPDATE SET
			   value = EXCLUDED.value,
			   updated_at = CURRENT_TIMESTAMP`,
			[userId, JSON.stringify(metadata)]
		);
		
		return { ok: true };
	} catch (err) {
		console.error('Error syncing user cohort metadata:', err);
		// Don't throw - metadata sync is non-critical
		return { ok: false, error: err.message };
	}
}

export async function attachParentLink({ parentUserId, studentUserId, orgId }) {
	try {
		await query(
			`INSERT INTO parent_links (id, parent_user_id, student_user_id, org_id, created_at, updated_at)
       VALUES (uuid_generate_v4(), $1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (parent_user_id, student_user_id) DO NOTHING`,
			[parentUserId, studentUserId, orgId]
		);
		return { ok: true };
	} catch (err) {
		throw mapDbError(err);
	}
}

// ---------------------------
// Invites
// ---------------------------
export async function createInvite({ email, orgId = null, roleId, creatorId, mode, mfa_required = false, mfa_method = 'none', payload = {}, expiresAt, tokenHash }) {
	try {
		// tokenHash can be Buffer or hex string
		// Convert to hex string if it's a Buffer, then use decode() to store as BYTEA
		const hashHex = Buffer.isBuffer(tokenHash) ? tokenHash.toString("hex") : tokenHash;
		
		const res = await query(
			`INSERT INTO invite_tokens (id, email, org_id, role_id, creator_id, mode, mfa_required, mfa_method, payload, token_hash, expires_at, created_at)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5::invite_mode_enum, $6, $7::mfa_method_enum, $8::jsonb, decode($9, 'hex'), $10, CURRENT_TIMESTAMP)
       RETURNING id`,
			[email, orgId, roleId, creatorId, mode, mfa_required, mfa_method, JSON.stringify(payload), hashHex, expiresAt]
		);
		return res.rows[0];
	} catch (err) {
		throw mapDbError(err);
	}
}

export async function getInviteByTokenHash(tokenHash) {
	// tokenHash can be Buffer or hex string
	// Convert to hex string if it's a Buffer, since we store it as hex string
	const hashHex = Buffer.isBuffer(tokenHash) ? tokenHash.toString("hex") : tokenHash;
	
	// Use decode() to convert hex string to BYTEA for comparison
	// This matches how we store it in createInvite using decode($9, 'hex')
	// LEFT JOIN with organizations to get organization name
	const res = await query(
		`SELECT it.*, r.code AS role_code, r.title AS role_title, 
		        o.name AS org_name, o.display_name AS org_display_name
		 FROM invite_tokens it
     JOIN roles r ON r.id = it.role_id
		 LEFT JOIN organizations o ON o.id = it.org_id
     WHERE it.token_hash = decode($1, 'hex') 
       AND it.used_at IS NULL 
       AND it.expires_at > CURRENT_TIMESTAMP`,
		[hashHex]
	);
	return res.rows[0] || null;
}

export async function markInviteUsed(inviteId) {
	await query(`UPDATE invite_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=$1 AND used_at IS NULL`, [inviteId]);
	return { ok: true };
}

export async function deleteInvite(inviteId) {
	const res = await query(`DELETE FROM invite_tokens WHERE id=$1 RETURNING id, email`, [inviteId]);
	return res.rows[0] || null;
}

// ---------------------------
// Sessions & Audit
// ---------------------------
export async function listSessions(userId) {
	const res = await query(
		`SELECT id, created_at, last_seen_at, ip, ua, revoked_at
     FROM sessions WHERE user_id=$1 ORDER BY created_at DESC`,
		[userId]
	);
	return res.rows;
}

export async function revokeSessions(userId) {
	await query(`UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=$1 AND revoked_at IS NULL`, [userId]);
	return { ok: true };
}

export async function touchSessionLastSeen(sessionId) {
	await query(`UPDATE sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE id=$1`, [sessionId]);
	return { ok: true };
}

export async function insertLoginAudit({ userId, ip, ua, event }) {
	await query(
		`INSERT INTO login_audit (id, user_id, ip, ua, event, at)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4::login_event_enum, CURRENT_TIMESTAMP)`,
		[userId, ip || null, ua || null, event]
	);
	return { ok: true };
}

export default {
	getRoleByCode,
	listRoles,
	assignRole,
	removeRole,
	createUserWithRole,
	getUserById,
	getUserByEmail,
	listUsers,
	updateUser,
	suspendUser,
	activateUser,
	attachStudentLink,
	attachInstructorLinks,
	attachParentLink,
	createInvite,
	getInviteByTokenHash,
	markInviteUsed,
	listSessions,
	revokeSessions,
	touchSessionLastSeen,
	insertLoginAudit,
	mapDbError,
};

// Minimal test stubs (to be implemented in proper test files)
// - createUserWithRole: should create user_auth and user_roles
// - createInvite: dedupe enforced by unique index; 23505 -> UNIQUE_VIOLATION
// - listUsers: respects filters and pagination caps



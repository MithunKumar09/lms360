/**
 * Users Feature Seeder
 * - Seeds roles catalog
 * - Bridges existing superadmin into new role/user_auth structure (idempotent)
 * 
 * Safe to run multiple times.
 */

import { query, getClient, closePool } from '../index.js';

const ROLE_TITLES = [
	{ code: 'superadmin', title: 'Super Admin' },
	{ code: 'admin', title: 'Organization Admin' },
	{ code: 'instructor', title: 'Instructor' },
	{ code: 'orginstructor', title: 'Organization Instructor' },
	{ code: 'student', title: 'Student' },
	{ code: 'vendor', title: 'Vendor' },
	{ code: 'orgvendor', title: 'Organization Vendor' },
	{ code: 'parent', title: 'Parent/Guardian' },
	{ code: 'orgparent', title: 'Organization Parent/Guardian' },
	{ code: 'alumni', title: 'Alumni' },
	{ code: 'orgalumni', title: 'Organization Alumni' },
];

async function seedRoles(client) {
	console.log('📚 Seeding roles catalog...');
	for (const role of ROLE_TITLES) {
		await client.query(
			`INSERT INTO roles (id, code, title, created_at, updated_at)
       VALUES (uuid_generate_v4(), $1::role_code_enum, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, updated_at = CURRENT_TIMESTAMP`,
			[role.code, role.title]
		);
	}
	console.log('✅ Roles seeded/updated.');
}

async function ensureUserAuth(client, userId, passwordHash, isSuperadmin = false) {
	// Create user_auth if missing, default MFA policy for superadmin: required + totp
	const existing = await client.query('SELECT user_id FROM user_auth WHERE user_id = $1', [userId]);
	if (existing.rows.length > 0) return;
	await client.query(
		`INSERT INTO user_auth (
      user_id, password_hash, mfa_required, mfa_method, totp_secret_enc, backup_codes_enc, must_reset_password, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, NULL, NULL, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		[userId, passwordHash, isSuperadmin, isSuperadmin ? 'totp' : 'none', true]
	);
}

async function ensureUserRole(client, userId, roleCode, orgId = null) {
	const roleRes = await client.query('SELECT id FROM roles WHERE code = $1::role_code_enum', [roleCode]);
	if (roleRes.rows.length === 0) {
		throw new Error(`Role ${roleCode} not found. Did roles seed run?`);
	}
	const roleId = roleRes.rows[0].id;
	const exists = await client.query(
		'SELECT id FROM user_roles WHERE user_id=$1 AND role_id=$2 AND ((org_id IS NULL AND $3 IS NULL) OR org_id=$3)',
		[userId, roleId, orgId]
	);
	if (exists.rows.length > 0) return;
	await client.query(
		`INSERT INTO user_roles (id, user_id, role_id, org_id, created_at, updated_at)
     VALUES (uuid_generate_v4(), $1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		[userId, roleId, orgId]
	);
}

export async function seedUsersFeature() {
	console.log('\n🌱 Seeding Users feature (roles, superadmin bridge)...\n');
	const client = await getClient();
	try {
		await client.query('BEGIN');

		await seedRoles(client);

		// Bridge existing superadmin (if present in legacy schema)
		let superadminRow = null;
		try {
			const res = await client.query(
				`SELECT id, email, password_hash 
         FROM users 
         WHERE role = 'superadmin' 
         ORDER BY created_at ASC 
         LIMIT 1`
			);
			if (res.rows.length > 0) {
				superadminRow = res.rows[0];
			}
		} catch (err) {
			// users table might not exist yet or schema differs
			if (err.code !== '42P01') throw err;
		}

		if (superadminRow) {
			console.log(`👤 Found existing legacy superadmin (${superadminRow.email}), bridging...`);
			await ensureUserAuth(client, superadminRow.id, superadminRow.password_hash, true);
			await ensureUserRole(client, superadminRow.id, 'superadmin', null);
			console.log('✅ Superadmin bridged to user_auth and user_roles.');
		} else {
			console.log('ℹ️  No legacy superadmin found to bridge (skipping).');
		}

		await client.query('COMMIT');
		console.log('\n✅ Users feature seed completed.\n');
	} catch (error) {
		await client.query('ROLLBACK');
		console.error('❌ Users feature seed failed:', error.message);
		if (error.code === '42P01') {
			console.error('   Hint: Run migrations first: npm run db:migrate');
		}
		throw error;
	} finally {
		client.release();
	}
}

// Standalone runner
async function run() {
	try {
		await seedUsersFeature();
	} catch (e) {
		process.exitCode = 1;
	} finally {
		await closePool();
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	run();
}

export default seedUsersFeature;



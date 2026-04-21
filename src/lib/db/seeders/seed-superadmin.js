/**
 * Superadmin User Seeder
 * 
 * Creates the initial superadmin user with secure password hashing.
 * This seeder is idempotent - safe to run multiple times.
 * 
 * Superadmin credentials:
 * - Email: mithunkumarkulal33@gmail.com
 * - Password: ##/*%qwerty098765
 * - Role: superadmin
 * - org_id: NULL (global owner)
 */

import bcrypt from 'bcryptjs';
import { query, getClient, closePool } from '../index.js';

const SUPERADMIN_EMAIL = 'mithunkumarkulal33@gmail.com';
const SUPERADMIN_PASSWORD = '##/*%qwerty098765';
const SALT_ROUNDS = 12;

/**
 * Check if superadmin user already exists
 */
async function superadminExists(email) {
  try {
    const result = await query(
      'SELECT id, email, role FROM users WHERE email = $1 AND role = $2',
      [email, 'superadmin']
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    // If users table doesn't exist yet, return null
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  }
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password) {
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    throw new Error(`Failed to hash password: ${error.message}`);
  }
}

/**
 * Verify password hash (for testing purposes)
 */
async function verifyPassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    return false;
  }
}

/**
 * Seed superadmin user
 */
export async function seedSuperadmin() {
  console.log('🌱 Seeding superadmin user...\n');

  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Check if superadmin already exists
    const existing = await superadminExists(SUPERADMIN_EMAIL);
    
    if (existing) {
      console.log(`✅ Superadmin user already exists:`);
      console.log(`   Email: ${existing.email}`);
      console.log(`   Role: ${existing.role}`);
      console.log(`   ID: ${existing.id}\n`);
      
      // Verify the password hash is still valid (optional check)
      const userResult = await client.query(
        'SELECT password_hash, mfa_enabled, mfa_verified, mfa_secret FROM users WHERE id = $1',
        [existing.id]
      );
      
      if (userResult.rows.length > 0) {
        const userData = userResult.rows[0];
        const setParts = [];
        const values = [];
        let paramIndex = 1;
        
        const isValid = await verifyPassword(SUPERADMIN_PASSWORD, userData.password_hash);
        if (!isValid) {
          console.log('⚠️  Warning: Existing password hash does not match. Updating password...\n');
          const newHash = await hashPassword(SUPERADMIN_PASSWORD);
          setParts.push(`password_hash = $${paramIndex++}`);
          values.push(newHash);
        }
        
        // Always reset MFA state for superadmin when reseeding
        // This ensures MFA setup can be tested fresh
        console.log('🔄 Resetting MFA state for superadmin...\n');
        setParts.push(`mfa_enabled = $${paramIndex++}`);
        values.push(true);
        setParts.push(`mfa_verified = $${paramIndex++}`);
        values.push(false);
        setParts.push(`mfa_secret = $${paramIndex++}`);
        values.push(null);
        
        // Always update (at minimum, MFA state is being reset)
        setParts.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(existing.id);
        
        await client.query(
          `UPDATE users SET ${setParts.join(', ')} WHERE id = $${paramIndex}`,
          values
        );
        
        // Also delete any existing backup codes (clean slate for testing)
        await client.query(
          `DELETE FROM mfa_backup_codes WHERE user_id = $1`,
          [existing.id]
        );
        
        if (!isValid) {
          console.log('✅ Password hash updated successfully.\n');
        }
        console.log('✅ MFA state reset successfully. User can now set up MFA fresh.\n');
        console.log('   - MFA Enabled: true');
        console.log('   - MFA Verified: false (QR code will be shown)');
        console.log('   - MFA Secret: null (will be generated on setup)');
        console.log('   - Backup codes: deleted (will be generated on setup)\n');
      }
      
      await client.query('COMMIT');
      return { success: true, created: false, user: existing };
    }

    // Hash the password
    console.log('🔐 Hashing password...');
    const passwordHash = await hashPassword(SUPERADMIN_PASSWORD);
    console.log('✅ Password hashed successfully.\n');

    // Create superadmin user
    console.log('👤 Creating superadmin user...');
    const result = await client.query(
      `INSERT INTO users (
        email,
        password_hash,
        role,
        org_id,
        is_active,
        email_verified,
        mfa_enabled,
        mfa_verified,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, email, role, org_id, is_active, mfa_enabled`,
      [
        SUPERADMIN_EMAIL,
        passwordHash,
        'superadmin',
        null, // org_id is NULL for superadmin (global owner)
        true, // is_active
        false, // email_verified (can be verified later)
        true, // mfa_enabled (REQUIRED for superadmin security)
        false, // mfa_verified (will be set after QR scan and verification)
      ]
    );

    const newUser = result.rows[0];

    await client.query('COMMIT');

    console.log('✅ Superadmin user created successfully!\n');
    console.log('User Details:');
    console.log('─────────────────────────────────────');
    console.log(`ID: ${newUser.id}`);
    console.log(`Email: ${newUser.email}`);
    console.log(`Role: ${newUser.role}`);
    console.log(`Organization ID: ${newUser.org_id || 'NULL (Global Owner)'}`);
    console.log(`Active: ${newUser.is_active}`);
    console.log(`MFA Enabled: ${newUser.mfa_enabled}`);
    console.log('─────────────────────────────────────\n');
    console.log('⚠️  IMPORTANT: MFA setup required!');
    console.log('   The superadmin must complete MFA setup before accessing the dashboard.');
    console.log('   After login, you will be redirected to MFA setup page.\n');

    return { success: true, created: true, user: newUser };
  } catch (error) {
    await client.query('ROLLBACK');
    
    console.error('❌ Failed to seed superadmin user:\n');
    console.error(`Error: ${error.message}`);
    
    if (error.code === '23505') {
      console.error('\n💡 This might indicate a race condition. The user may have been created by another process.');
    } else if (error.code === '42P01') {
      console.error('\n💡 The users table does not exist. Please run migrations first:');
      console.error('   npm run db:migrate\n');
    } else if (error.code === '42703') {
      console.error('\n💡 Database schema mismatch. Please ensure migrations are up to date:');
      console.error('   npm run db:migrate\n');
    }
    
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run seeder (standalone execution)
 */
async function runSeeder() {
  try {
    await seedSuperadmin();
    console.log('✅ Seeding completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeeder();
}

export default seedSuperadmin;



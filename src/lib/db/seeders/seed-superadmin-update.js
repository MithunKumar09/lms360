/**
 * Seeder: Update Superadmin User
 * 
 * Updates the superadmin user with:
 * - first_name and last_name
 * - role column set to 'superadmin'
 * 
 * Run: node -r dotenv/config src/lib/db/seeders/seed-superadmin-update.js
 */

import { getClient } from '../index.js';

const SUPERADMIN_EMAIL = 'mithunkumarkulal33@gmail.com';
const SUPERADMIN_FIRST_NAME = 'Mithun';
const SUPERADMIN_LAST_NAME = 'Kumar';

async function updateSuperadmin() {
  console.log('\n🌱 Updating Superadmin User...\n');
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Find the superadmin user
    const userRes = await client.query(
      `SELECT id, email, first_name, last_name, role 
       FROM users 
       WHERE LOWER(email) = LOWER($1)`,
      [SUPERADMIN_EMAIL]
    );
    
    if (userRes.rows.length === 0) {
      throw new Error(`Superadmin user with email ${SUPERADMIN_EMAIL} not found`);
    }
    
    const user = userRes.rows[0];
    console.log('📋 Current user data:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   First Name: ${user.first_name || '(null)'}`);
    console.log(`   Last Name: ${user.last_name || '(null)'}`);
    console.log(`   Role: ${user.role || '(null)'}`);
    
    // Check if role column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('⚠️  Role column does not exist. Please run migration 006 first.');
      await client.query('ROLLBACK');
      return;
    }
    
    // Update the user
    const updateRes = await client.query(
      `UPDATE users 
       SET 
         first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         role = COALESCE($3, role),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, first_name, last_name, role, updated_at`,
      [SUPERADMIN_FIRST_NAME, SUPERADMIN_LAST_NAME, 'superadmin', user.id]
    );
    
    const updated = updateRes.rows[0];
    console.log('\n✅ Superadmin updated successfully:');
    console.log(`   ID: ${updated.id}`);
    console.log(`   Email: ${updated.email}`);
    console.log(`   First Name: ${updated.first_name}`);
    console.log(`   Last Name: ${updated.last_name}`);
    console.log(`   Role: ${updated.role}`);
    console.log(`   Updated At: ${updated.updated_at}`);
    
    // Also ensure user_roles has superadmin role assigned
    const roleCheck = await client.query(
      `SELECT ur.id, r.code 
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND r.code = 'superadmin'`,
      [user.id]
    );
    
    if (roleCheck.rows.length === 0) {
      console.log('\n⚠️  Superadmin role not found in user_roles. Checking if role exists...');
      const roleRes = await client.query(
        `SELECT id FROM roles WHERE code = 'superadmin'`
      );
      
      if (roleRes.rows.length === 0) {
        console.log('⚠️  Superadmin role does not exist in roles table. Creating...');
        await client.query(
          `INSERT INTO roles (id, code, title, created_at, updated_at)
           VALUES (uuid_generate_v4(), 'superadmin', 'Superadmin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (code) DO NOTHING`
        );
        const newRoleRes = await client.query(`SELECT id FROM roles WHERE code = 'superadmin'`);
        const roleId = newRoleRes.rows[0].id;
        
        await client.query(
          `INSERT INTO user_roles (id, user_id, role_id, org_id, created_at, updated_at)
           VALUES (uuid_generate_v4(), $1, $2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, role_id, org_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
          [user.id, roleId]
        );
        console.log('✅ Superadmin role assigned in user_roles');
      } else {
        const roleId = roleRes.rows[0].id;
        await client.query(
          `INSERT INTO user_roles (id, user_id, role_id, org_id, created_at, updated_at)
           VALUES (uuid_generate_v4(), $1, $2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, role_id, org_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
          [user.id, roleId]
        );
        console.log('✅ Superadmin role assigned in user_roles');
      }
    } else {
      console.log('✅ Superadmin role already assigned in user_roles');
    }
    
    await client.query('COMMIT');
    console.log('\n✅ Transaction committed successfully!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error updating superadmin:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run seeder
updateSuperadmin()
  .then(() => {
    console.log('✅ Seeder completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
  });


/**
 * Helper script to add 'mentor' role enum value
 * 
 * This script must be run OUTSIDE of a transaction because ALTER TYPE ... ADD VALUE
 * cannot be executed inside a transaction in PostgreSQL.
 * 
 * Usage: node src/lib/db/migrations/add-mentor-role-enum.js
 */

import { getClient, closePool } from '../index.js';

const MENTOR_ROLE = 'mentor';

async function addEnumValue() {
  console.log('🔧 Adding mentor role enum value...\n');

  const client = await getClient();
  try {
    // Check if enum type exists
    const enumCheck = await client.query(
      `SELECT oid FROM pg_type WHERE typname = 'role_code_enum'`
    );

    if (enumCheck.rows.length === 0) {
      console.error('❌ role_code_enum type does not exist. Run migration 004_users_schema.sql first.');
      process.exit(1);
    }

    // Check if value already exists
    const exists = await client.query(
      `SELECT 1 FROM pg_enum 
       WHERE enumlabel = $1 
       AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'role_code_enum')`,
      [MENTOR_ROLE]
    );

    if (exists.rows.length > 0) {
      console.log(`  ✅ ${MENTOR_ROLE} already exists in enum`);
      console.log('\n✅ Enum value already exists!');
      console.log('\n📝 Next step: Run the migration to seed the roles table:');
      console.log('   npm run db:migrate\n');
      return;
    }

    // Add the enum value (this must be done outside a transaction)
    await client.query(`ALTER TYPE role_code_enum ADD VALUE '${MENTOR_ROLE}'`);
    console.log(`  ✅ Added ${MENTOR_ROLE} to role_code_enum`);

    console.log('\n✅ Enum value added successfully!');
    console.log('\n📝 Next step: Run the migration to seed the roles table:');
    console.log('   npm run db:migrate\n');
  } catch (error) {
    if (error.code === '42710' || error.message.includes('already exists')) {
      console.log(`  ℹ️  ${MENTOR_ROLE} already exists (skipping)`);
      console.log('\n✅ Enum value already exists!');
    } else {
      console.error('\n❌ Error adding enum value:', error.message);
      process.exit(1);
    }
  } finally {
    client.release();
    await closePool();
  }
}

addEnumValue();


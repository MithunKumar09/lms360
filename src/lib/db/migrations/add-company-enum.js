/**
 * Helper script to add 'company' to role_code_enum
 * 
 * This script must be run OUTSIDE of a transaction because ALTER TYPE ... ADD VALUE
 * cannot be executed inside a transaction in PostgreSQL.
 * 
 * Usage: node src/lib/db/migrations/add-company-enum.js
 */

import { getClient, closePool } from '../index.js';

const NEW_ROLE = 'company';

async function addCompanyEnumValue() {
  console.log('🔧 Adding "company" to role_code_enum...\n');

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

    try {
      // Check if role already exists
      const exists = await client.query(
        `SELECT 1 FROM pg_enum 
         WHERE enumlabel = $1 
         AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'role_code_enum')`,
        [NEW_ROLE]
      );

      if (exists.rows.length > 0) {
        console.log(`  ✅ "${NEW_ROLE}" already exists in role_code_enum`);
        return;
      }

      // Add the enum value (this must be done outside a transaction)
      // We use a raw query without parameterization for ALTER TYPE
      console.log(`  🔄 Adding "${NEW_ROLE}" to role_code_enum...`);
      await client.query(`ALTER TYPE role_code_enum ADD VALUE '${NEW_ROLE}'`);
      console.log(`  ✅ Added "${NEW_ROLE}" to role_code_enum`);

      // Verify it was added
      const verify = await client.query(
        `SELECT 1 FROM pg_enum 
         WHERE enumlabel = $1 
         AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'role_code_enum')`,
        [NEW_ROLE]
      );

      if (verify.rows.length === 0) {
        console.error(`  ❌ Failed to verify "${NEW_ROLE}" was added`);
        process.exit(1);
      }

      console.log(`\n✅ Enum value "${NEW_ROLE}" added successfully!`);
    } catch (error) {
      if (error.code === '42710' || error.message.includes('already exists')) {
        console.log(`  ℹ️  "${NEW_ROLE}" already exists (skipping)`);
      } else {
        console.error(`  ❌ Failed to add "${NEW_ROLE}":`, error.message);
        throw error;
      }
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await closePool();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('add-company-enum.js')) {
  addCompanyEnumValue().catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
}

export default addCompanyEnumValue;

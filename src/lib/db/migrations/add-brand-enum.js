/**
 * Helper script to add 'brand' and 'mentor' to role_code_enum
 * 
 * This script must be run OUTSIDE of a transaction because ALTER TYPE ... ADD VALUE
 * cannot be executed inside a transaction in PostgreSQL.
 * 
 * Usage: node src/lib/db/migrations/add-brand-enum.js
 */

import { getClient, closePool } from '../index.js';

const NEW_ROLES = ['brand', 'mentor'];

async function addBrandEnumValue() {
  console.log('🔧 Adding "brand" and "mentor" to role_code_enum...\n');

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

    let addedCount = 0;

    // Process each role
    for (const roleCode of NEW_ROLES) {
      try {
        // Check if role already exists
        const exists = await client.query(
          `SELECT 1 FROM pg_enum 
           WHERE enumlabel = $1 
           AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'role_code_enum')`,
          [roleCode]
        );

        if (exists.rows.length > 0) {
          console.log(`  ✅ "${roleCode}" already exists in role_code_enum`);
          continue;
        }

        // Add the enum value (this must be done outside a transaction)
        // We use a raw query without parameterization for ALTER TYPE
        console.log(`  🔄 Adding "${roleCode}" to role_code_enum...`);
        await client.query(`ALTER TYPE role_code_enum ADD VALUE '${roleCode}'`);
        console.log(`  ✅ Added "${roleCode}" to role_code_enum`);
        addedCount++;

        // Verify it was added
        const verify = await client.query(
          `SELECT 1 FROM pg_enum 
           WHERE enumlabel = $1 
           AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'role_code_enum')`,
          [roleCode]
        );

        if (verify.rows.length === 0) {
          console.error(`  ❌ Failed to verify "${roleCode}" was added`);
          process.exit(1);
        }
      } catch (error) {
        if (error.code === '42710' || error.message.includes('already exists')) {
          console.log(`  ℹ️  "${roleCode}" already exists (skipping)`);
        } else {
          console.error(`  ❌ Failed to add "${roleCode}":`, error.message);
          throw error;
        }
      }
    }

    if (addedCount > 0) {
      console.log(`\n✅ ${addedCount} enum value(s) added successfully!`);
    } else {
      console.log('\n✅ All enum values already exist!');
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
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('add-brand-enum.js')) {
  addBrandEnumValue().catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
}

export default addBrandEnumValue;

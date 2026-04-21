/**
 * Helper script to add org-prefixed role enum values
 * 
 * This script must be run OUTSIDE of a transaction because ALTER TYPE ... ADD VALUE
 * cannot be executed inside a transaction in PostgreSQL.
 * 
 * Usage: node src/lib/db/migrations/add-org-roles-enum.js
 */

import { getClient, closePool } from '../index.js';

const ORG_ROLES = ['orginstructor', 'orgalumni', 'orgparent', 'orgvendor'];

async function addEnumValues() {
  console.log('🔧 Adding org-prefixed role enum values...\n');

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

    // Add each enum value
    for (const roleCode of ORG_ROLES) {
      try {
        // Check if value already exists
        const exists = await client.query(
          `SELECT 1 FROM pg_enum 
           WHERE enumlabel = $1 
           AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'role_code_enum')`,
          [roleCode]
        );

        if (exists.rows.length > 0) {
          console.log(`  ✅ ${roleCode} already exists in enum`);
          continue;
        }

        // Add the enum value (this must be done outside a transaction)
        // We use a raw query without parameterization for ALTER TYPE
        await client.query(`ALTER TYPE role_code_enum ADD VALUE '${roleCode}'`);
        console.log(`  ✅ Added ${roleCode} to role_code_enum`);
      } catch (error) {
        if (error.code === '42710' || error.message.includes('already exists')) {
          console.log(`  ℹ️  ${roleCode} already exists (skipping)`);
        } else {
          console.error(`  ❌ Failed to add ${roleCode}:`, error.message);
          throw error;
        }
      }
    }

    console.log('\n✅ All enum values added successfully!');
    console.log('\n📝 Next step: Run the migration to seed the roles table:');
    console.log('   npm run db:migrate\n');
  } catch (error) {
    console.error('\n❌ Error adding enum values:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await closePool();
  }
}

addEnumValues();


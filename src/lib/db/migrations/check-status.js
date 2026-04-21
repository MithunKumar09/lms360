/**
 * Check Migration Status
 * 
 * Shows which migrations have been applied and which are pending.
 */

import { query, closePool } from '../index.js';
import { getMigrationFiles } from './run-migration.js';

async function checkStatus() {
  console.log('📊 Migration Status');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Enable UUID extension (required for uuid_generate_v4())
    try {
      await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    } catch (error) {
      // Extension might already exist or permission issue, continue anyway
      if (error.code !== '42710' && !error.message.includes('already exists')) {
        console.warn('⚠️  Could not enable uuid-ossp extension:', error.message);
      }
    }

    // Ensure schema_migrations table exists
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          migration_name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
          checksum VARCHAR(64) NULL
        )
      `);
    } catch (error) {
      if (error.code !== '42P01') {
        throw error;
      }
    }

    // Get all migration files
    const allMigrations = await getMigrationFiles();
    
    if (allMigrations.length === 0) {
      console.log('No migration files found.\n');
      return;
    }

    // Get applied migrations
    const result = await query(
      'SELECT migration_name, applied_at FROM schema_migrations ORDER BY migration_name'
    );
    const appliedMigrations = new Set(result.rows.map(row => row.migration_name));
    const appliedMap = new Map(result.rows.map(row => [row.migration_name, row.applied_at]));

    console.log(`Total migration files: ${allMigrations.length}\n`);

    let pendingCount = 0;
    let appliedCount = 0;

    for (const migration of allMigrations) {
      if (appliedMigrations.has(migration)) {
        console.log(`✅ ${migration} (applied at ${appliedMap.get(migration)})`);
        appliedCount++;
      } else {
        console.log(`⏳ ${migration} (pending)`);
        pendingCount++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`Applied: ${appliedCount} | Pending: ${pendingCount}\n`);

    if (pendingCount > 0) {
      console.log('💡 Run "npm run db:migrate" to apply pending migrations.\n');
    } else {
      console.log('✅ All migrations are up to date!\n');
    }
  } catch (error) {
    console.error('❌ Error checking migration status:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

checkStatus();


/**
 * Database Migration Runner
 * 
 * This script runs database migrations in order and tracks them in schema_migrations table.
 * 
 * Usage:
 *   node src/lib/db/migrations/run-migration.js [migration_file]
 * 
 * If no migration file is specified, it will run all pending migrations.
 */

import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { query, getClient, closePool } from '../index.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Calculate SHA-256 checksum of file content
 */
function calculateChecksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Check if migration has already been applied
 */
async function isMigrationApplied(migrationName) {
  try {
    const result = await query(
      'SELECT id, checksum FROM schema_migrations WHERE migration_name = $1',
      [migrationName]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    // If schema_migrations table doesn't exist, return null
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  }
}

/**
 * Record migration as applied
 */
async function recordMigration(migrationName, checksum) {
  try {
    await query(
      'INSERT INTO schema_migrations (migration_name, checksum) VALUES ($1, $2)',
      [migrationName, checksum]
    );
  } catch (error) {
    // If migration already exists, that's okay (idempotent)
    if (error.code === '23505') {
      console.log(`  ⚠️  Migration ${migrationName} already recorded (skipping)`);
      return;
    }
    throw error;
  }
}

/**
 * Run a single migration file
 */
async function runMigration(migrationFile) {
  const migrationPath = join(__dirname, migrationFile);
  const migrationName = migrationFile;

  console.log(`\n📄 Processing migration: ${migrationName}`);

  // Check if already applied
  const applied = await isMigrationApplied(migrationName);
  if (applied) {
    // Verify checksum
    const content = await readFile(migrationPath, 'utf-8');
    const currentChecksum = calculateChecksum(content);
    
    if (applied.checksum === currentChecksum) {
      console.log(`  ✅ Migration ${migrationName} already applied (checksum matches)`);
      return { applied: true, skipped: true };
    } else {
      console.log(`  ⚠️  Migration ${migrationName} was applied but checksum changed!`);
      console.log(`     Previous: ${applied.checksum}`);
      console.log(`     Current:  ${currentChecksum}`);
      console.log(`     This might indicate the migration file was modified after being applied.`);
    }
  }

  // Read migration file
  let content;
  try {
    content = await readFile(migrationPath, 'utf-8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`  ❌ Migration file not found: ${migrationPath}`);
      throw error;
    }
    throw error;
  }

  // Calculate checksum
  const checksum = calculateChecksum(content);

  // Run migration in a transaction
const noTransactionMigrations = new Set([
  '085_composite_indexes.sql',
]);

const hasConcurrentIndex = /create\s+index\s+concurrently/i.test(content);

const useTransaction =
  !noTransactionMigrations.has(migrationName) &&
  !hasConcurrentIndex;

const client = await getClient();
try {
  if (useTransaction) {
    await client.query('BEGIN');
  }

console.log(`  🔄 Executing migration...`);

if (useTransaction) {
  await client.query(content);
} else {
  const statements = content
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await client.query(statement);
  }
}

  await client.query(
    `INSERT INTO schema_migrations (migration_name, checksum)
     VALUES ($1, $2)
     ON CONFLICT (migration_name)
     DO UPDATE SET checksum = EXCLUDED.checksum`,
    [migrationName, checksum]
  );

  if (useTransaction) {
    await client.query('COMMIT');
  }

  console.log(
    `  ✅ Migration ${migrationName} applied successfully ${
      useTransaction ? '(transactional)' : '(non-transactional)'
    }`
  );

  return { applied: true, skipped: false };
} catch (error) {
  if (useTransaction) {
    await client.query('ROLLBACK');
  }
  console.error(`  ❌ Migration ${migrationName} failed:`);
  console.error(`     ${error.message}`);
  throw error;
} finally {
  client.release();
}
}

/**
 * Get all migration files in order
 */
async function getMigrationFiles() {
  try {
    const files = await readdir(__dirname);
    return files
      .filter(file => 
        file.endsWith('.sql') && 
        /^\d{3}_/.test(file) &&
        !file.includes('ROLLBACK') // Skip rollback files
      )
      .sort();
  } catch (error) {
    console.error('Error reading migration directory:', error);
    throw error;
  }
}

/**
 * Get pending migrations (not yet applied)
 */
async function getPendingMigrations() {
  const allMigrations = await getMigrationFiles();
  const pending = [];

  for (const migration of allMigrations) {
    const applied = await isMigrationApplied(migration);
    if (!applied) {
      pending.push(migration);
    }
  }

  return pending;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const specificMigration = args[0];

  console.log('🚀 Database Migration Runner');
  console.log('═══════════════════════════════════════════════════════════');

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
          checksum VARCHAR(64) NULL,
          CONSTRAINT schema_migrations_name_format CHECK (migration_name ~* '^[0-9]{3}_[a-z0-9_]+\.sql$')
        )
      `);
    } catch (error) {
      // Table might already exist, that's okay
      if (error.code !== '42P01') {
        throw error;
      }
    }

    if (specificMigration) {
      // Run specific migration
      console.log(`\n🎯 Running specific migration: ${specificMigration}`);
      await runMigration(specificMigration);
    } else {
      // Run all pending migrations
      const pending = await getPendingMigrations();
      
      if (pending.length === 0) {
        console.log('\n✅ No pending migrations. Database is up to date!');
        
        // Show applied migrations
        const result = await query(
          'SELECT migration_name, applied_at FROM schema_migrations ORDER BY applied_at'
        );
        if (result.rows.length > 0) {
          console.log('\n📋 Applied migrations:');
          result.rows.forEach(row => {
            console.log(`   ✅ ${row.migration_name} (applied at ${row.applied_at})`);
          });
        }
        return;
      }

      console.log(`\n📦 Found ${pending.length} pending migration(s):`);
      pending.forEach((migration, index) => {
        console.log(`   ${index + 1}. ${migration}`);
      });

      for (const migration of pending) {
        await runMigration(migration);
      }

      console.log('\n✅ All migrations completed successfully!');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run if executed directly (robust across platforms)
try {
  const invokedHref = pathToFileURL(process.argv[1]).href;
  if (import.meta.url === invokedHref) {
    main().catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
  }
} catch {
  // Fallback: attempt to run main
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runMigration, getPendingMigrations, getMigrationFiles };


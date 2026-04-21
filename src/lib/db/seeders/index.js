/**
 * Database Seeders Runner
 * 
 * This script runs all database seeders in order.
 * Seeders are idempotent - safe to run multiple times.
 * 
 * Usage:
 *   node src/lib/db/seeders/index.js
 *   npm run seed
 */

import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { seedSuperadmin } from './seed-superadmin.js';
import { seedSuperadmin2 } from './seed-superadmin-2.js';
import { seedClassesSubjects } from './seed-classes-subjects.js';
import { seedCertificateTemplates } from './seed-certificate-templates.js';
import { closePool } from '../index.js';

/**
 * Run all seeders
 */
async function runAllSeeders() {
  console.log('🌱 Database Seeding');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results = {
    success: [],
    failed: [],
  };

  try {
    // Run seeders in order
    const seeders = [
      { name: 'Superadmin User', fn: seedSuperadmin },
      { name: 'Superadmin User 2', fn: seedSuperadmin2 },
      { name: 'Classes & Subjects', fn: seedClassesSubjects },
      { name: 'Certificate Templates', fn: seedCertificateTemplates },
      // Add more seeders here as needed
    ];

    for (const seeder of seeders) {
      try {
        console.log(`\n📦 Running: ${seeder.name}`);
        console.log('─────────────────────────────────────');
        
        const result = await seeder.fn();
        
        if (result.success) {
          results.success.push({
            name: seeder.name,
            result,
          });
        } else {
          results.failed.push({
            name: seeder.name,
            error: 'Seeder returned success: false',
          });
        }
      } catch (error) {
        console.error(`\n❌ ${seeder.name} failed:`, error.message);
        results.failed.push({
          name: seeder.name,
          error: error.message,
        });
        // Continue with other seeders even if one fails
      }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 Seeding Summary');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (results.success.length > 0) {
      console.log('✅ Successful:');
      results.success.forEach(({ name }) => {
        console.log(`   ✅ ${name}`);
      });
      console.log('');
    }

    if (results.failed.length > 0) {
      console.log('❌ Failed:');
      results.failed.forEach(({ name, error }) => {
        console.log(`   ❌ ${name}: ${error}`);
      });
      console.log('');
      process.exit(1);
    } else {
      console.log('✅ All seeders completed successfully!\n');
    }
  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run if executed directly
// Check if this module is the main entry point
const __filename = fileURLToPath(import.meta.url);
const mainModulePath = process.argv[1] ? resolve(process.argv[1]) : '';
const currentFilePath = resolve(__filename);

// Normalize paths for comparison (handle Windows paths)
const normalizePath = (path) => path.replace(/\\/g, '/').toLowerCase();
const isMainModule = normalizePath(currentFilePath) === normalizePath(mainModulePath);

if (isMainModule) {
  runAllSeeders().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runAllSeeders };



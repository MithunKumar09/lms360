/**
 * Database Connection Testing Utility
 * 
 * This script tests the database connection and displays connection information.
 * Run with: node src/lib/db/test-connection.js
 */

import { healthCheck, closePool } from './index.js';

async function testConnection() {
  console.log('Testing database connection...\n');

  try {
    const health = await healthCheck();

    if (health.status === 'healthy') {
      console.log('✅ Database connection successful!\n');
      console.log('Connection Details:');
      console.log('─────────────────────────────────────');
      console.log(`Status: ${health.status}`);
      console.log(`Timestamp: ${health.timestamp}`);
      console.log(`Database Time: ${health.database.currentTime}`);
      console.log(`PostgreSQL Version: ${health.database.version}`);
      console.log('\nConnection Pool:');
      console.log(`  Total Connections: ${health.database.pool.totalCount}`);
      console.log(`  Idle Connections: ${health.database.pool.idleCount}`);
      console.log(`  Waiting Requests: ${health.database.pool.waitingCount}`);
      console.log('─────────────────────────────────────\n');
    } else {
      console.error('❌ Database connection failed!\n');
      console.error('Error Details:');
      console.error('─────────────────────────────────────');
      console.error(`Status: ${health.status}`);
      console.error(`Error Message: ${health.error.message}`);
      console.error(`Error Code: ${health.error.code}`);
      console.error('─────────────────────────────────────\n');
      console.error('Please check:');
      console.error('1. Database server is running');
      console.error('2. Connection credentials in .env or .env.local are correct');
      console.error('3. Database exists and is accessible');
      console.error('4. Network connectivity to database server\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to test database connection:\n');
    console.error(error);
    console.error('\nPlease check your database configuration in .env or .env.local\n');
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run the test
testConnection();


/**
 * Data Migration Script: Local PostgreSQL to Neon
 * 
 * This script exports data from your local PostgreSQL database
 * and imports it into your Neon production database.
 * 
 * Usage:
 *   node scripts/migrate-data-to-neon.js
 * 
 * Prerequisites:
 *   1. Local PostgreSQL database must be accessible
 *   2. Neon production database connection string must be in .env.local as DATABASE_URL
 *   3. Local database connection must be in .env.local (DB_HOST, DB_PORT, etc.)
 * 
 * The script will:
 *   - Export all data from local database (excluding system tables)
 *   - Import data into Neon production database
 *   - Handle foreign key constraints properly
 *   - Skip tables that already have data (optional)
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { readFileSync } from 'fs';

// Load environment variables
if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else if (existsSync('.env')) {
  dotenv.config({ path: '.env' });
} else {
  dotenv.config();
}

// Validate LOCAL_DATABASE_URL if set
if (process.env.LOCAL_DATABASE_URL) {
  const localUrl = process.env.LOCAL_DATABASE_URL.trim();
  if (localUrl && !localUrl.startsWith('postgresql://') && !localUrl.startsWith('postgres://')) {
    console.error('⚠️  Warning: LOCAL_DATABASE_URL is set but invalid.');
    console.error(`   Current value: ${localUrl.substring(0, 80)}${localUrl.length > 80 ? '...' : ''}`);
    console.error('   Expected format: postgresql://username:password@host:port/database');
    console.error('   If this is incorrect, remove LOCAL_DATABASE_URL and use individual DB_* variables instead.\n');
  }
}

// Get local database config
function getLocalDbConfig() {
  // First, check if LOCAL_DATABASE_URL is provided (for flexibility)
  const localDatabaseUrl = process.env.LOCAL_DATABASE_URL;
  if (localDatabaseUrl && localDatabaseUrl.trim()) {
    const trimmed = localDatabaseUrl.trim();
    // Validate it's a proper PostgreSQL URL
    if (!trimmed.startsWith('postgresql://') && !trimmed.startsWith('postgres://')) {
      throw new Error(
        'LOCAL_DATABASE_URL must be a valid PostgreSQL connection string.\n' +
        `Current value: ${trimmed.substring(0, 50)}${trimmed.length > 50 ? '...' : ''}\n` +
        'Format: postgresql://username:password@host:port/database'
      );
    }
    return {
      connectionString: trimmed,
      ssl: false, // Local DB typically doesn't use SSL
    };
  }

  // Check if we have individual variables for local database
  const hasLocalConfig = process.env.DB_HOST || process.env.DB_NAME;
  const hasDatabaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim();
  
  // If DATABASE_URL exists but no local config, provide helpful error
  if (hasDatabaseUrl && !hasLocalConfig && !localDatabaseUrl) {
    throw new Error(
      'Local database configuration is required for data migration.\n\n' +
      'You have DATABASE_URL set (which points to Neon), but no local database config.\n\n' +
      'Please add ONE of the following to .env.local:\n\n' +
      'Option 1: Use LOCAL_DATABASE_URL (connection string)\n' +
      '  LOCAL_DATABASE_URL=postgresql://postgres:password@localhost:5432/edurock_db\n\n' +
      'Option 2: Use individual variables\n' +
      '  DB_HOST=localhost\n' +
      '  DB_PORT=5432\n' +
      '  DB_NAME=edurock_db\n' +
      '  DB_USER=postgres\n' +
      '  DB_PASSWORD=your_local_password\n\n' +
      'Note: DATABASE_URL is used for Neon (destination), not local (source).'
    );
  }

  // Use individual variables
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_NAME || 'edurock_db';
  const user = process.env.DB_USER || 'postgres';
  
  // Handle password - ensure it's always a string
  let password = '';
  if (process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== null) {
    password = String(process.env.DB_PASSWORD);
  }

  const config = {
    host,
    port,
    database,
    user,
    ssl: false, // Local DB typically doesn't use SSL
  };

  // Add password if it's set (even if empty string)
  if (process.env.DB_PASSWORD !== undefined) {
    config.password = password;
  }

  return config;
}

// Get Neon database config
function getNeonDbConfig() {
  // Check for NEON_DATABASE_URL first (explicit - recommended to avoid conflicts)
  let databaseUrl = process.env.NEON_DATABASE_URL;
  
  // Fall back to DATABASE_URL if NEON_DATABASE_URL is not set
  if (!databaseUrl) {
    databaseUrl = process.env.DATABASE_URL;
  }
  
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL or NEON_DATABASE_URL is required for Neon database connection.\n' +
      'Please add one of these to your .env.local file:\n' +
      '  - DATABASE_URL=postgresql://... (Neon connection string)\n' +
      '  - NEON_DATABASE_URL=postgresql://... (explicit Neon connection string - recommended)'
    );
  }

  // Check if DATABASE_URL looks like a local database (localhost)
  if (databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')) {
    console.warn('⚠️  Warning: DATABASE_URL appears to point to localhost, not Neon.');
    console.warn('   If you have both local and Neon databases, use:');
    console.warn('   - NEON_DATABASE_URL for Neon (production)');
    console.warn('   - LOCAL_DATABASE_URL for local (source)\n');
  }

  // Parse Neon connection string
  if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    return {
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false, // Neon uses SSL
      },
    };
  }

  throw new Error('Invalid DATABASE_URL format. Must start with postgresql:// or postgres://');
}

// Get all user tables (exclude system tables)
async function getUserTables(pool) {
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT LIKE '_prisma%'
    ORDER BY table_name;
  `;
  
  const result = await pool.query(query);
  return result.rows.map(row => row.table_name);
}

// Get table dependencies to determine processing order
async function getTableDependencies(pool) {
  const query = `
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public';
  `;
  
  const result = await pool.query(query);
  const dependencies = {};
  
  result.rows.forEach(row => {
    if (!dependencies[row.table_name]) {
      dependencies[row.table_name] = [];
    }
    if (!dependencies[row.table_name].includes(row.foreign_table_name)) {
      dependencies[row.table_name].push(row.foreign_table_name);
    }
  });
  
  return dependencies;
}

// Priority tables that should be migrated first (base tables with no dependencies)
const PRIORITY_TABLES = [
  'users',
  'organizations',
  'roles',
  'program_types',
  'program_nodes',
  'sections',
  'terms',
  'course_categories',
  'course_levels',
  'course_types',
  'course_skills',
  'course_subcategories',
  'certificate_templates',
  'schema_migrations',
];

// Sort tables by dependency order (tables with no dependencies first)
function sortTablesByDependencies(tables, dependencies) {
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();
  
  // Separate priority tables
  const priority = tables.filter(t => PRIORITY_TABLES.includes(t));
  const others = tables.filter(t => !PRIORITY_TABLES.includes(t));
  
  function visit(table) {
    if (visiting.has(table)) {
      // Circular dependency detected, just add it
      return;
    }
    if (visited.has(table)) {
      return;
    }
    
    visiting.add(table);
    
    // Visit dependencies first
    if (dependencies[table]) {
      dependencies[table].forEach(dep => {
        if (tables.includes(dep)) {
          visit(dep);
        }
      });
    }
    
    visiting.delete(table);
    visited.add(table);
    sorted.push(table);
  }
  
  // Process priority tables first
  priority.forEach(table => visit(table));
  // Then process others
  others.forEach(table => visit(table));
  
  return sorted;
}

// Get table data with proper ordering (respecting foreign keys)
async function getTableData(pool, tableName) {
  try {
    let query = `SELECT * FROM ${tableName}`;
    
    // Special handling for self-referential tables
    if (tableName === 'program_nodes') {
      // Insert rows with NULL parent_id first, then others ordered by parent_id
      query += ` ORDER BY parent_id NULLS FIRST, id`;
    } else {
      // Try to order by id, but fall back to no ordering if id doesn't exist
      try {
        // Test if id column exists
        await pool.query(`SELECT id FROM ${tableName} LIMIT 1`);
        query += ` ORDER BY id`;
      } catch {
        // No id column, use no ordering
      }
    }
    
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.warn(`⚠️  Could not read data from ${tableName}:`, error.message);
    return [];
  }
}

// Get column names for a table (from destination to match schema)
async function getTableColumns(pool, tableName) {
  const query = `
    SELECT 
      column_name, 
      data_type, 
      udt_name,
      is_nullable, 
      column_default,
      is_generated,
      generation_expression
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = $1
    ORDER BY ordinal_position;
  `;
  
  const result = await pool.query(query, [tableName]);
  // Filter out generated columns (like search_tsv)
  return result.rows.filter(col => !col.is_generated || col.is_generated === 'NEVER');
}

// Check if table has data in Neon
async function tableHasData(pool, tableName) {
  try {
    const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    return false;
  }
}

// Check if a foreign key reference exists in Neon
async function checkForeignKeyExists(neonPool, foreignTable, foreignColumn, value) {
  if (value === null || value === undefined) {
    return true; // NULL is allowed
  }
  try {
    const query = `SELECT 1 FROM ${foreignTable} WHERE ${foreignColumn} = $1 LIMIT 1`;
    const result = await neonPool.query(query, [value]);
    return result.rows.length > 0;
  } catch (error) {
    // If table doesn't exist or column doesn't exist, assume it's valid
    return true;
  }
}

// Get foreign key constraints for a table
async function getForeignKeys(pool, tableName) {
  const query = `
    SELECT
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = $1;
  `;
  
  try {
    const result = await pool.query(query, [tableName]);
    return result.rows;
  } catch (error) {
    return [];
  }
}

// Insert data into Neon table
async function insertTableData(neonPool, tableName, columns, data, localColumns, foreignKeys = []) {
  if (data.length === 0) {
    return { inserted: 0, skipped: 0 };
  }

  // Get column names that exist in both local and Neon
  const neonColumnNames = columns.map(col => col.column_name);
  const localColumnNames = localColumns.map(col => col.column_name);
  const commonColumns = neonColumnNames.filter(col => localColumnNames.includes(col));
  
  if (commonColumns.length === 0) {
    console.warn(`   ⚠️  No common columns between local and Neon for ${tableName}`);
    return { inserted: 0, skipped: 0 };
  }

  // Check if this is a self-referential table (has parent_id or similar)
  const hasParentId = commonColumns.includes('parent_id');
  const idColumn = commonColumns.find(col => col === 'id' || col.endsWith('_id') && col !== 'parent_id');

  // For self-referential tables, sort data by depth (parents first)
  let sortedData = data;
  if (hasParentId && idColumn) {
    // Build a map of id -> row for quick lookup
    const idMap = new Map();
    data.forEach(row => {
      if (row[idColumn]) {
        idMap.set(row[idColumn], row);
      }
    });

    // Sort by depth: rows with NULL parent_id first, then by parent depth
    sortedData = [];
    const inserted = new Set();
    
    function insertRowAndChildren(row) {
      if (inserted.has(row[idColumn])) {
        return;
      }
      
      // If this row has a parent, insert parent first
      if (row.parent_id && idMap.has(row.parent_id)) {
        const parent = idMap.get(row.parent_id);
        if (!inserted.has(parent[idColumn])) {
          insertRowAndChildren(parent);
        }
      }
      
      sortedData.push(row);
      inserted.add(row[idColumn]);
    }
    
    // Process all rows
    data.forEach(row => insertRowAndChildren(row));
  }

  const placeholders = commonColumns.map((_, i) => `$${i + 1}`).join(', ');
  const columnList = commonColumns.join(', ');
  
  const insertQuery = `
    INSERT INTO ${tableName} (${columnList})
    VALUES (${placeholders})
    ON CONFLICT DO NOTHING;
  `;

  let inserted = 0;
  let skipped = 0;

  // Use a transaction with SAVEPOINTs to allow partial rollbacks
  const client = await neonPool.connect();
  try {
    await client.query('BEGIN');
    
    for (let i = 0; i < sortedData.length; i++) {
      const row = sortedData[i];
      const savepointName = `sp_${i}`;
      
      // Create a savepoint before each row insert
      await client.query(`SAVEPOINT ${savepointName}`);
      
      try {
        const values = commonColumns.map((col, idx) => {
          const value = row[col];
          const columnInfo = columns.find(c => c.column_name === col);
          const dataType = columnInfo?.data_type || columnInfo?.udt_name || '';
          
          // Handle null values
          if (value === null || value === undefined) {
            return null;
          }
          
          // Handle JSON/JSONB columns
          if (dataType === 'json' || dataType === 'jsonb' || dataType === 'jsonb' || dataType === '_jsonb') {
            // If it's already a string, try to parse it
            if (typeof value === 'string') {
              try {
                // Try to parse as JSON
                const parsed = JSON.parse(value);
                // Return as stringified JSON (pg will handle it)
                return JSON.stringify(parsed);
              } catch (e) {
                // If parsing fails, it might be invalid JSON
                // Try to fix common issues: double-encoded JSON
                try {
                  const doubleParsed = JSON.parse(JSON.parse(value));
                  return JSON.stringify(doubleParsed);
                } catch {
                  // If still invalid, return null or empty object
                  console.warn(`   ⚠️  Invalid JSON in ${tableName}.${col}, using null`);
                  return null;
                }
              }
            }
            // If it's already an object, stringify it
            if (typeof value === 'object') {
              return JSON.stringify(value);
            }
            // Otherwise, return as-is (might be a valid JSON string)
            return value;
          }
          
          // Handle array columns (PostgreSQL array types)
          if (dataType && (dataType.startsWith('_') || dataType.includes('array') || dataType === 'ARRAY')) {
            // If it's a string that looks like an array, try to parse it
            if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
              try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                  return parsed; // pg library handles arrays directly
                }
              } catch {
                // If parsing fails, might be PostgreSQL array format like {a,b,c}
                // But if it's a plain string like "dfghj", it's invalid - return null
                if (!value.startsWith('{') && !value.startsWith('[')) {
                  console.warn(`   ⚠️  Invalid array format in ${tableName}.${col}: "${value}", using null`);
                  return null;
                }
                // Return as string and let PostgreSQL handle it
                return value;
              }
            }
            // If it's already an array, return it
            if (Array.isArray(value)) {
              return value; // pg library handles arrays directly
            }
            // If it's a plain string that's not array-like, it's invalid
            if (typeof value === 'string' && !value.startsWith('{') && !value.startsWith('[')) {
              console.warn(`   ⚠️  Invalid array format in ${tableName}.${col}: "${value}", using null`);
              return null;
            }
          }
          
          // Handle objects (might be JSONB that wasn't detected)
          if (typeof value === 'object' && !Array.isArray(value) && !Buffer.isBuffer(value)) {
            // Check if it's a Date object
            if (value instanceof Date) {
              return value;
            }
            // Otherwise, stringify it (for JSONB)
            return JSON.stringify(value);
          }
          
          return value;
        });

        const result = await client.query(insertQuery, values);
        if (result.rowCount > 0) {
          inserted++;
        } else {
          skipped++;
        }
        // Release savepoint on success
        await client.query(`RELEASE SAVEPOINT ${savepointName}`);
      } catch (error) {
        // Rollback to savepoint to continue processing other rows
        await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
        
        // If it's a conflict, count as skipped
        if (error.code === '23505') { // unique_violation
          skipped++;
        } 
        // If it's a foreign key violation, skip this row but continue
        else if (error.code === '23503') { // foreign_key_violation
          skipped++;
          // Only log first few foreign key violations to avoid spam
          if (skipped <= 3) {
            console.warn(`   ⚠️  Skipping row due to foreign key violation: ${error.message.substring(0, 100)}`);
          }
        }
        // If it's a check constraint violation (like cohorts level mismatch), skip
        else if (error.code === '23514') { // check_violation
          skipped++;
          if (skipped <= 3) {
            console.warn(`   ⚠️  Skipping row due to check constraint violation: ${error.message.substring(0, 100)}`);
          }
        }
        // For other errors (like malformed array), skip but log
        else {
          skipped++;
          if (skipped <= 3) {
            console.warn(`   ⚠️  Skipping row due to error: ${error.message.substring(0, 100)}`);
          }
        }
      }
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return { inserted, skipped };
}

// Main migration function
async function migrateData() {
  console.log('🚀 Starting data migration from local PostgreSQL to Neon...\n');

  let localPool = null;
  let neonPool = null;

  try {
    // Connect to local database
    console.log('📡 Connecting to local PostgreSQL database...');
    try {
      const localConfig = getLocalDbConfig();
      const connectionInfo = localConfig.connectionString 
        ? 'connection string (LOCAL_DATABASE_URL)'
        : `${localConfig.user}@${localConfig.host}:${localConfig.port}/${localConfig.database}`;
      console.log(`   Using: ${connectionInfo}`);
      localPool = new Pool(localConfig);
      await localPool.query('SELECT NOW()');
      console.log('✅ Connected to local database\n');
    } catch (error) {
      // If it's a configuration error, the message is already helpful
      if (error.message.includes('Local database configuration') || 
          error.message.includes('LOCAL_DATABASE_URL must be')) {
        throw error;
      }
      // Otherwise, provide connection troubleshooting
      console.error('   Connection error:', error.message);
      throw new Error(
        `Failed to connect to local database: ${error.message}\n\n` +
        'Troubleshooting:\n' +
        '  1. Verify local PostgreSQL is running\n' +
        '  2. Check connection details in .env.local:\n' +
        '     - LOCAL_DATABASE_URL=postgresql://user:password@host:port/dbname\n' +
        '     - OR DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD\n' +
        '  3. Test connection manually: psql -h localhost -U postgres -d edurock_db\n' +
        '  4. If using SCRAM authentication, ensure password is correct'
      );
    }

    // Connect to Neon database
    console.log('📡 Connecting to Neon production database...');
    try {
      const neonConfig = getNeonDbConfig();
      neonPool = new Pool(neonConfig);
      await neonPool.query('SELECT NOW()');
      console.log('✅ Connected to Neon database\n');
    } catch (error) {
      throw new Error(
        `Failed to connect to Neon database: ${error.message}\n\n` +
        'Please ensure DATABASE_URL or NEON_DATABASE_URL is set in .env.local\n' +
        'Get your connection string from: Neon Console → Project → Connection Details'
      );
    }

    // Get all tables
    console.log('📋 Getting list of tables...');
    const tables = await getUserTables(localPool);
    console.log(`Found ${tables.length} tables\n`);
    
    // Get table dependencies and sort by dependency order
    console.log('🔗 Analyzing table dependencies...');
    const dependencies = await getTableDependencies(localPool);
    const sortedTables = sortTablesByDependencies(tables, dependencies);
    console.log(`✅ Tables sorted by dependency order\n`);

    // Ask user if they want to skip tables with existing data
    const skipExisting = process.argv.includes('--skip-existing') || 
                         process.argv.includes('-s');

    let totalInserted = 0;
    let totalSkipped = 0;
    const errors = [];

    // Process each table in dependency order
    for (const tableName of sortedTables) {
      try {
        console.log(`\n📦 Processing table: ${tableName}`);

        // Check if table has data in Neon
        if (skipExisting) {
          const hasData = await tableHasData(neonPool, tableName);
          if (hasData) {
            console.log(`   ⏭️  Skipping ${tableName} (already has data)`);
            continue;
          }
        }

        // Get table data from local
        const data = await getTableData(localPool, tableName);
        console.log(`   📊 Found ${data.length} rows in local database`);

        if (data.length === 0) {
          console.log(`   ℹ️  No data to migrate`);
          continue;
        }

        // Get column information from both databases
        const localColumns = await getTableColumns(localPool, tableName);
        const neonColumns = await getTableColumns(neonPool, tableName);
        
        // Get foreign key constraints for this table to validate references
        const foreignKeys = await getForeignKeys(neonPool, tableName);

        // Insert data into Neon
        console.log(`   ⬆️  Inserting data into Neon...`);
        const { inserted, skipped } = await insertTableData(neonPool, tableName, neonColumns, data, localColumns, foreignKeys);
        
        totalInserted += inserted;
        totalSkipped += skipped;
        
        console.log(`   ✅ Inserted ${inserted} rows, skipped ${skipped} duplicates`);
      } catch (error) {
        console.error(`   ❌ Error processing ${tableName}:`, error.message);
        errors.push({ table: tableName, error: error.message });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`✅ Total rows inserted: ${totalInserted}`);
    console.log(`⏭️  Total rows skipped: ${totalSkipped}`);
    
    if (errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      errors.forEach(({ table, error }) => {
        console.log(`   - ${table}: ${error}`);
      });
    } else {
      console.log('\n🎉 Migration completed successfully!');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Close connections
    if (localPool) {
      await localPool.end();
      console.log('\n🔌 Closed local database connection');
    }
    if (neonPool) {
      await neonPool.end();
      console.log('🔌 Closed Neon database connection');
    }
  }
}

// Run migration
migrateData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


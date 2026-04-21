/**
 * Production-grade PostgreSQL Database Connection Pool
 * 
 * Features:
 * - Singleton pattern for connection pool
 * - Connection pooling (min 2, max 10 connections)
 * - Automatic retry logic
 * - Health check functionality
 * - Graceful shutdown handling
 * - SSL support for production
 * - Environment-based configuration
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { existsSync } from 'fs';

// Load environment variables
// Support both .env and .env.local (Next.js standard)
// .env.local takes precedence if both exist
if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else if (existsSync('.env')) {
  dotenv.config({ path: '.env' });
} else {
  // Try default .env as fallback
  dotenv.config();
}

let pool = null;
let isShuttingDown = false;

// Reuse a single pool across HMR reloads in Next.js dev
// This prevents exhausting Postgres connections when modules are reloaded
const globalForPool = globalThis;
if (!globalForPool.__edurock_db_pool) {
  globalForPool.__edurock_db_pool = null;
}
if (!globalForPool.__edurock_db_isShuttingDown) {
  globalForPool.__edurock_db_isShuttingDown = false;
}
pool = globalForPool.__edurock_db_pool || null;
isShuttingDown = globalForPool.__edurock_db_isShuttingDown || false;

/**
 * Get effective SSL mode for the connection
 * Automatically detects localhost connections and disables SSL
 * In development, 'prefer' is treated as 'disable' to avoid SSL errors with local PostgreSQL
 * 
 * @param {string} databaseUrl - The database URL to check (optional)
 */
function getEffectiveSslMode(databaseUrl = null) {
  const isProduction = process.env.NODE_ENV === 'production';
  const sslMode = process.env.DB_SSL_MODE;
  
  // Get the database URL to check (use provided URL or check env vars)
  const urlToCheck = databaseUrl || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';
  
  // Check if we're connecting to localhost (local database)
  const isLocalhost = urlToCheck.includes('localhost') || 
                      urlToCheck.includes('127.0.0.1') || 
                      (urlToCheck.includes(':5432') && !urlToCheck.includes('neon.tech') && !urlToCheck.includes('aws.neon.tech'));
  
  // If connecting to localhost, always disable SSL (local PostgreSQL typically doesn't support SSL)
  if (isLocalhost) {
    console.log('🔌 [DB] Detected localhost connection, disabling SSL');
    return 'disable';
  }
  
  // If explicitly set, use it (except in development where 'prefer' causes issues)
  if (sslMode) {
    // In development, convert 'prefer' to 'disable' to avoid SSL connection errors
    if (!isProduction && sslMode === 'prefer') {
      return 'disable';
    }
    return sslMode;
  }
  
  // Default: disable for development, prefer for production
  return isProduction ? 'prefer' : 'disable';
}

/**
 * Parse and update DATABASE_URL with correct SSL mode
 */
function parseAndUpdateDatabaseUrl(url) {
  try {
    // Parse the PostgreSQL URL
    // Format: postgresql://user:password@host:port/database?params
    const urlObj = new URL(url);
    const sslMode = getEffectiveSslMode(url); // Pass URL to detect localhost
    
    // Update or add sslmode parameter
    urlObj.searchParams.set('sslmode', sslMode);
    
    // Reconstruct the URL
    // Note: URL.toString() will properly encode the URL
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, try manual parsing for PostgreSQL URLs
    // This handles cases where URL constructor might fail
    try {
      const sslMode = getEffectiveSslMode(url); // Pass URL to detect localhost
      
      // Check if URL has query parameters
      const queryIndex = url.indexOf('?');
      if (queryIndex === -1) {
        // No query params, add sslmode
        return `${url}?sslmode=${sslMode}`;
      } else {
        // Has query params, update or add sslmode
        const baseUrl = url.substring(0, queryIndex);
        const queryString = url.substring(queryIndex + 1);
        const params = new URLSearchParams(queryString);
        params.set('sslmode', sslMode);
        return `${baseUrl}?${params.toString()}`;
      }
    } catch (fallbackError) {
      // If all parsing fails, return original URL
      console.warn('Failed to parse DATABASE_URL, using as-is:', fallbackError.message);
      return url;
    }
  }
}

/**
 * Get database configuration from environment variables
 * Supports both DATABASE_URL and individual variables
 * Checks both DATABASE_URL and NEON_DATABASE_URL
 */
function getDbConfig() {
  // Check if we're in production FIRST
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Prioritize NEON_DATABASE_URL over DATABASE_URL (Neon is for production)
  // Check NEON_DATABASE_URL first, then DATABASE_URL as fallback
  let databaseUrl = process.env.NEON_DATABASE_URL;
  const hasNeonDatabaseUrl = databaseUrl && databaseUrl.trim();
  
  // If NEON_DATABASE_URL is not set or empty, try DATABASE_URL
  if (!hasNeonDatabaseUrl) {
    databaseUrl = process.env.DATABASE_URL;
  }
  const hasDatabaseUrl = databaseUrl && databaseUrl.trim();
  
  // In production, log what we found (for debugging)
  if (isProduction) {
    console.log('🔍 [DB CONFIG] Production mode detected');
    const dbUrlStatus = process.env.DATABASE_URL 
      ? (process.env.DATABASE_URL.trim() ? `SET (length: ${process.env.DATABASE_URL.length})` : 'SET but EMPTY') 
      : 'NOT SET';
    const neonUrlStatus = process.env.NEON_DATABASE_URL 
      ? (process.env.NEON_DATABASE_URL.trim() ? `SET (length: ${process.env.NEON_DATABASE_URL.length})` : 'SET but EMPTY ⚠️') 
      : 'NOT SET';
    console.log(`🔍 [DB CONFIG] DATABASE_URL: ${dbUrlStatus}`);
    console.log(`🔍 [DB CONFIG] NEON_DATABASE_URL: ${neonUrlStatus}`);
    if (databaseUrl && databaseUrl.trim()) {
      // Log first 50 chars and last 10 chars (hide password in middle)
      const trimmed = databaseUrl.trim();
      const preview = trimmed.length > 60 
        ? `${trimmed.substring(0, 30)}...${trimmed.substring(trimmed.length - 20)}`
        : trimmed.substring(0, 50);
      console.log(`🔍 [DB CONFIG] Using database URL (preview): ${preview}`);
    } else {
      console.log('🔍 [DB CONFIG] No valid database URL found - will throw error');
    }
  }
  
  // In production, REQUIRE a valid database URL (fail fast)
  if (isProduction && !hasDatabaseUrl) {
    const isNeonEmpty = process.env.NEON_DATABASE_URL !== undefined && !process.env.NEON_DATABASE_URL.trim();
    const isDbUrlEmpty = process.env.DATABASE_URL !== undefined && !process.env.DATABASE_URL.trim();
    
    let specificIssue = '';
    if (isNeonEmpty || isDbUrlEmpty) {
      specificIssue = '\n⚠️ ISSUE DETECTED: Environment variable exists but is EMPTY (e.g., NEON_DATABASE_URL=)\n' +
                      '   You need to set the actual connection string value, not just the variable name.\n';
    }
    
    const errorMessage = 
      '❌ Database Configuration Error (Production):\n' +
      'DATABASE_URL or NEON_DATABASE_URL must be set and non-empty in production environment.\n' +
      'The application cannot connect to localhost in serverless environments.\n' +
      specificIssue +
      '\n⚠️ Current Environment Variables Status:\n' +
      `   DATABASE_URL: ${process.env.DATABASE_URL === undefined ? 'NOT SET' : (process.env.DATABASE_URL.trim() ? `SET (${process.env.DATABASE_URL.length} chars)` : 'SET but EMPTY ⚠️')}\n` +
      `   NEON_DATABASE_URL: ${process.env.NEON_DATABASE_URL === undefined ? 'NOT SET' : (process.env.NEON_DATABASE_URL.trim() ? `SET (${process.env.NEON_DATABASE_URL.length} chars)` : 'SET but EMPTY ⚠️')}\n` +
      `   NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}\n\n` +
      '✅ Solution: Set NEON_DATABASE_URL environment variable in your Vercel project settings:\n' +
      '1. Go to https://vercel.com/dashboard\n' +
      '2. Select your project\n' +
      '3. Navigate to Settings → Environment Variables\n' +
      '4. Find NEON_DATABASE_URL and click Edit\n' +
      '5. Set the VALUE to your full Neon PostgreSQL connection string\n' +
      '   Format: postgresql://user:password@host.region.provider.com/database?sslmode=require\n' +
      '   ⚠️ Do NOT leave it empty! It must contain the full connection string.\n\n' +
      'Example: postgresql://neondb_owner:password@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require\n\n' +
      'After setting the value, redeploy your application.';
    
    console.error(errorMessage);
    throw new Error('DATABASE_URL or NEON_DATABASE_URL must be set and non-empty in production');
  }
  
  // If DATABASE_URL is provided, validate and use it
  if (databaseUrl) {
    const trimmedUrl = databaseUrl.trim();
    
    // Check if it's empty or just whitespace
    if (!trimmedUrl) {
      // In production, never fall back to individual variables - throw error instead
      if (isProduction) {
        const errorMessage = 
          '❌ Database Configuration Error (Production):\n' +
          'DATABASE_URL or NEON_DATABASE_URL is set but EMPTY.\n' +
          'In production, you must provide a valid PostgreSQL connection string.\n\n' +
          '✅ Solution: Set a valid NEON_DATABASE_URL in Vercel environment variables.';
        console.error(errorMessage);
        throw new Error('DATABASE_URL or NEON_DATABASE_URL is empty in production');
      }
      // In development, fall back to individual variables
      console.warn('⚠️  DATABASE_URL is set but empty. Falling back to individual DB_* variables.');
    } else {
      // Basic validation - check if it looks like a PostgreSQL URL
      if (!trimmedUrl.startsWith('postgresql://') && !trimmedUrl.startsWith('postgres://')) {
        // In production, never fall back to individual variables - throw error instead
        if (isProduction) {
          const errorMessage = 
            '❌ Database Configuration Error (Production):\n' +
            'DATABASE_URL or NEON_DATABASE_URL is INVALID.\n' +
            `Current value (first 50 chars): ${trimmedUrl.substring(0, 50)}\n` +
            'In production, you must provide a valid PostgreSQL connection string starting with postgresql:// or postgres://\n\n' +
            '✅ Solution: Set a valid NEON_DATABASE_URL in Vercel environment variables.';
          console.error(errorMessage);
          throw new Error('DATABASE_URL or NEON_DATABASE_URL is invalid in production');
        }
        // In development, fall back to individual variables
        console.warn(
          `⚠️  DATABASE_URL is invalid (doesn't start with postgresql:// or postgres://). ` +
          `Falling back to individual DB_* variables.\n` +
          `Current DATABASE_URL value: ${trimmedUrl.substring(0, 50)}${trimmedUrl.length > 50 ? '...' : ''}`
        );
      } else {
        // Valid database URL - but in production, check if it contains localhost and throw error
        if (isProduction && (trimmedUrl.includes('localhost') || trimmedUrl.includes('127.0.0.1'))) {
          const errorMessage = 
            '❌ Database Configuration Error (Production):\n' +
            'The database URL contains localhost, which is not available in serverless environments.\n' +
            `Current URL (preview): ${trimmedUrl.substring(0, 60)}...\n\n` +
            '⚠️ Issue: DATABASE_URL contains localhost, but NEON_DATABASE_URL should be used in production.\n' +
            '✅ Solution:\n' +
            '1. In Vercel, set NEON_DATABASE_URL to your Neon PostgreSQL connection string\n' +
            '2. Either remove DATABASE_URL or ensure it points to a remote database (not localhost)\n' +
            '3. NEON_DATABASE_URL will be prioritized if set.\n';
          console.error(errorMessage);
          throw new Error('Database URL contains localhost in production');
        }
        
        // Valid DATABASE_URL - parse and update SSL mode based on DB_SSL_MODE
        const updatedUrl = parseAndUpdateDatabaseUrl(trimmedUrl);
        const sslConfig = getSslConfig();
        
        // Build config with connection string and SSL settings
        // Note: When using connectionString, we can still override SSL with explicit config
        const config = {
          connectionString: updatedUrl,
          max: parseInt(process.env.DB_POOL_MAX || '10', 10),
          min: parseInt(process.env.DB_POOL_MIN || '2', 10),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 30000, // Increased from 10s to 30s
        };
        
        // Explicitly set SSL config to override URL parameter if needed
        // This ensures SSL is properly disabled for local development
        if (sslConfig.ssl === false) {
          config.ssl = false;
        } else if (sslConfig.ssl && typeof sslConfig.ssl === 'object') {
          config.ssl = sslConfig.ssl;
        }
        
        return config;
      }
    }
  }

  // Otherwise, use individual variables
  // BUT: In production, we should NEVER reach here because we require DATABASE_URL/NEON_DATABASE_URL
  if (isProduction) {
    const errorMessage = 
      '❌ Database Configuration Error (Production):\n' +
      'Reached individual DB_* variables fallback in production (this should not happen).\n' +
      'DATABASE_URL or NEON_DATABASE_URL must be set and valid in production.\n\n' +
      '⚠️ Debug Info:\n' +
      `   DATABASE_URL: ${process.env.DATABASE_URL ? `SET (${process.env.DATABASE_URL.length} chars)` : 'NOT SET'}\n` +
      `   NEON_DATABASE_URL: ${process.env.NEON_DATABASE_URL ? `SET (${process.env.NEON_DATABASE_URL.length} chars)` : 'NOT SET'}\n\n` +
      '✅ Solution: Set NEON_DATABASE_URL in Vercel environment variables with a valid PostgreSQL connection string.';
    console.error(errorMessage);
    throw new Error('Individual DB_* variables fallback reached in production');
  }
  
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_NAME || 'edurock_db';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD;

  // In production, prevent using localhost defaults (which won't work)
  if (isProduction && (host === 'localhost' || host === '127.0.0.1')) {
    const errorMessage = 
      '❌ Database Configuration Error (Production):\n' +
      'DATABASE_URL or NEON_DATABASE_URL must be set in production environment.\n' +
      'The application is trying to connect to localhost (127.0.0.1:5432), which is not available in serverless environments.\n\n' +
      '⚠️ Current Environment Variables:\n' +
      `   DATABASE_URL: ${process.env.DATABASE_URL ? 'SET (but may be empty/invalid)' : 'NOT SET'}\n` +
      `   NEON_DATABASE_URL: ${process.env.NEON_DATABASE_URL ? 'SET (but may be empty/invalid)' : 'NOT SET'}\n` +
      `   DB_HOST: ${process.env.DB_HOST || 'NOT SET (defaulting to localhost)'}\n\n` +
      '✅ Solution: Set DATABASE_URL environment variable in your Vercel project settings:\n' +
      '1. Go to https://vercel.com/dashboard\n' +
      '2. Select your project: edurock-next\n' +
      '3. Navigate to Settings → Environment Variables\n' +
      '4. Add DATABASE_URL with your PostgreSQL connection string\n' +
      '   Format: postgresql://username:password@host:port/database?sslmode=require\n\n' +
      'Example: postgresql://user:pass@your-db-host.region.provider.com:5432/dbname?sslmode=require\n\n' +
      'After setting, redeploy your application.';
    
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Validate required fields
  if (password === undefined || password === null) {
      throw new Error(
        'Database password (DB_PASSWORD) is not set in .env or .env.local\n' +
        'Please add DB_PASSWORD=your_password to your .env file (or .env.local).\n' +
        'Alternatively, you can use DATABASE_URL with a full connection string.'
      );
  }

  // Ensure password is a string (even if empty, it should be explicitly set)
  const passwordString = String(password);

  const config = {
    host,
    port,
    database,
    user,
    password: passwordString,
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000, // Increased from 10s to 30s
    ...getSslConfig(),
  };

  return config;
}

/**
 * Get SSL configuration based on environment
 */
function getSslConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  // Use the same effective SSL mode logic
  // Check which database URL is being used
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';
  const sslMode = getEffectiveSslMode(databaseUrl);

  // In production, require SSL unless explicitly disabled
  if (isProduction && sslMode !== 'disable') {
    return {
      ssl: {
        rejectUnauthorized: sslMode === 'verify-full' || sslMode === 'verify-ca',
      },
    };
  }

  // In development, use prefer mode (use SSL if available, but don't require)
  if (sslMode === 'require' || sslMode === 'verify-ca' || sslMode === 'verify-full') {
    return {
      ssl: {
        rejectUnauthorized: sslMode === 'verify-full' || sslMode === 'verify-ca',
      },
    };
  }

  // For 'prefer' or 'allow', don't set ssl config (let pg handle it)
  // For 'disable', explicitly disable
  if (sslMode === 'disable') {
    return { ssl: false };
  }

  // For 'prefer' or 'allow', return empty object to let pg handle it
  return {};
}

/**
 * Create or get the database connection pool (Singleton pattern)
 */
function getPool() {
  // Always validate config FIRST - this ensures production errors are caught early
  // before returning any cached pool
  let config;
  try {
    config = getDbConfig(); // This will throw if DATABASE_URL is missing in production
  } catch (error) {
    // If getDbConfig throws (e.g., missing DATABASE_URL in production),
    // close any existing pool and rethrow
    if (pool && !pool.ended) {
      try {
        pool.end().catch(() => {});
      } catch (e) {
        // Ignore errors closing old pool
      }
      pool = null;
      globalForPool.__edurock_db_pool = null;
    }
    throw error;
  }
  
  // Now check if we have a valid cached pool
  // If we got here, config is valid (getDbConfig() would have thrown if invalid)
  if (pool && !pool.ended) {
    return pool;
  }

  if (isShuttingDown) {
    throw new Error('Database pool is shutting down. Cannot create new connections.');
  }

  try {
    
    // Validate config before creating pool
    if (config.connectionString && (!config.connectionString || typeof config.connectionString !== 'string')) {
      throw new Error(
        'Invalid DATABASE_URL connection string. Please check your .env or .env.local file.\n' +
        'Format: postgresql://username:password@host:port/database'
      );
    }
    
    // Lower max in development to reduce risk of exhausting local Postgres slots
    if (process.env.NODE_ENV !== 'production') {
      config.max = Math.min(config.max || 10, 5);
      config.idleTimeoutMillis = 20000;
      // Keep connection timeout higher even in dev to handle slow connections
      config.connectionTimeoutMillis = 30000;
    }

    pool = new Pool(config);

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
      // Don't exit the process, just log the error
    });

    // Log pool events in development
    if (process.env.NODE_ENV !== 'production') {
      pool.on('connect', () => {
        console.log('New database client connected');
      });

      pool.on('remove', () => {
        console.log('Database client removed from pool');
      });
    }

    // Persist on globalThis for HMR reuse
    globalForPool.__edurock_db_pool = pool;
    return pool;
  } catch (error) {
    // If it's a configuration error, provide helpful message
    if (error.message && (
      error.message.includes('DB_PASSWORD') || 
      error.message.includes('DATABASE_URL') ||
      error.message.includes('searchParams') ||
      error.message.includes('connection string')
    )) {
      console.error('\n❌ Database Configuration Error:');
      console.error(error.message);
      console.error('\n💡 Please check your .env or .env.local file and ensure database credentials are set correctly.');
      console.error('   Make sure DATABASE_URL is a valid PostgreSQL connection string or use individual DB_* variables.\n');
    } else {
      console.error('Failed to create database pool:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    throw error;
  }
}

/**
 * Execute a query with automatic retry logic
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @param {number} retries - Number of retry attempts (default: 3)
 * @returns {Promise} Query result
 */
export async function query(text, params = [], retries = 3) {
  const pool = getPool();
  let lastError;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const start = Date.now();
      const result = await pool.query(text, params);
      const duration = Date.now() - start;

      // Log slow queries in development
      if (process.env.NODE_ENV !== 'production' && duration > 1000) {
        console.warn(`Slow query detected (${duration}ms):`, text.substring(0, 100));
      }

      return result;
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      if (
        error.code === '42P01' || // relation does not exist
        error.code === '42703' || // column does not exist
        error.code === '23505' || // unique violation
        error.code === '23503'    // foreign key violation
      ) {
        throw error;
      }

      // Retry on connection errors
      if (
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.message.includes('Connection terminated') ||
        error.message.includes('timeout exceeded when trying to connect')
      ) {
        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
          console.warn(`Database query failed (${error.code || 'timeout'}), retrying in ${delay}ms... (attempt ${attempt + 1}/${retries})`);
          
          // If pool might be exhausted, wait a bit longer
          const pool = getPool();
          if (pool.waitingCount > 0) {
            const extraDelay = 500 + Math.floor(Math.random() * 1000); // 0.5-1.5s jitter
            console.warn(`Pool has ${pool.waitingCount} waiting connections, adding ${extraDelay}ms delay`);
            await new Promise((resolve) => setTimeout(resolve, delay + extraDelay));
          } else {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
          continue;
        }
      }

      // Retry when Postgres is out of connection slots (53300)
      if (error.code === '53300' || /remaining connection slots/i.test(error.message || '')) {
        if (attempt < retries - 1) {
          const delay = 500 + Math.floor(Math.random() * 1000); // 0.5-1.5s jitter
          console.warn(`Database is busy (53300). Retrying in ${delay}ms... (attempt ${attempt + 1}/${retries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>} Database client
 */
export async function getClient() {
  const pool = getPool();
  return await pool.connect();
}

/**
 * Health check function to verify database connectivity
 * @returns {Promise<Object>} Health check result
 */
export async function healthCheck() {
  try {
    const result = await query('SELECT NOW() as current_time, version() as version', [], 1);
    const pool = getPool();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        currentTime: result.rows[0].current_time,
        version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
        pool: {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount,
        },
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        code: error.code,
      },
    };
  }
}

/**
 * Gracefully shutdown the database connection pool
 * @returns {Promise<void>}
 */
export async function closePool() {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  globalForPool.__edurock_db_isShuttingDown = true;

  if (pool && !pool.ended) {
    try {
      console.log('Closing database connection pool...');
      await pool.end();
      console.log('Database connection pool closed successfully');
      globalForPool.__edurock_db_pool = null;
    } catch (error) {
      console.error('Error closing database pool:', error);
      throw error;
    }
  }
}

/**
 * Initialize the database connection pool
 * Call this at application startup
 */
export function initPool() {
  try {
    const pool = getPool();
    console.log('Database connection pool initialized');
    return pool;
  } catch (error) {
    console.error('Failed to initialize database pool:', error);
    throw error;
  }
}

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await closePool();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await closePool();
    process.exit(0);
  });

  process.on('beforeExit', async () => {
    await closePool();
  });
}

// Export the pool getter for advanced usage
export { getPool };

// Default export
export default {
  query,
  getClient,
  healthCheck,
  closePool,
  initPool,
  getPool,
};


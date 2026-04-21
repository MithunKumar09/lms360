/**
 * Session Cleanup Job
 * 
 * Removes expired sessions from the database.
 * Can be run as a cron job or scheduled task.
 */

import { cleanupExpiredSessions } from '@/lib/auth/sessionManager.js';

/**
 * Cleanup expired sessions
 * 
 * @returns {Promise<Object>} Cleanup result
 */
export async function runSessionCleanup() {
  try {
    const deletedCount = await cleanupExpiredSessions();
    
    console.log(`Session cleanup completed: ${deletedCount} expired sessions removed`);
    
    return {
      success: true,
      deletedCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Session cleanup error:', error);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Run cleanup if called directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runSessionCleanup()
    .then((result) => {
      console.log('Cleanup result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}

export default {
  runSessionCleanup,
};



/**
 * Backup Codes Utilities
 * 
 * Generates and manages backup codes for MFA.
 * Backup codes are hashed before storage for security.
 */

import crypto from 'crypto';
import { query, getClient } from '../db/index.js';

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8; // 8 characters per code

/**
 * Generate backup codes
 * @param {number} count - Number of codes to generate (default: 10)
 * @returns {Array<string>} Array of backup codes
 */
export function generateBackupCodes(count = BACKUP_CODE_COUNT) {
  const codes = [];
  
  for (let i = 0; i < count; i++) {
    // Generate random code (8 characters, alphanumeric)
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }

  return codes;
}

/**
 * Hash a backup code for storage
 * @param {string} code - Plain backup code
 * @returns {string} Hashed code (SHA-256)
 */
export function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

/**
 * Verify a backup code against stored hash
 * @param {string} code - Plain backup code from user
 * @param {string} hashedCode - Stored hash
 * @returns {boolean} True if code matches
 */
export function verifyBackupCode(code, hashedCode) {
  const codeHash = hashBackupCode(code);
  return crypto.timingSafeEqual(
    Buffer.from(codeHash),
    Buffer.from(hashedCode)
  );
}

/**
 * Store backup codes in database (hashed)
 * @param {string} userId - User ID
 * @param {Array<string>} codes - Plain backup codes
 * @returns {Promise<void>}
 */
export async function storeBackupCodes(userId, codes) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Delete old backup codes for this user
    await client.query(
      `DELETE FROM mfa_backup_codes WHERE user_id = $1`,
      [userId]
    );

    // Insert new backup codes (hashed)
    for (const code of codes) {
      const codeHash = hashBackupCode(code);
      await client.query(
        `INSERT INTO mfa_backup_codes (user_id, code_hash, used)
         VALUES ($1, $2, false)`,
        [userId, codeHash]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verify and mark a backup code as used
 * @param {string} userId - User ID
 * @param {string} code - Plain backup code
 * @returns {Promise<boolean>} True if code is valid and was unused
 */
export async function useBackupCode(userId, code) {
  try {
    // Get all unused backup codes for this user
    const result = await query(
      `SELECT id, code_hash FROM mfa_backup_codes
       WHERE user_id = $1 AND used = false`,
      [userId]
    );

    // Check each code
    for (const row of result.rows) {
      if (verifyBackupCode(code, row.code_hash)) {
        // Mark as used
        await query(
          `UPDATE mfa_backup_codes SET used = true WHERE id = $1`,
          [row.id]
        );
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error using backup code:', error);
    return false;
  }
}

/**
 * Get unused backup codes count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Count of unused backup codes
 */
export async function getUnusedBackupCodesCount(userId) {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM mfa_backup_codes
       WHERE user_id = $1 AND used = false`,
      [userId]
    );

    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('Error getting backup codes count:', error);
    return 0;
  }
}

/**
 * Get all backup codes for a user (masked, showing only first 2 and last 2 characters)
 * @param {string} userId - User ID
 * @returns {Promise<Array<Object>>} Array of backup code info
 */
export async function getBackupCodesInfo(userId) {
  try {
    const result = await query(
      `SELECT id, code_hash, used, created_at
       FROM mfa_backup_codes
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    // Return masked info (we can't show the actual codes, only status)
    return result.rows.map((row, index) => ({
      id: row.id,
      index: index + 1,
      used: row.used,
      createdAt: row.created_at,
      // Show masked version: "XX**XXXX" format
      masked: `****${row.code_hash.substring(0, 4)}`,
    }));
  } catch (error) {
    console.error('Error getting backup codes info:', error);
    return [];
  }
}

/**
 * Regenerate backup codes (invalidate old ones, create new ones)
 * @param {string} userId - User ID
 * @returns {Promise<Array<string>>} New backup codes (plain text, only returned once)
 */
export async function regenerateBackupCodes(userId) {
  const newCodes = generateBackupCodes();
  await storeBackupCodes(userId, newCodes);
  return newCodes;
}

export default {
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  storeBackupCodes,
  useBackupCode,
  getUnusedBackupCodesCount,
  getBackupCodesInfo,
  regenerateBackupCodes,
};


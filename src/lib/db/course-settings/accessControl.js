/**
 * Access Control Settings Database Utilities
 * 
 * @module db/course-settings/accessControl
 */

import { query, getClient } from '../index.js';

/**
 * Get all access control settings
 * @param {string} [role] - Optional role filter (default: 'admin')
 * @returns {Promise<Object[]>} Array of access control settings
 */
export async function getAccessControlSettings(role = 'admin') {
  try {
    const result = await query(
      'SELECT * FROM access_control_settings WHERE role = $1 ORDER BY feature_name ASC',
      [role]
    );
    return result.rows;
  } catch (error) {
    throw error;
  }
}

/**
 * Get access control setting for specific role and feature
 * @param {string} role - Role name
 * @param {string} feature_name - Feature name
 * @returns {Promise<Object|null>} Access control setting or null if not found
 */
export async function getAccessControlSetting(role, feature_name) {
  try {
    const result = await query(
      'SELECT * FROM access_control_settings WHERE role = $1 AND feature_name = $2',
      [role, feature_name]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Create or update access control setting
 * @param {Object} data - Access control data
 * @param {string} data.role - Role name (default: 'admin')
 * @param {string} data.feature_name - Feature name
 * @param {number} data.read_access - Read access (0 or 1)
 * @param {number} data.write_access - Write access (0 or 1)
 * @param {string} data.created_by - User ID who created/updated this
 * @returns {Promise<Object>} Created or updated access control setting
 */
export async function upsertAccessControlSetting(data) {
  try {
    const {
      role = 'admin',
      feature_name,
      read_access = 0,
      write_access = 0,
      created_by,
    } = data;

    const result = await query(
      `INSERT INTO access_control_settings (
        role, feature_name, read_access, write_access, created_by
      ) VALUES (
        $1, $2, $3, $4, $5
      )
      ON CONFLICT (role, feature_name)
      DO UPDATE SET
        read_access = EXCLUDED.read_access,
        write_access = EXCLUDED.write_access,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        role,
        feature_name,
        read_access,
        write_access,
        created_by,
      ]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23514') {
      throw new Error(`Invalid access control data: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Update multiple access control settings at once
 * @param {Object} settings - Object with feature_name as key and {read_access, write_access} as value
 * @param {string} role - Role name (default: 'admin')
 * @param {string} created_by - User ID who updated this
 * @returns {Promise<Object[]>} Array of updated access control settings
 */
export async function updateAccessControlSettings(settings, role = 'admin', created_by) {
  try {
    const client = await getClient();
    const results = [];

    try {
      await client.query('BEGIN');

      for (const [feature_name, { read_access = 0, write_access = 0 }] of Object.entries(settings)) {
        const result = await client.query(
          `INSERT INTO access_control_settings (
            role, feature_name, read_access, write_access, created_by
          ) VALUES (
            $1, $2, $3, $4, $5
          )
          ON CONFLICT (role, feature_name)
          DO UPDATE SET
            read_access = EXCLUDED.read_access,
            write_access = EXCLUDED.write_access,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *`,
          [
            role,
            feature_name,
            read_access,
            write_access,
            created_by,
          ]
        );
        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.code === '23514') {
      throw new Error(`Invalid access control data: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if user has access to a feature
 * @param {string} role - Role name
 * @param {string} feature_name - Feature name
 * @param {string} action - Action type ('read' or 'write')
 * @returns {Promise<boolean>} True if access is allowed, false otherwise
 */
export async function checkAccess(role, feature_name, action) {
  try {
    const setting = await getAccessControlSetting(role, feature_name);
    
    if (!setting) {
      // Default: no access if setting doesn't exist
      // Log for debugging
      console.warn(`[Access Control] Setting not found for role=${role}, feature=${feature_name}. Access denied by default.`);
      return false;
    }

    // Verify setting structure
    if (typeof setting.read_access !== 'number' || typeof setting.write_access !== 'number') {
      console.error(`[Access Control] Invalid setting structure for role=${role}, feature=${feature_name}:`, setting);
      return false;
    }

    if (action === 'read') {
      const hasAccess = setting.read_access === 1;
      console.log(`[Access Control] Read access check: role=${role}, feature=${feature_name}, hasAccess=${hasAccess}, read_access=${setting.read_access}`);
      return hasAccess;
    } else if (action === 'write') {
      const hasAccess = setting.write_access === 1;
      console.log(`[Access Control] Write access check: role=${role}, feature=${feature_name}, hasAccess=${hasAccess}, write_access=${setting.write_access}`);
      return hasAccess;
    }

    console.warn(`[Access Control] Unknown action: ${action} for role=${role}, feature=${feature_name}`);
    return false;
  } catch (error) {
    console.error(`[Access Control] Error checking access for role=${role}, feature=${feature_name}, action=${action}:`, error);
    throw error;
  }
}

/**
 * Delete access control setting
 * @param {string} role - Role name
 * @param {string} feature_name - Feature name
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteAccessControlSetting(role, feature_name) {
  try {
    const result = await query(
      'DELETE FROM access_control_settings WHERE role = $1 AND feature_name = $2 RETURNING id',
      [role, feature_name]
    );
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
}

/**
 * Initialize default access control settings (all disabled)
 * @param {string} role - Role name (default: 'admin')
 * @param {string} created_by - User ID who created this
 * @returns {Promise<Object[]>} Array of created access control settings
 */
export async function initializeAccessControlSettings(role = 'admin', created_by) {
  try {
    const features = [
      'categories',
      'subcategories',
      'types',
      'program_types',
      'levels',
      'skills',
      'testimonials',
    ];

    const client = await getClient();
    const results = [];

    try {
      await client.query('BEGIN');

      for (const feature_name of features) {
        const result = await client.query(
          `INSERT INTO access_control_settings (
            role, feature_name, read_access, write_access, created_by
          ) VALUES (
            $1, $2, $3, $4, $5
          )
          ON CONFLICT (role, feature_name) DO NOTHING
          RETURNING *`,
          [
            role,
            feature_name,
            0, // read_access = 0 (disabled)
            0, // write_access = 0 (disabled)
            created_by,
          ]
        );
        
        if (result.rows.length > 0) {
          results.push(result.rows[0]);
        }
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    throw error;
  }
}


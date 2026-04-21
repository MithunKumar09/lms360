/**
 * Sidebar Access Control Database Utilities
 * 
 * @module db/sidebar-access-control
 */

import { query, getClient } from './index.js';

/**
 * Valid sidebar names
 */
export const VALID_SIDEBAR_NAMES = [
  'superadmin',
  'admin',
  'instructor',
  'vendor',
  'mentor',
  'student',
];

/**
 * Valid scope types
 */
export const VALID_SCOPE_TYPES = [
  'global',
  'role',
  'organization',
  'user',
];

/**
 * Validate sidebar name
 * @param {string} sidebarName - Sidebar name to validate
 * @throws {Error} If sidebar name is invalid
 */
function validateSidebarName(sidebarName) {
  if (!VALID_SIDEBAR_NAMES.includes(sidebarName)) {
    throw new Error(`Invalid sidebar name: ${sidebarName}. Must be one of: ${VALID_SIDEBAR_NAMES.join(', ')}`);
  }
}

/**
 * Validate scope type
 * @param {string} scopeType - Scope type to validate
 * @throws {Error} If scope type is invalid
 */
function validateScopeType(scopeType) {
  if (!VALID_SCOPE_TYPES.includes(scopeType)) {
    throw new Error(`Invalid scope type: ${scopeType}. Must be one of: ${VALID_SCOPE_TYPES.join(', ')}`);
  }
}

/**
 * Get sidebar access control setting by scope
 * @param {string} scopeType - Scope type ('global', 'role', 'organization', 'user')
 * @param {string|null} scopeValue - Scope value (role name, org_id, user_id, or NULL for global)
 * @param {string} sidebarName - Sidebar name
 * @returns {Promise<Object|null>} Access control setting or null if not found
 */
export async function getSidebarAccessControl(scopeType, scopeValue, sidebarName) {
  try {
    validateScopeType(scopeType);
    validateSidebarName(sidebarName);

    let sql;
    let params;

    if (scopeType === 'global') {
      sql = `
        SELECT * FROM sidebar_access_control 
        WHERE scope_type = $1 
          AND scope_value IS NULL 
          AND sidebar_name = $2
      `;
      params = [scopeType, sidebarName];
    } else {
      sql = `
        SELECT * FROM sidebar_access_control 
        WHERE scope_type = $1 
          AND scope_value = $2 
          AND sidebar_name = $3
      `;
      params = [scopeType, scopeValue, sidebarName];
    }

    const result = await query(sql, params);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Get all sidebar access control settings with optional filters
 * @param {Object} filters - Filter options
 * @param {string} [filters.scopeType] - Filter by scope type
 * @param {string} [filters.sidebarName] - Filter by sidebar name
 * @param {boolean} [filters.isEnabled] - Filter by enabled status
 * @returns {Promise<Object[]>} Array of access control settings
 */
export async function getAllSidebarAccessControls(filters = {}) {
  try {
    const { scopeType, sidebarName, isEnabled } = filters;

    let sql = 'SELECT * FROM sidebar_access_control WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (scopeType) {
      validateScopeType(scopeType);
      sql += ` AND scope_type = $${paramIndex++}`;
      params.push(scopeType);
    }

    if (sidebarName) {
      validateSidebarName(sidebarName);
      sql += ` AND sidebar_name = $${paramIndex++}`;
      params.push(sidebarName);
    }

    if (typeof isEnabled === 'boolean') {
      sql += ` AND is_enabled = $${paramIndex++}`;
      params.push(isEnabled);
    }

    sql += ' ORDER BY scope_type, sidebar_name, created_at DESC';

    const result = await query(sql, params);
    return result.rows;
  } catch (error) {
    throw error;
  }
}

/**
 * Create or update sidebar access control setting
 * @param {Object} data - Access control data
 * @param {string} data.scopeType - Scope type ('global', 'role', 'organization', 'user')
 * @param {string|null} data.scopeValue - Scope value (role name, org_id, user_id, or NULL for global)
 * @param {string} data.sidebarName - Sidebar name
 * @param {boolean} data.isEnabled - Whether sidebar is enabled
 * @param {string} data.created_by - User ID who created/updated this
 * @returns {Promise<Object>} Created or updated access control setting
 */
export async function upsertSidebarAccessControl(data) {
  try {
    const {
      scopeType,
      scopeValue = null,
      sidebarName,
      isEnabled = true,
      created_by,
    } = data;

    validateScopeType(scopeType);
    validateSidebarName(sidebarName);

    // Validate scope_value based on scope_type
    if (scopeType === 'global' && scopeValue !== null) {
      throw new Error('scope_value must be NULL for global scope type');
    }
    if (scopeType !== 'global' && !scopeValue) {
      throw new Error(`scope_value is required for scope type: ${scopeType}`);
    }

    const result = await query(
      `INSERT INTO sidebar_access_control (
        scope_type, scope_value, sidebar_name, is_enabled, created_by
      ) VALUES (
        $1, $2, $3, $4, $5
      )
      ON CONFLICT (scope_type, scope_value, sidebar_name)
      DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        scopeType,
        scopeValue,
        sidebarName,
        isEnabled,
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
 * Delete sidebar access control setting
 * @param {string} id - Setting ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteSidebarAccessControl(id) {
  try {
    const result = await query(
      'DELETE FROM sidebar_access_control WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
}

/**
 * Delete sidebar access control setting by scope
 * @param {string} scopeType - Scope type
 * @param {string|null} scopeValue - Scope value
 * @param {string} sidebarName - Sidebar name
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteSidebarAccessControlByScope(scopeType, scopeValue, sidebarName) {
  try {
    validateScopeType(scopeType);
    validateSidebarName(sidebarName);

    let sql;
    let params;

    if (scopeType === 'global') {
      sql = `
        DELETE FROM sidebar_access_control 
        WHERE scope_type = $1 
          AND scope_value IS NULL 
          AND sidebar_name = $2
        RETURNING id
      `;
      params = [scopeType, sidebarName];
    } else {
      sql = `
        DELETE FROM sidebar_access_control 
        WHERE scope_type = $1 
          AND scope_value = $2 
          AND sidebar_name = $3
        RETURNING id
      `;
      params = [scopeType, scopeValue, sidebarName];
    }

    const result = await query(sql, params);
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
}

/**
 * Get effective sidebar access for a user
 * Priority resolution order (highest to lowest):
 * 1. User-specific override
 * 2. Organization-specific
 * 3. Role-specific
 * 4. Global (lowest priority)
 * 
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @param {string|null} orgId - User's organization ID (can be null for superadmin)
 * @param {string} sidebarName - Sidebar name to check
 * @returns {Promise<boolean>} True if sidebar is enabled, false if disabled
 */
export async function getEffectiveSidebarAccess(userId, userRole, orgId, sidebarName) {
  try {
    validateSidebarName(sidebarName);

    // Check in priority order: user > organization > role > global
    const checks = [
      // 1. User-specific (highest priority)
      { scopeType: 'user', scopeValue: userId },
      // 2. Organization-specific
      { scopeType: 'organization', scopeValue: orgId },
      // 3. Role-specific
      { scopeType: 'role', scopeValue: userRole },
      // 4. Global (lowest priority)
      { scopeType: 'global', scopeValue: null },
    ];

    for (const check of checks) {
      // Skip organization check if orgId is null
      if (check.scopeType === 'organization' && !orgId) {
        continue;
      }

      const setting = await getSidebarAccessControl(
        check.scopeType,
        check.scopeValue,
        sidebarName
      );

      if (setting) {
        // Found a setting at this priority level, return its value
        return setting.is_enabled;
      }
    }

    // No setting found at any level - default to enabled (backward compatibility)
    return true;
  } catch (error) {
    console.error('[Sidebar Access Control] Error getting effective access:', error);
    // Default to enabled on error (fail open for backward compatibility)
    return true;
  }
}

/**
 * Check if user can access a sidebar (alias for getEffectiveSidebarAccess)
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @param {string|null} orgId - User's organization ID
 * @param {string} sidebarName - Sidebar name to check
 * @returns {Promise<boolean>} True if user can access sidebar, false otherwise
 */
export async function checkSidebarAccess(userId, userRole, orgId, sidebarName) {
  return getEffectiveSidebarAccess(userId, userRole, orgId, sidebarName);
}

/**
 * Bulk update sidebar access control settings
 * @param {Array<Object>} settings - Array of settings to update
 * @param {string} created_by - User ID who updated this
 * @returns {Promise<Object[]>} Array of updated access control settings
 */
export async function bulkUpdateSidebarAccessControls(settings, created_by) {
  try {
    const client = await getClient();
    const results = [];

    try {
      await client.query('BEGIN');

      for (const setting of settings) {
        const {
          scopeType,
          scopeValue = null,
          sidebarName,
          isEnabled = true,
        } = setting;

        validateScopeType(scopeType);
        validateSidebarName(sidebarName);

        // Validate scope_value based on scope_type
        if (scopeType === 'global' && scopeValue !== null) {
          throw new Error('scope_value must be NULL for global scope type');
        }
        if (scopeType !== 'global' && !scopeValue) {
          throw new Error(`scope_value is required for scope type: ${scopeType}`);
        }

        const result = await client.query(
          `INSERT INTO sidebar_access_control (
            scope_type, scope_value, sidebar_name, is_enabled, created_by
          ) VALUES (
            $1, $2, $3, $4, $5
          )
          ON CONFLICT (scope_type, scope_value, sidebar_name)
          DO UPDATE SET
            is_enabled = EXCLUDED.is_enabled,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *`,
          [
            scopeType,
            scopeValue,
            sidebarName,
            isEnabled,
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
 * Get sidebar access control setting by ID
 * @param {string} id - Setting ID
 * @returns {Promise<Object|null>} Access control setting or null if not found
 */
export async function getSidebarAccessControlById(id) {
  try {
    const result = await query(
      'SELECT * FROM sidebar_access_control WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Update sidebar access control setting by ID
 * @param {string} id - Setting ID
 * @param {Object} data - Update data
 * @param {boolean} [data.isEnabled] - Whether sidebar is enabled
 * @returns {Promise<Object|null>} Updated setting or null if not found
 */
export async function updateSidebarAccessControlById(id, data) {
  try {
    const { isEnabled } = data;

    if (typeof isEnabled !== 'boolean') {
      throw new Error('isEnabled must be a boolean');
    }

    const result = await query(
      `UPDATE sidebar_access_control 
       SET is_enabled = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [isEnabled, id]
    );

    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

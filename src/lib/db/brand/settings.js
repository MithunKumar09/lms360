/**
 * Brand Settings Database Utilities
 * 
 * Provides database functions for brand settings management.
 */

import { query } from '@/lib/db/index.js';

/**
 * Get brand profile ID from user ID
 * 
 * @param {string} userId - Brand user ID
 * @returns {Promise<string|null>} Brand profile ID or null
 */
async function getBrandProfileId(userId) {
  try {
    const profileQuery = `
      SELECT id FROM brand_profiles WHERE user_id = $1 LIMIT 1
    `;
    const result = await query(profileQuery, [userId]);
    return result.rows[0]?.id || null;
  } catch (error) {
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  }
}

/**
 * Get brand settings
 * 
 * @param {string} userId - Brand user ID
 * @returns {Promise<Object|null>} Brand settings or null
 */
export async function getBrandSettings(userId) {
  const brandId = await getBrandProfileId(userId);
  if (!brandId) {
    // Return default settings if brand profile doesn't exist
    return getDefaultSettings();
  }

  try {
    const settingsQuery = `
      SELECT settings
      FROM brand_settings
      WHERE brand_id = $1
      LIMIT 1
    `;
    const result = await query(settingsQuery, [brandId]);
    
    if (result.rows.length === 0) {
      return getDefaultSettings();
    }

    return result.rows[0].settings || getDefaultSettings();
  } catch (error) {
    // If table doesn't exist, return default settings
    if (error.code === '42P01') {
      return getDefaultSettings();
    }
    throw error;
  }
}

/**
 * Get default brand settings
 * 
 * @returns {Object} Default settings
 */
function getDefaultSettings() {
  return {
    notifications: {
      email_on_certificate_issued: true,
      email_on_event_registration: true,
      email_on_event_approval: true,
      email_on_profile_approval: true,
    },
    dashboard: {
      show_statistics: true,
      show_recent_activity: true,
      items_per_page: 20,
    },
    certificates: {
      auto_generate_on_issue: true,
      default_format: 'pdf',
    },
    events: {
      auto_propose_on_create: false,
      default_status: 'draft',
    },
  };
}

/**
 * Update brand settings
 * 
 * @param {string} userId - Brand user ID
 * @param {Object} settings - Settings to update
 * @returns {Promise<Object>} Updated settings
 */
export async function updateBrandSettings(userId, settings) {
  const brandId = await getBrandProfileId(userId);
  if (!brandId) {
    throw new Error('Brand profile not found. Please create a brand profile first.');
  }

  // Get existing settings
  const existingSettings = await getBrandSettings(userId);
  
  // Merge with new settings
  const mergedSettings = {
    ...existingSettings,
    ...settings,
    notifications: {
      ...existingSettings.notifications,
      ...(settings.notifications || {}),
    },
    dashboard: {
      ...existingSettings.dashboard,
      ...(settings.dashboard || {}),
    },
    certificates: {
      ...existingSettings.certificates,
      ...(settings.certificates || {}),
    },
    events: {
      ...existingSettings.events,
      ...(settings.events || {}),
    },
  };

  try {
    // Check if settings record exists
    const checkQuery = `
      SELECT id FROM brand_settings WHERE brand_id = $1
    `;
    const checkResult = await query(checkQuery, [brandId]);

    if (checkResult.rows.length === 0) {
      // Insert new settings
      const insertQuery = `
        INSERT INTO brand_settings (brand_id, settings)
        VALUES ($1, $2)
        RETURNING *
      `;
      const insertResult = await query(insertQuery, [brandId, JSON.stringify(mergedSettings)]);
      return insertResult.rows[0].settings;
    } else {
      // Update existing settings
      const updateQuery = `
        UPDATE brand_settings
        SET settings = $1, updated_at = CURRENT_TIMESTAMP
        WHERE brand_id = $2
        RETURNING *
      `;
      const updateResult = await query(updateQuery, [JSON.stringify(mergedSettings), brandId]);
      return updateResult.rows[0].settings;
    }
  } catch (error) {
    // If table doesn't exist, throw error
    if (error.code === '42P01') {
      throw new Error('Brand settings table does not exist. Please run database migration.');
    }
    throw error;
  }
}

/**
 * Organization Brand Assets Database Utilities
 * 
 * Provides CRUD operations for organization_brand_assets table.
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/organizationBrandAssets
 */

import { query, getClient } from './index.js';

/**
 * Create a new brand asset
 * @param {Object} data - Brand asset data
 * @param {string} data.org_id - Organization UUID
 * @param {string} data.key_name - Asset key (header_logo, square_icon, splash_image, loading_mark)
 * @param {string} data.url - Asset URL
 * @param {string} [data.variant] - Variant (light, dark, default)
 * @param {number} [data.width] - Image width in pixels
 * @param {number} [data.height] - Image height in pixels
 * @param {string} [data.format] - Image format (png, jpeg, svg, webp)
 * @param {number} [data.bytes] - File size in bytes
 * @param {string} [data.checksum] - MD5 or SHA256 checksum
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object>} Created brand asset object
 */
export async function createBrandAsset(data, client = null) {
  const {
    org_id,
    key_name,
    url,
    variant = 'default',
    width,
    height,
    format,
    bytes,
    checksum,
  } = data;

  const queryText = `
    INSERT INTO organization_brand_assets (
      org_id, key_name, url, variant,
      width, height, format, bytes, checksum
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const params = [
    org_id,
    key_name,
    url,
    variant,
    width || null,
    height || null,
    format || null,
    bytes || null,
    checksum || null,
  ];

  try {
    if (client) {
      // Use provided client for transaction
      const result = await client.query(queryText, params);
      return result.rows[0];
    } else {
      // Use regular query
      const result = await query(queryText, params);
      return result.rows[0];
    }
  } catch (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      throw new Error('Brand asset with this key and variant already exists for this organization');
    }
    // Handle check constraint violations
    if (error.code === '23514') {
      throw new Error(`Invalid brand asset data: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get all brand assets for an organization
 * @param {string} orgId - Organization UUID
 * @returns {Promise<Object[]>} Array of brand asset objects
 */
export async function getBrandAssetsByOrgId(orgId) {
  try {
    const result = await query(
      'SELECT * FROM organization_brand_assets WHERE org_id = $1 ORDER BY key_name, variant',
      [orgId]
    );
    return result.rows;
  } catch (error) {
    throw error;
  }
}

/**
 * Get specific brand asset by key name
 * @param {string} orgId - Organization UUID
 * @param {string} keyName - Asset key name
 * @param {string} [variant='default'] - Asset variant
 * @returns {Promise<Object|null>} Brand asset object or null if not found
 */
export async function getBrandAssetByKey(orgId, keyName, variant = 'default') {
  try {
    const result = await query(
      'SELECT * FROM organization_brand_assets WHERE org_id = $1 AND key_name = $2 AND variant = $3',
      [orgId, keyName, variant]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Update brand asset
 * @param {string} id - Brand asset UUID
 * @param {Object} data - Fields to update (partial object)
 * @returns {Promise<Object|null>} Updated brand asset object or null if not found
 */
export async function updateBrandAsset(id, data) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query
    Object.keys(data).forEach((key) => {
      // Skip undefined values
      if (data[key] !== undefined && key !== 'id' && key !== 'org_id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      // No fields to update, return current asset
      const result = await query(
        'SELECT * FROM organization_brand_assets WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    }

    // Add id as last parameter
    values.push(id);

    const result = await query(
      `UPDATE organization_brand_assets 
       SET ${fields.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      throw new Error('Brand asset with this key and variant already exists for this organization');
    }
    // Handle check constraint violations
    if (error.code === '23514') {
      throw new Error(`Invalid brand asset data: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Delete brand asset
 * @param {string} id - Brand asset UUID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteBrandAsset(id) {
  try {
    const result = await query(
      'DELETE FROM organization_brand_assets WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
}

/**
 * Delete all brand assets for an organization
 * @param {string} orgId - Organization UUID
 * @returns {Promise<number>} Number of deleted assets
 */
export async function deleteBrandAssetsByOrgId(orgId) {
  try {
    const result = await query(
      'DELETE FROM organization_brand_assets WHERE org_id = $1 RETURNING id',
      [orgId]
    );
    return result.rows.length;
  } catch (error) {
    throw error;
  }
}

/**
 * Upsert multiple brand assets for an organization
 * This will create new assets or update existing ones based on org_id, key_name, and variant
 * @param {string} orgId - Organization UUID
 * @param {Array} assets - Array of brand asset objects
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object[]>} Array of upserted brand asset objects
 */
export async function upsertBrandAssets(orgId, assets = [], client = null) {
  const upsertedAssets = [];
  
  const queryExecutor = client || query.bind(null);

  try {
    for (const asset of assets) {
      const {
        key_name,
        url,
        variant = 'default',
        width,
        height,
        format,
        bytes,
        checksum,
      } = asset;

      // Check if asset exists
      const existing = await getBrandAssetByKey(orgId, key_name, variant);

      if (existing) {
        // Update existing asset
        const updated = await updateBrandAsset(existing.id, {
          url,
          width,
          height,
          format,
          bytes,
          checksum,
        });
        upsertedAssets.push(updated);
      } else {
        // Create new asset
        const created = await createBrandAsset({
          org_id: orgId,
          key_name,
          url,
          variant,
          width,
          height,
          format,
          bytes,
          checksum,
        }, client);
        upsertedAssets.push(created);
      }
    }

    return upsertedAssets;
  } catch (error) {
    throw error;
  }
}


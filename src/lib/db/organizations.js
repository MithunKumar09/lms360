/**
 * Organizations Database Utilities
 * 
 * Provides CRUD operations and query helpers for organizations table.
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/organizations
 */

import { query, getClient } from './index.js';

/**
 * Create a new organization
 * @param {Object} data - Organization data
 * @param {string} data.name - Organization name (3-120 chars)
 * @param {string} data.slug - URL-friendly slug (3-120 chars, lowercase, a-z0-9-)
 * @param {string} data.org_type - Organization type (college, university, institute, department, training_center)
 * @param {string} [data.display_name] - Display name
 * @param {string} data.org_code - Organization code (2-8 chars, A-Z0-9)
 * @param {string} data.country - Country
 * @param {string} data.state - State/Province
 * @param {string} data.city - City
 * @param {string} data.timezone - IANA timezone (e.g., Asia/Kolkata)
 * @param {string} data.default_locale - Locale (e.g., en-IN)
 * @param {string} data.currency - ISO-4217 currency code (e.g., INR)
 * @param {number} data.academic_year_start_month - Academic year start month (1-12)
 * @param {string[]} data.academic_levels - Academic levels array
 * @param {string} data.primary_admin_name - Primary admin name
 * @param {string} data.primary_admin_email - Primary admin email
 * @param {string} [data.contact_email] - Contact email
 * @param {string} [data.contact_phone] - Contact phone
 * @param {string} [data.website_url] - Website URL
 * @param {string} [data.status] - Status (default: 'active')
 * @returns {Promise<Object>} Created organization object
 */
export async function createOrganization(data) {
  try {
    const {
      name,
      slug,
      org_type,
      display_name,
      org_code,
      country,
      state,
      city,
      timezone,
      default_locale,
      currency,
      academic_year_start_month,
      academic_levels,
      primary_admin_name,
      primary_admin_email,
      contact_email,
      contact_phone,
      website_url,
      status = 'active',
    } = data;

    const result = await query(
      `INSERT INTO organizations (
        name, slug, org_type, display_name, org_code,
        country, state, city,
        timezone, default_locale, currency, academic_year_start_month,
        academic_levels,
        primary_admin_name, primary_admin_email,
        contact_email, contact_phone, website_url,
        status
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12,
        $13,
        $14, $15,
        $16, $17, $18,
        $19
      ) RETURNING *`,
      [
        name,
        slug,
        org_type,
        display_name || null,
        org_code,
        country,
        state,
        city,
        timezone,
        default_locale,
        currency,
        academic_year_start_month,
        academic_levels || null,
        primary_admin_name,
        primary_admin_email,
        contact_email || null,
        contact_phone || null,
        website_url || null,
        status,
      ]
    );

    return result.rows[0];
  } catch (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.constraint?.includes('slug')) {
        throw new Error('Organization with this slug already exists');
      }
      if (error.constraint?.includes('code')) {
        throw new Error('Organization with this code already exists');
      }
      throw new Error('Organization with this identifier already exists');
    }
    // Handle check constraint violations
    if (error.code === '23514') {
      throw new Error(`Invalid organization data: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get organization by ID
 * @param {string} id - Organization UUID
 * @returns {Promise<Object|null>} Organization object or null if not found
 */
export async function getOrganizationById(id) {
  try {
    const result = await query(
      'SELECT * FROM organizations WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Get organization by slug (case-insensitive)
 * @param {string} slug - Organization slug
 * @returns {Promise<Object|null>} Organization object or null if not found
 */
export async function getOrganizationBySlug(slug) {
  try {
    const result = await query(
      'SELECT * FROM organizations WHERE LOWER(slug) = LOWER($1)',
      [slug]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Get organization by code (case-insensitive)
 * @param {string} code - Organization code
 * @returns {Promise<Object|null>} Organization object or null if not found
 */
export async function getOrganizationByCode(code) {
  try {
    const result = await query(
      'SELECT * FROM organizations WHERE LOWER(org_code) = LOWER($1)',
      [code]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Update organization
 * @param {string} id - Organization UUID
 * @param {Object} data - Fields to update (partial object)
 * @returns {Promise<Object|null>} Updated organization object or null if not found
 */
export async function updateOrganization(id, data) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query
    Object.keys(data).forEach((key) => {
      // Skip undefined values
      if (data[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      // No fields to update, return current organization
      return await getOrganizationById(id);
    }

    // Add updated_at manually (though trigger handles it)
    // Add id as last parameter
    values.push(id);

    const result = await query(
      `UPDATE organizations 
       SET ${fields.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.constraint?.includes('slug')) {
        throw new Error('Organization with this slug already exists');
      }
      if (error.constraint?.includes('code')) {
        throw new Error('Organization with this code already exists');
      }
      throw new Error('Organization with this identifier already exists');
    }
    // Handle check constraint violations
    if (error.code === '23514') {
      throw new Error(`Invalid organization data: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Delete organization (soft delete - sets status to 'inactive')
 * @param {string} id - Organization UUID
 * @param {boolean} [hardDelete=false] - If true, hard delete instead of soft delete
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteOrganization(id, hardDelete = false) {
  try {
    if (hardDelete) {
      const result = await query(
        'DELETE FROM organizations WHERE id = $1 RETURNING id',
        [id]
      );
      return result.rows.length > 0;
    } else {
      // Soft delete: set status to 'inactive'
      const result = await query(
        "UPDATE organizations SET status = 'inactive' WHERE id = $1 RETURNING id",
        [id]
      );
      return result.rows.length > 0;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Check if slug exists (for validation)
 * @param {string} slug - Slug to check
 * @param {string} [excludeId] - Organization ID to exclude from check (for updates)
 * @returns {Promise<boolean>} True if slug exists, false otherwise
 */
export async function checkSlugExists(slug, excludeId = null) {
  try {
    let queryText = 'SELECT id FROM organizations WHERE LOWER(slug) = LOWER($1)';
    const params = [slug];

    if (excludeId) {
      queryText += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await query(queryText, params);
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
}

/**
 * Check if code exists (for validation)
 * @param {string} code - Code to check
 * @param {string} [excludeId] - Organization ID to exclude from check (for updates)
 * @returns {Promise<boolean>} True if code exists, false otherwise
 */
export async function checkCodeExists(code, excludeId = null) {
  try {
    let queryText = 'SELECT id FROM organizations WHERE LOWER(org_code) = LOWER($1)';
    const params = [code];

    if (excludeId) {
      queryText += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await query(queryText, params);
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
}

/**
 * Check if subdomain already exists
 *
 * @param {string} subdomain
 * @param {string|null} excludeId
 * @returns {Promise<boolean>}
 */
export async function checkSubdomainExists(subdomain, excludeId = null) {
  const client = await getClient();

  try {
    let query = `
      SELECT EXISTS(
        SELECT 1
        FROM organizations
        WHERE LOWER(subdomain) = LOWER($1)
          AND deleted_at IS NULL
    `;

    const params = [subdomain];

    if (excludeId) {
      query += ` AND id != $2`;
      params.push(excludeId);
    }

    query += `) AS exists`;

    const result = await client.query(query, params);

    return result.rows[0]?.exists || false;
  } finally {
    client.release();
  }
}

/**
 * List organizations with filters, pagination, and search
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.search] - Full-text search query
 * @param {string} [filters.status] - Filter by status (active, inactive, suspended)
 * @param {string} [filters.org_type] - Filter by organization type
 * @param {string} [filters.country] - Filter by country
 * @param {string} [filters.state] - Filter by state
 * @param {string} [filters.city] - Filter by city
 * @param {number} [filters.page=1] - Page number (1-based)
 * @param {number} [filters.limit=20] - Items per page
 * @param {string} [filters.sort='created_at'] - Sort field
 * @param {string} [filters.order='DESC'] - Sort order (ASC or DESC)
 * @returns {Promise<Object>} Object with organizations array and pagination info
 */
export async function listOrganizations(filters = {}) {
  try {
    const {
      search,
      status,
      org_type,
      country,
      state,
      city,
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'DESC',
    } = filters;

    // Build WHERE clause
    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    // Full-text search
    if (search) {
      whereConditions.push(`search_tsv @@ plainto_tsquery('english', $${paramIndex})`);
      params.push(search);
      paramIndex++;
    }

    // Status filter
    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Organization type filter
    if (org_type) {
      whereConditions.push(`org_type = $${paramIndex}`);
      params.push(org_type);
      paramIndex++;
    }

    // Location filters
    if (country) {
      whereConditions.push(`country = $${paramIndex}`);
      params.push(country);
      paramIndex++;
    }

    if (state) {
      whereConditions.push(`state = $${paramIndex}`);
      params.push(state);
      paramIndex++;
    }

    if (city) {
      whereConditions.push(`city = $${paramIndex}`);
      params.push(city);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Validate sort field (prevent SQL injection)
    const allowedSortFields = ['created_at', 'updated_at', 'name', 'status', 'org_type'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count total matching records
    const countResult = await query(
      `SELECT COUNT(*) as total FROM organizations ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Fetch paginated results
    const result = await query(
      `SELECT * FROM organizations 
       ${whereClause} 
       ORDER BY ${sortField} ${sortOrder} 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      organizations: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Full-text search organizations using search_tsv
 * @param {string} searchQuery - Search query string
 * @param {Object} [options] - Search options
 * @param {number} [options.limit=20] - Maximum results to return
 * @param {string} [options.status] - Filter by status
 * @returns {Promise<Object[]>} Array of matching organizations
 */
export async function searchOrganizations(searchQuery, options = {}) {
  try {
    const { limit = 20, status } = options;

    let queryText = `
      SELECT *, ts_rank(search_tsv, plainto_tsquery('english', $1)) as rank
      FROM organizations
      WHERE search_tsv @@ plainto_tsquery('english', $1)
    `;
    const params = [searchQuery];

    if (status) {
      queryText += ' AND status = $2';
      params.push(status);
      queryText += ` ORDER BY rank DESC, created_at DESC LIMIT $3`;
      params.push(limit);
    } else {
      queryText += ` ORDER BY rank DESC, created_at DESC LIMIT $2`;
      params.push(limit);
    }

    const result = await query(queryText, params);
    return result.rows;
  } catch (error) {
    throw error;
  }
}

/**
 * Create organization with brand assets in a transaction
 * Note: This function uses a client transaction. Brand assets are created separately.
 * @param {Object} data - Organization data
 * @param {Array} [brandAssets] - Array of brand asset objects
 * @returns {Promise<Object>} Created organization with brand assets
 */
export async function createOrganizationWithAssets(data, brandAssets = []) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Create organization using client directly for transaction
    const {
      name,
      slug,
      org_type,
      display_name,
      org_code,
      country,
      state,
      city,
      timezone,
      default_locale,
      currency,
      academic_year_start_month,
      academic_levels,
      primary_admin_name,
      primary_admin_email,
      contact_email,
      contact_phone,
      website_url,
      status = 'active',
    } = data;

    const orgResult = await client.query(
      `INSERT INTO organizations (
        name, slug, org_type, display_name, org_code,
        country, state, city,
        timezone, default_locale, currency, academic_year_start_month,
        academic_levels,
        primary_admin_name, primary_admin_email,
        contact_email, contact_phone, website_url,
        status
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12,
        $13,
        $14, $15,
        $16, $17, $18,
        $19
      ) RETURNING *`,
      [
        name,
        slug,
        org_type,
        display_name || null,
        org_code,
        country,
        state,
        city,
        timezone,
        default_locale,
        currency,
        academic_year_start_month,
        academic_levels || null,
        primary_admin_name,
        primary_admin_email,
        contact_email || null,
        contact_phone || null,
        website_url || null,
        status,
      ]
    );

    const org = orgResult.rows[0];

    // Create brand assets if provided (will be handled separately via organizationBrandAssets module)
    // This is kept here for future transaction support when brand assets module is updated

    await client.query('COMMIT');

    return org;
  } catch (error) {
    await client.query('ROLLBACK');
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.constraint?.includes('slug')) {
        throw new Error('Organization with this slug already exists');
      }
      if (error.constraint?.includes('code')) {
        throw new Error('Organization with this code already exists');
      }
      throw new Error('Organization with this identifier already exists');
    }
    // Handle check constraint violations
    if (error.code === '23514') {
      throw new Error(`Invalid organization data: ${error.message}`);
    }
    
    throw error;
  } finally {
    client.release();
  }
}


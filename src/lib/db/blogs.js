/**
 * Blogs DB Utilities
 * 
 * CRUD + list/search with parameterized queries and transactions.
 * Supports multi-scope blogs (global, organization, personal).
 */

import { query, getClient } from './index.js';
import { slugify } from '../utils/slugify.js';

/**
 * Generate unique slug from title
 * @param {string} title - Blog title
 * @param {string} excludeId - Blog ID to exclude from uniqueness check (for updates)
 * @returns {Promise<string>} Unique slug
 */
async function generateUniqueSlug(title, excludeId = null) {
  if (!title) {
    throw new Error('Title is required to generate slug');
  }

  let baseSlug = slugify(title);
  if (!baseSlug) {
    throw new Error('Could not generate slug from title');
  }

  let slug = baseSlug;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const checkQuery = excludeId
      ? 'SELECT id FROM blogs WHERE slug = $1 AND id != $2 LIMIT 1'
      : 'SELECT id FROM blogs WHERE slug = $1 LIMIT 1';
    const params = excludeId ? [slug, excludeId] : [slug];
    
    const result = await query(checkQuery, params);
    
    if (result.rows.length === 0) {
      return slug; // Found unique slug
    }

    // Append number to make it unique
    attempts++;
    slug = `${baseSlug}-${attempts}`;
  }

  // If couldn't find unique slug, append timestamp
  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
}

/**
 * List blogs with filtering and pagination
 * @param {Object} filters - Filter options
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Object>} List of blogs with pagination
 */
export async function listBlogs(filters = {}, pagination = {}) {
  const {
    scope = null,
    org_id = null,
    author_id = null,
    status = null,
    search = null,
  } = filters;

  const {
    page = 1,
    limit = 10,
    sortBy = 'created_at',
    sortDir = 'desc',
  } = pagination;

  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];
  let paramIdx = 1;

  // Build WHERE conditions (prefix with b. to avoid ambiguity with joined users table)
  const countConditions = [];
  const countParams = [];
  let countParamIdx = 1;

  if (scope) {
    conditions.push(`b.scope = $${paramIdx++}`);
    countConditions.push(`scope = $${countParamIdx++}`);
    params.push(scope);
    countParams.push(scope);
  }

  if (org_id !== null && org_id !== undefined) {
    conditions.push(`b.org_id = $${paramIdx++}`);
    countConditions.push(`org_id = $${countParamIdx++}`);
    params.push(org_id);
    countParams.push(org_id);
  }

  if (author_id) {
    conditions.push(`b.author_id = $${paramIdx++}`);
    countConditions.push(`author_id = $${countParamIdx++}`);
    params.push(author_id);
    countParams.push(author_id);
  }

  if (status) {
    conditions.push(`b.status = $${paramIdx++}`);
    countConditions.push(`status = $${countParamIdx++}`);
    params.push(status);
    countParams.push(status);
  }

  // Full-text search
  if (search) {
    conditions.push(`to_tsvector('english', coalesce(b.title, '') || ' ' || coalesce(b.excerpt, '') || ' ' || coalesce(b.content, '')) @@ plainto_tsquery('english', $${paramIdx++})`);
    countConditions.push(`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '')) @@ plainto_tsquery('english', $${countParamIdx++})`);
    params.push(search);
    countParams.push(search);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countWhereClause = countConditions.length > 0 ? `WHERE ${countConditions.join(' AND ')}` : '';

  // Validate sortBy and sortDir
  const validSortColumns = ['created_at', 'updated_at', 'published_at', 'title'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const sortDirection = sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Get total count (no table prefix needed since we're only querying blogs table)
  const countQuery = `SELECT COUNT(*) as total FROM blogs ${countWhereClause}`;
  const countResult = await query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].total, 10);

  // Get blogs with author information
  const blogsQuery = `
    SELECT 
      b.*,
      json_build_object(
        'id', u.id,
        'name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email),
        'email', u.email,
        'avatar_url', u.avatar_url
      ) as author
    FROM blogs b
    LEFT JOIN users u ON b.author_id = u.id
    ${whereClause}
    ORDER BY b.${sortColumn} ${sortDirection}
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;
  params.push(limit, offset);

  const blogsResult = await query(blogsQuery, params);
  const blogs = blogsResult.rows;

  return {
    success: true,
    blogs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get single blog by ID
 * @param {string} id - Blog ID
 * @returns {Promise<Object>} Blog object
 */
export async function getBlogById(id) {
  const result = await query(
    `SELECT 
      b.*,
      json_build_object(
        'id', u.id,
        'name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email),
        'email', u.email,
        'avatar_url', u.avatar_url
      ) as author
    FROM blogs b
    LEFT JOIN users u ON b.author_id = u.id
    WHERE b.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Blog not found' };
  }

  return { success: true, blog: result.rows[0] };
}

/**
 * Get blog by slug
 * @param {string} slug - Blog slug
 * @returns {Promise<Object>} Blog object
 */
export async function getBlogBySlug(slug) {
  const result = await query(
    `SELECT 
      b.*,
      json_build_object(
        'id', u.id,
        'name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email),
        'email', u.email,
        'avatar_url', u.avatar_url
      ) as author
    FROM blogs b
    LEFT JOIN users u ON b.author_id = u.id
    WHERE b.slug = $1`,
    [slug]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Blog not found' };
  }

  return { success: true, blog: result.rows[0] };
}

/**
 * Create blog
 * @param {Object} data - Blog data
 * @returns {Promise<Object>} Created blog
 */
export async function createBlog(data) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Generate unique slug
    const slug = data.slug || await generateUniqueSlug(data.title);

    // Determine scope and org_id based on author role
    let scope = data.scope;
    let org_id = data.org_id ?? null;

    // Set published_at if status is published
    const published_at = data.status === 'published' ? new Date() : null;

    const insertResult = await client.query(
      `INSERT INTO blogs (
        title, slug, content, excerpt, featured_image_url,
        author_id, org_id, scope, status, published_at, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
      RETURNING *`,
      [
        data.title,
        slug,
        data.content,
        data.excerpt || null,
        data.featured_image_url || null,
        data.author_id,
        org_id,
        scope,
        data.status || 'draft',
        published_at,
        JSON.stringify(data.metadata || {}),
      ]
    );

    const blog = insertResult.rows[0];

    // Fetch with author information
    const fullResult = await client.query(
      `SELECT 
        b.*,
        json_build_object(
          'id', u.id,
          'name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email),
          'email', u.email,
          'avatar_url', u.avatar_url
        ) as author
      FROM blogs b
      LEFT JOIN users u ON b.author_id = u.id
      WHERE b.id = $1`,
      [blog.id]
    );

    await client.query('COMMIT');
    return { success: true, blog: fullResult.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DB] Error creating blog:', error);
    return { success: false, error: error.message || 'Failed to create blog' };
  } finally {
    client.release();
  }
}

/**
 * Update blog
 * @param {string} id - Blog ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated blog
 */
export async function updateBlog(id, data) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get existing blog
    const existingResult = await client.query('SELECT * FROM blogs WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Blog not found' };
    }

    const existing = existingResult.rows[0];

    // Generate new slug if title changed
    let slug = existing.slug;
    if (data.title && data.title !== existing.title) {
      slug = data.slug || await generateUniqueSlug(data.title, id);
    }

    // Build dynamic update
    const fields = [];
    const params = [];
    let paramIdx = 1;

    const setField = (col, val) => {
      if (val !== undefined) {
        fields.push(`${col} = $${paramIdx++}`);
        params.push(val);
      }
    };

    setField('title', data.title);
    setField('slug', slug);
    setField('content', data.content);
    setField('excerpt', data.excerpt);
    setField('featured_image_url', data.featured_image_url);
    setField('scope', data.scope);
    setField('org_id', data.org_id);
    setField('metadata', data.metadata ? JSON.stringify(data.metadata) : undefined);

    // Handle status and published_at
    if (data.status !== undefined) {
      setField('status', data.status);
      
      // Auto-set published_at when status changes to published
      if (data.status === 'published' && existing.status !== 'published') {
        setField('published_at', new Date());
      } else if (data.status !== 'published' && existing.status === 'published') {
        setField('published_at', null);
      }
    }

    if (fields.length === 0) {
      await client.query('COMMIT');
      // Return existing blog with author
      const fullResult = await client.query(
        `SELECT 
          b.*,
          json_build_object(
            'id', u.id,
            'name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email),
            'email', u.email,
            'avatar_url', u.avatar_url
          ) as author
        FROM blogs b
        LEFT JOIN users u ON b.author_id = u.id
        WHERE b.id = $1`,
        [id]
      );
      return { success: true, blog: fullResult.rows[0] };
    }

    params.push(id);
    await client.query(
      `UPDATE blogs SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIdx}`,
      params
    );

    // Fetch updated blog with author
    const fullResult = await client.query(
      `SELECT 
        b.*,
        json_build_object(
          'id', u.id,
          'name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email),
          'email', u.email,
          'avatar_url', u.avatar_url
        ) as author
      FROM blogs b
      LEFT JOIN users u ON b.author_id = u.id
      WHERE b.id = $1`,
      [id]
    );

    await client.query('COMMIT');
    return { success: true, blog: fullResult.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DB] Error updating blog:', error);
    return { success: false, error: error.message || 'Failed to update blog' };
  } finally {
    client.release();
  }
}

/**
 * Delete blog
 * @param {string} id - Blog ID
 * @returns {Promise<Object>} Success status
 */
export async function deleteBlog(id) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Check if blog exists
    const existingResult = await client.query('SELECT id FROM blogs WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Blog not found' };
    }

    // Delete blog (cascade will handle blog_media if using separate table)
    await client.query('DELETE FROM blogs WHERE id = $1', [id]);

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DB] Error deleting blog:', error);
    return { success: false, error: error.message || 'Failed to delete blog' };
  } finally {
    client.release();
  }
}

/**
 * Get blogs for home page (global published blogs only)
 * @param {number} limit - Number of blogs to return
 * @returns {Promise<Array>} Array of blog objects
 */
export async function getHomeBlogs(limit = 3) {
  const result = await query(
    `SELECT 
      b.*,
      json_build_object(
        'id', u.id,
        'name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email),
        'email', u.email,
        'avatar_url', u.avatar_url
      ) as author
    FROM blogs b
    LEFT JOIN users u ON b.author_id = u.id
    WHERE b.scope = 'global' AND b.status = 'published'
    ORDER BY b.published_at DESC, b.created_at DESC
    LIMIT $1`,
    [limit]
  );

  return result.rows;
}

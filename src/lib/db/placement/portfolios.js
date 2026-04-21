/**
 * Portfolios Database Utilities
 * 
 * Provides CRUD operations for student portfolios.
 * 
 * @module db/placement/portfolios
 */

import { query, getClient } from '../index.js';
import crypto from 'crypto';

/**
 * Generate unique portfolio slug
 * @param {string} userId - User UUID
 * @param {string} baseSlug - Base slug (optional)
 * @returns {Promise<string>} Unique slug
 */
async function generateUniqueSlug(userId, baseSlug = null) {
  let slug = baseSlug || `portfolio-${crypto.randomBytes(4).toString('hex')}`;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const existing = await query(
      `SELECT id FROM portfolios WHERE portfolio_slug = $1`,
      [slug]
    );
    
    if (existing.rows.length === 0) {
      return slug;
    }
    
    slug = `${baseSlug || 'portfolio'}-${crypto.randomBytes(4).toString('hex')}`;
    attempts++;
  }
  
  // Fallback to UUID-based slug
  return `portfolio-${userId.substring(0, 8)}-${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Get active portfolio for a user
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} Portfolio object or null
 */
export async function getPortfolio(userId) {
  const result = await query(
    `SELECT * FROM portfolios 
    WHERE user_id = $1 AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapPortfolioRow(result.rows[0]);
}

/**
 * Get portfolio by slug (public access)
 * @param {string} slug - Portfolio slug
 * @returns {Promise<Object|null>} Portfolio object or null
 */
export async function getPortfolioBySlug(slug) {
  const result = await query(
    `SELECT 
      p.*,
      u.first_name, u.last_name, u.email, u.avatar_url
    FROM portfolios p
    INNER JOIN users u ON p.user_id = u.id
    WHERE p.portfolio_slug = $1 AND p.is_public = true AND p.is_active = true`,
    [slug]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const portfolio = mapPortfolioRow(result.rows[0]);
  portfolio.user = {
    firstName: result.rows[0].first_name,
    lastName: result.rows[0].last_name,
    email: result.rows[0].email,
    avatarUrl: result.rows[0].avatar_url
  };
  
  // Increment view count
  await query(
    `UPDATE portfolios 
    SET view_count = view_count + 1, 
        last_viewed_at = CURRENT_TIMESTAMP
    WHERE id = $1`,
    [portfolio.id]
  );
  
  return portfolio;
}

/**
 * Create or update portfolio
 * @param {string} userId - User UUID
 * @param {Object} portfolioData - Portfolio data
 * @param {Object} portfolioData.portfolioData - Structured portfolio data (JSONB)
 * @param {boolean} portfolioData.isPublic - Is public
 * @param {string} portfolioData.slug - Custom slug (optional)
 * @returns {Promise<Object>} Portfolio object
 */
export async function upsertPortfolio(userId, portfolioData) {
  const { portfolioData: data, isPublic = false, slug } = portfolioData;
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Deactivate existing active portfolio
    await client.query(
      `UPDATE portfolios SET is_active = false WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
    
    // Generate unique slug
    const uniqueSlug = slug ? await generateUniqueSlug(userId, slug) : await generateUniqueSlug(userId);
    
    // Create new portfolio
    const result = await client.query(
      `INSERT INTO portfolios (
        user_id, portfolio_slug, portfolio_data,
        is_public, is_active
      ) VALUES ($1, $2, $3, $4, true)
      RETURNING *`,
      [
        userId,
        uniqueSlug,
        JSON.stringify(data),
        isPublic
      ]
    );
    
    await client.query('COMMIT');
    
    return mapPortfolioRow(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update portfolio
 * @param {string} portfolioId - Portfolio UUID
 * @param {string} userId - User UUID (for authorization)
 * @param {Object} updates - Fields to update
 * @param {Object} updates.portfolioData - Updated portfolio data
 * @param {boolean} updates.isPublic - Is public
 * @param {string} updates.slug - New slug
 * @returns {Promise<Object>} Updated portfolio object
 */
export async function updatePortfolio(portfolioId, userId, updates) {
  const { portfolioData: data, isPublic, slug } = updates;
  
  const updateFields = [];
  const params = [];
  let paramIndex = 1;
  
  if (data) {
    updateFields.push(`portfolio_data = $${paramIndex}`);
    params.push(JSON.stringify(data));
    paramIndex++;
  }
  
  if (isPublic !== undefined) {
    updateFields.push(`is_public = $${paramIndex}`);
    params.push(isPublic);
    paramIndex++;
  }
  
  if (slug) {
    // Check if slug is unique
    const uniqueSlug = await generateUniqueSlug(userId, slug);
    updateFields.push(`portfolio_slug = $${paramIndex}`);
    params.push(uniqueSlug);
    paramIndex++;
  }
  
  if (updateFields.length === 0) {
    throw new Error('No fields to update');
  }
  
  params.push(portfolioId, userId);
  const result = await query(
    `UPDATE portfolios 
    SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
    RETURNING *`,
    params
  );
  
  if (result.rows.length === 0) {
    throw new Error('Portfolio not found or unauthorized');
  }
  
  return mapPortfolioRow(result.rows[0]);
}

/**
 * Auto-generate portfolio from user data
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Generated portfolio object
 */
export async function generatePortfolio(userId) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Get user profile
    const userResult = await query(
      `SELECT 
        id, first_name, last_name, email, phone, bio,
        skill, avatar_url
      FROM users
      WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = userResult.rows[0];
    
    // Get completed courses
    const coursesResult = await query(
      `SELECT 
        c.id, c.title, c.description, c.cover_image_url,
        ce.completed_at, ce.progress_percentage
      FROM course_enrollments ce
      INNER JOIN courses c ON ce.course_id = c.id
      WHERE ce.user_id = $1 AND ce.enrollment_status = 'completed'
      ORDER BY ce.completed_at DESC
      LIMIT 20`,
      [userId]
    );
    
    // Get completed assignments/projects
    const assignmentsResult = await query(
      `SELECT 
        ca.id, ca.title, ca.description,
        as.submitted_at, as.status
      FROM assignment_submissions as
      INNER JOIN course_assignments ca ON as.assignment_id = ca.id
      WHERE as.user_id = $1 AND as.status IN ('submitted', 'graded')
      ORDER BY as.submitted_at DESC
      LIMIT 15`,
      [userId]
    ).catch(() => ({ rows: [] }));
    
    // Get certificates (join with courses table to get title)
    const certificatesResult = await query(
      `SELECT 
        cert.id, 
        c.title, 
        cert.issued_at, 
        cert.certificate_url,
        'Course Completion' as issuer
      FROM certificates cert
      INNER JOIN courses c ON cert.course_id = c.id
      WHERE cert.user_id = $1
      ORDER BY cert.issued_at DESC`,
      [userId]
    ).catch(() => ({ rows: [] }));
    
    // Build portfolio data structure
    const portfolioData = {
      about: {
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        email: user.email || '',
        bio: user.bio || '',
        avatarUrl: user.avatar_url || null
      },
      skills: user.skill ? [user.skill] : [],
      projects: assignmentsResult.rows.map(assignment => ({
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        completedAt: assignment.submitted_at,
        status: assignment.status
      })),
      courses: coursesResult.rows.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        coverImageUrl: course.cover_image_url,
        completedAt: course.completed_at,
        progress: parseFloat(course.progress_percentage)
      })),
      certificates: certificatesResult.rows.map(cert => ({
        id: cert.id,
        title: cert.title,
        issuedAt: cert.issued_at,
        issuer: cert.issuer || 'Course Completion',
        certificateUrl: cert.certificate_url
      })),
      education: [],
      achievements: [] // Can be populated from gamification system
    };
    
    // Create portfolio
    const portfolio = await upsertPortfolio(userId, {
      portfolioData: portfolioData,
      isPublic: false // Default to private
    });
    
    await client.query('COMMIT');
    
    return portfolio;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete portfolio
 * @param {string} portfolioId - Portfolio UUID
 * @param {string} userId - User UUID (for authorization)
 * @returns {Promise<boolean>} True if deleted
 */
export async function deletePortfolio(portfolioId, userId) {
  const result = await query(
    `DELETE FROM portfolios 
    WHERE id = $1 AND user_id = $2
    RETURNING id`,
    [portfolioId, userId]
  );
  
  return result.rows.length > 0;
}

/**
 * Map database row to portfolio object
 * @param {Object} row - Database row
 * @returns {Object} Mapped portfolio object
 */
function mapPortfolioRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    portfolioSlug: row.portfolio_slug,
    portfolioData: typeof row.portfolio_data === 'string' 
      ? JSON.parse(row.portfolio_data) 
      : row.portfolio_data,
    isPublic: row.is_public,
    isActive: row.is_active,
    viewCount: parseInt(row.view_count),
    lastViewedAt: row.last_viewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

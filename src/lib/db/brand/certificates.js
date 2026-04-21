/**
 * Brand Certificates Database Utilities
 * 
 * Provides database functions for brand certificate management.
 */

import { query } from '@/lib/db/index.js';
import { v4 as uuidv4 } from 'uuid';

// Fix: Add missing import for query function usage

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
    // Table doesn't exist - that's okay, return null gracefully
    if (error.code === '42P01') {
      // Table doesn't exist - expected behavior, no logging needed
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Get brand certificates
 * 
 * @param {string} userId - Brand user ID
 * @param {Object} filters - Filter options (page, limit)
 * @returns {Promise<Object>} Certificates list with pagination
 */
export async function getBrandCertificates(userId, filters = {}) {
  const brandId = await getBrandProfileId(userId);
  // Use created_by as fallback if brand_id column doesn't exist or brandId is null
  if (!brandId) {
    return { certificates: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
  }
  
  try {
    const { page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const certificatesQuery = `
      SELECT 
        bc.*,
        COUNT(DISTINCT ic.id) as issued_count
      FROM brand_certificates bc
      LEFT JOIN issued_certificates ic ON ic.certificate_id = bc.id
      WHERE bc.brand_id = $1
      GROUP BY bc.id
      ORDER BY bc.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const countQuery = `
      SELECT COUNT(*) as total
      FROM brand_certificates
      WHERE brand_id = $1
    `;

    const [certificatesResult, countResult] = await Promise.all([
      query(certificatesQuery, [brandId, limit, offset]),
      query(countQuery, [brandId]),
    ]);

    return {
      certificates: certificatesResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total) || 0,
        totalPages: Math.ceil((parseInt(countResult.rows[0].total) || 0) / limit),
      },
    };
  } catch (error) {
    // Handle missing brand_certificates table gracefully
    if (error.code === '42P01') {
      // Only log in development to reduce noise
      if (process.env.NODE_ENV === 'development') {
        console.log('[getBrandCertificates] brand_certificates table not available');
      }
      return { certificates: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
    }
    throw error;
  }
}

/**
 * Get brand certificate by ID
 * 
 * @param {string} certificateId - Certificate ID
 * @param {string} userId - Brand user ID (for verification)
 * @returns {Promise<Object|null>} Certificate or null
 */
export async function getBrandCertificate(certificateId, userId) {
  const brandId = await getBrandProfileId(userId);
  if (!brandId) {
    return null;
  }
  const certificateQuery = `
    SELECT 
      bc.*,
      COUNT(DISTINCT ic.id) as issued_count
    FROM brand_certificates bc
    LEFT JOIN issued_certificates ic ON ic.certificate_template_id = bc.id
    WHERE bc.id = $1 AND bc.brand_id = $2
    GROUP BY bc.id
    LIMIT 1
  `;
  const result = await query(certificateQuery, [certificateId, brandId]);
  return result.rows[0] || null;
}

/**
 * Create brand certificate template
 * 
 * @param {string} userId - Brand user ID
 * @param {Object} certificateData - Certificate data
 * @returns {Promise<Object>} Created certificate
 */
export async function createBrandCertificate(userId, certificateData) {
  const brandId = await getBrandProfileId(userId);
  // brand_certificates table requires brand_id (NOT NULL with FK to brand_profiles)
  // If brand_profiles table doesn't exist, we can't create certificates
  // However, we'll try to create the brand profile first if it doesn't exist
  if (!brandId) {
    // Try to create a brand profile entry if table exists but profile doesn't
    // This allows brands to create certificates even if they haven't filled out their profile yet
    try {
      const { upsertBrandProfile } = await import('@/lib/db/brand/profile.js');
      // Create a minimal brand profile
      const minimalProfile = await upsertBrandProfile(userId, {
        brand_name: 'My Brand', // Default name, can be updated later
        industry: 'General',
      });
      if (minimalProfile?.id) {
        // Retry with the newly created profile
        const newBrandId = await getBrandProfileId(userId);
        if (newBrandId) {
          // Continue with certificate creation using newBrandId
          return await createBrandCertificateWithBrandId(newBrandId, certificateData);
        }
      }
    } catch (profileError) {
      // If brand_profiles table doesn't exist, provide helpful error
      if (profileError.code === '42P01' || 
          profileError.message?.includes('table not available') || 
          profileError.message?.includes('not available')) {
        const migrationError = new Error('Brand profile feature is not available. Please ensure the database migration 066_brand_schema.sql has been run to create the required tables (brand_profiles, brand_certificates).');
        migrationError.isMigrationError = true;
        migrationError.code = 'MIGRATION_REQUIRED';
        throw migrationError;
      }
      // If profile creation fails for other reasons, provide helpful message
      if (process.env.NODE_ENV === 'development') {
        console.log('[createBrandCertificate] Failed to create brand profile:', profileError);
      }
      throw new Error(`Unable to create brand profile: ${profileError.message || 'Please complete your brand profile first at /dashboards/brand-profile'}`);
    }
    throw new Error('Brand profile is required. Please complete your brand profile first at /dashboards/brand-profile');
  }
  
  return await createBrandCertificateWithBrandId(brandId, certificateData);
}

/**
 * Internal helper to create certificate with brand_id
 */
async function createBrandCertificateWithBrandId(brandId, certificateData) {
  
  const {
    name,
    description,
    template_design,
    criteria,
    auto_issue,
  } = certificateData;

  try {
    // Map to schema column names (template_data instead of template_design, criteria instead of issuance_criteria)
    const insertQuery = `
      INSERT INTO brand_certificates (
        brand_id,
        certificate_name,
        description,
        template_data,
        criteria,
        status
      ) VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING *
    `;
    const result = await query(insertQuery, [
      brandId,
      name,
      description || null,
      JSON.stringify(template_design || {}),
      JSON.stringify(criteria || {}),
    ]);
    return result.rows[0];
  } catch (error) {
    // Handle missing brand_certificates table gracefully
    if (error.code === '42P01') {
      // Table doesn't exist - expected behavior, throw migration error without logging
      const migrationError = new Error('Certificate feature is not available. Please ensure the database tables are created via migration 066_brand_schema.sql');
      migrationError.isMigrationError = true;
      migrationError.code = 'MIGRATION_REQUIRED';
      throw migrationError;
    }
    throw error;
  }
}

/**
 * Update brand certificate template
 * 
 * @param {string} certificateId - Certificate ID
 * @param {string} brandId - Brand profile ID (for verification)
 * @param {Object} certificateData - Certificate data to update
 * @returns {Promise<Object|null>} Updated certificate or null
 */
export async function updateBrandCertificate(certificateId, brandId, certificateData) {
  const {
    name,
    description,
    template_design,
    criteria,
    auto_issue,
  } = certificateData;

  // Build dynamic update query
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`certificate_name = $${paramIndex++}`);
    params.push(name);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(description);
  }
  if (template_design !== undefined) {
    updates.push(`template_design = $${paramIndex++}`);
    params.push(JSON.stringify(template_design));
  }
  if (criteria !== undefined) {
    updates.push(`issuance_criteria = $${paramIndex++}`);
    params.push(JSON.stringify(criteria));
  }
  if (auto_issue !== undefined) {
    updates.push(`auto_issue = $${paramIndex++}`);
    params.push(auto_issue);
  }

  if (updates.length === 0) {
    return await getBrandCertificate(certificateId, brandId);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(certificateId, brandId);

  const updateQuery = `
    UPDATE brand_certificates
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex++} AND brand_id = $${paramIndex}
    RETURNING *
  `;
  const result = await query(updateQuery, params);

  return result.rows[0] || null;
}

/**
 * Delete brand certificate template
 * 
 * @param {string} certificateId - Certificate ID
 * @param {string} userId - Brand user ID (for verification)
 * @returns {Promise<boolean>} Success status
 */
export async function deleteBrandCertificate(certificateId, userId) {
  const brandId = await getBrandProfileId(userId);
  if (!brandId) {
    return false;
  }
  const deleteQuery = `
    DELETE FROM brand_certificates
    WHERE id = $1 AND brand_id = $2
  `;
  const result = await query(deleteQuery, [certificateId, brandId]);
  return result.rowCount > 0;
}

/**
 * Get eligible students for certificate issuance
 * 
 * @param {string} certificateId - Certificate ID
 * @returns {Promise<Array>} List of eligible students
 */
export async function getEligibleStudents(certificateId) {
  // Get certificate criteria
  const certQuery = `
    SELECT criteria
    FROM brand_certificates
    WHERE id = $1
  `;
  const certResult = await query(certQuery, [certificateId]);
  if (certResult.rows.length === 0) {
    return [];
  }

  const criteria = certResult.rows[0].criteria || {};

  // Build query based on criteria
  let whereConditions = [];
  const params = [certificateId];
  let paramIndex = 2;

  // Get students who have completed courses (if course_completion is required)
  if (criteria.course_completion) {
    whereConditions.push(`
      EXISTS (
        SELECT 1 FROM course_enrollments ce
        WHERE ce.student_id = u.id
        AND ce.enrollment_status = 'completed'
      )
    `);
  }

  // Get students who meet quiz score (if quiz_score_min is set)
  if (criteria.quiz_score_min) {
    whereConditions.push(`
      EXISTS (
        SELECT 1 FROM quiz_attempts qa
        WHERE qa.student_id = u.id
        AND qa.status = 'submitted'
        AND qa.percentage_score >= $${paramIndex}
      )
    `);
    params.push(criteria.quiz_score_min);
    paramIndex++;
  }

  // Get students who have submitted assignments (if assignment_submission is required)
  if (criteria.assignment_submission) {
    whereConditions.push(`
      EXISTS (
        SELECT 1 FROM assignment_submissions asub
        WHERE asub.student_id = u.id
        AND asub.status = 'submitted'
      )
    `);
  }

  // Get students who haven't already received this certificate
  const excludeIssuedQuery = `
    AND NOT EXISTS (
      SELECT 1 FROM issued_certificates ic
      WHERE ic.student_id = u.id
      AND ic.certificate_template_id = $1
    )
  `;

  const eligibleQuery = `
    SELECT DISTINCT
      u.id,
      u.first_name || ' ' || u.last_name as name,
      u.email,
      (
        SELECT c.title
        FROM course_enrollments ce
        INNER JOIN courses c ON c.id = ce.course_id
        WHERE ce.student_id = u.id
        AND ce.enrollment_status = 'completed'
        LIMIT 1
      ) as course_title,
      (
        SELECT COALESCE(AVG(ce.progress_percentage), 0)
        FROM course_enrollments ce
        WHERE ce.student_id = u.id
      ) as progress_percentage
    FROM users u
    WHERE u.role = 'student'
    ${whereConditions.length > 0 ? `AND (${whereConditions.join(' AND ')})` : ''}
    ${excludeIssuedQuery}
    ORDER BY u.first_name, u.last_name
  `;

  const result = await query(eligibleQuery, params);
  return result.rows;
}

/**
 * Issue certificate to student(s)
 * 
 * @param {string} certificateId - Certificate template ID
 * @param {Array<string>} studentIds - Array of student user IDs
 * @returns {Promise<Array>} Array of issued certificate records
 */
export async function issueCertificates(certificateId, studentIds) {
  if (!studentIds || studentIds.length === 0) {
    return [];
  }

    // Get certificate template
  const certQuery = `
    SELECT id, brand_id, certificate_name, template_data
    FROM brand_certificates
    WHERE id = $1
  `;
  const certResult = await query(certQuery, [certificateId]);
  if (certResult.rows.length === 0) {
    throw new Error('Certificate template not found');
  }

  const certificate = certResult.rows[0];

  // Generate verification codes and issue certificates
  const issuedCertificates = [];
  for (const studentId of studentIds) {
    // Check if already issued
    const existingQuery = `
      SELECT id FROM issued_certificates
      WHERE certificate_id = $1 AND student_id = $2
    `;
    const existingResult = await query(existingQuery, [certificateId, studentId]);
    if (existingResult.rows.length > 0) {
      continue; // Skip if already issued
    }

    // Generate unique verification code
    const verificationCode = `BRAND-${certificateId.substring(0, 8)}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Certificate URL will be generated and updated later via API
    const certificateUrl = null; // Will be populated when PDF is generated

    const insertQuery = `
      INSERT INTO issued_certificates (
        certificate_id,
        student_id,
        verification_code,
        certificate_url,
        issued_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await query(insertQuery, [certificateId, studentId, verificationCode, certificateUrl]);
    issuedCertificates.push(result.rows[0]);
  }

  return issuedCertificates;
}

/**
 * Get issued certificates for a template
 * 
 * @param {string} certificateId - Certificate template ID
 * @param {Object} filters - Filter options (page, limit)
 * @returns {Promise<Object>} Issued certificates list with pagination
 */
export async function getIssuedCertificates(certificateId, filters = {}) {
  const { page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  const issuedQuery = `
    SELECT 
      ic.*,
      u.first_name || ' ' || u.last_name as student_name,
      u.email as student_email,
      bc.certificate_name,
      bp.brand_name
    FROM issued_certificates ic
    INNER JOIN users u ON u.id = ic.student_id
    INNER JOIN brand_certificates bc ON bc.id = ic.certificate_id
    INNER JOIN brand_profiles bp ON bp.id = bc.brand_id
    WHERE ic.certificate_id = $1
    ORDER BY ic.issued_at DESC
    LIMIT $2 OFFSET $3
  `;
  const countQuery = `
    SELECT COUNT(*) as total
    FROM issued_certificates
    WHERE certificate_id = $1
  `;

  const [issuedResult, countResult] = await Promise.all([
    query(issuedQuery, [certificateId, limit, offset]),
    query(countQuery, [certificateId]),
  ]);

  return {
    certificates: issuedResult.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].total) || 0,
      totalPages: Math.ceil((parseInt(countResult.rows[0].total) || 0) / limit),
    },
  };
}

/**
 * Verify certificate by verification code (public)
 * 
 * @param {string} verificationCode - Verification code
 * @returns {Promise<Object|null>} Certificate verification data or null
 */
export async function verifyCertificate(verificationCode) {
  const verifyQuery = `
    SELECT 
      ic.*,
      u.first_name || ' ' || u.last_name as student_name,
      u.email as student_email,
      bc.certificate_name,
      bp.brand_name
    FROM issued_certificates ic
    INNER JOIN users u ON u.id = ic.student_id
    INNER JOIN brand_certificates bc ON bc.id = ic.certificate_id
    INNER JOIN brand_profiles bp ON bp.id = bc.brand_id
    WHERE ic.verification_code = $1
    LIMIT 1
  `;
  const result = await query(verifyQuery, [verificationCode]);
  return result.rows[0] || null;
}

/**
 * Job Postings Database Utilities
 * 
 * Provides CRUD operations for job/internship postings.
 * 
 * @module db/placement/postings
 */

import { query, getClient } from '../index.js';

/**
 * Create a new job posting
 * @param {Object} postingData - Posting data
 * @param {string} postingData.title - Job title
 * @param {string} postingData.companyName - Company name
 * @param {string} postingData.postingType - 'internship' or 'job'
 * @param {string} postingData.location - Location
 * @param {string} postingData.description - Description
 * @param {string} postingData.requirements - Requirements
 * @param {string} postingData.responsibilities - Responsibilities
 * @param {number} postingData.salaryMin - Minimum salary
 * @param {number} postingData.salaryMax - Maximum salary
 * @param {string} postingData.salaryCurrency - Currency code
 * @param {string} postingData.salaryDisplay - Display string for salary
 * @param {Array} postingData.requiredSkills - Array of skill names
 * @param {string} postingData.preferredQualifications - Preferred qualifications
 * @param {string} postingData.experienceLevel - Experience level
 * @param {Date} postingData.applicationDeadline - Application deadline
 * @param {string} postingData.applicationLink - External application link
 * @param {number} postingData.minReadinessScore - Minimum readiness score
 * @param {Array} postingData.requiredCourses - Array of course IDs
 * @param {Array} postingData.requiredSkillsList - Array of required skill names
 * @param {string} postingData.postedBy - Admin/company user ID
 * @param {string} postingData.companyUserId - Company user ID (for company-owned postings)
 * @param {string} postingData.organizationId - Organization ID
 * @param {string} postingData.status - Status ('draft', 'active', 'closed', 'expired')
 * @returns {Promise<Object>} Created posting object
 */
export async function createPosting(postingData) {
  const {
    title,
    companyName,
    postingType,
    location,
    description,
    requirements,
    responsibilities,
    salaryMin,
    salaryMax,
    salaryCurrency = 'INR',
    salaryDisplay,
    requiredSkills,
    preferredQualifications,
    experienceLevel,
    applicationDeadline,
    applicationLink,
    minReadinessScore,
    requiredCourses,
    requiredSkillsList,
    postedBy,
    companyUserId,
    organizationId,
    status = 'draft'
  } = postingData;
  
  const result = await query(
    `INSERT INTO job_postings (
      title, company_name, posting_type, location,
      description, requirements, responsibilities,
      salary_min, salary_max, salary_currency, salary_display,
      required_skills, preferred_qualifications, experience_level,
      application_deadline, application_link,
      min_readiness_score, required_courses, required_skills_list,
      posted_by, company_user_id, organization_id, status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
    ) RETURNING *`,
    [
      title,
      companyName,
      postingType,
      location || null,
      description || null,
      requirements || null,
      responsibilities || null,
      salaryMin || null,
      salaryMax || null,
      salaryCurrency,
      salaryDisplay || null,
      requiredSkills ? JSON.stringify(requiredSkills) : null,
      preferredQualifications || null,
      experienceLevel || null,
      applicationDeadline || null,
      applicationLink || null,
      minReadinessScore || null,
      requiredCourses ? JSON.stringify(requiredCourses) : null,
      requiredSkillsList ? JSON.stringify(requiredSkillsList) : null,
      postedBy,
      companyUserId || null,
      organizationId || null,
      status
    ]
  );
  
  return mapPostingRow(result.rows[0]);
}

/**
 * Get a posting by ID
 * @param {string} postingId - Posting UUID
 * @returns {Promise<Object|null>} Posting object or null
 */
export async function getPosting(postingId) {
  const result = await query(
    `SELECT 
      jp.*,
      u.first_name || ' ' || u.last_name as posted_by_name,
      u.email as posted_by_email
    FROM job_postings jp
    LEFT JOIN users u ON jp.posted_by = u.id
    WHERE jp.id = $1`,
    [postingId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapPostingRow(result.rows[0]);
}

/**
 * Get postings with filters
 * @param {Object} filters - Filter options
 * @param {string} filters.postingType - Filter by type ('internship', 'job', 'contract')
 * @param {string} filters.status - Filter by status
 * @param {string} filters.organizationId - Filter by organization
 * @param {string} filters.companyUserId - Filter by company user ID
 * @param {string} filters.search - Search term
 * @param {number} filters.minReadinessScore - Minimum readiness score filter
 * @param {number} filters.page - Page number (default: 1)
 * @param {number} filters.pageSize - Items per page (default: 10)
 * @returns {Promise<Object>} Object with postings array and pagination info
 */
export async function getPostings(filters = {}) {
  const {
    postingType,
    status = 'active',
    organizationId,
    companyUserId,
    search,
    minReadinessScore,
    page = 1,
    pageSize = 10
  } = filters;
  
  const offset = (page - 1) * pageSize;
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  // Build WHERE conditions
  if (status) {
    conditions.push(`jp.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }
  
  if (postingType) {
    conditions.push(`jp.posting_type = $${paramIndex}`);
    params.push(postingType);
    paramIndex++;
  }
  
  if (organizationId) {
    conditions.push(`jp.organization_id = $${paramIndex}`);
    params.push(organizationId);
    paramIndex++;
  }
  
  if (companyUserId) {
    conditions.push(`jp.company_user_id = $${paramIndex}`);
    params.push(companyUserId);
    paramIndex++;
  }
  
  if (search) {
    conditions.push(`(
      jp.title ILIKE $${paramIndex} OR
      jp.company_name ILIKE $${paramIndex} OR
      jp.description ILIKE $${paramIndex}
    )`);
    params.push(`%${search}%`);
    paramIndex++;
  }
  
  if (minReadinessScore !== undefined && minReadinessScore !== null) {
    conditions.push(`(jp.min_readiness_score IS NULL OR jp.min_readiness_score <= $${paramIndex})`);
    params.push(minReadinessScore);
    paramIndex++;
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM job_postings jp ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);
  
  // Get postings
  params.push(pageSize, offset);
  const result = await query(
    `SELECT 
      jp.*,
      u.first_name || ' ' || u.last_name as posted_by_name
    FROM job_postings jp
    LEFT JOIN users u ON jp.posted_by = u.id
    ${whereClause}
    ORDER BY jp.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );
  
  return {
    postings: result.rows.map(mapPostingRow),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

/**
 * Update a posting
 * @param {string} postingId - Posting UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated posting object
 */
export async function updatePosting(postingId, updates) {
  const allowedFields = [
    'title', 'company_name', 'posting_type', 'location',
    'description', 'requirements', 'responsibilities',
    'salary_min', 'salary_max', 'salary_currency', 'salary_display',
    'required_skills', 'preferred_qualifications', 'experience_level',
    'application_deadline', 'application_link',
    'min_readiness_score', 'required_courses', 'required_skills_list',
    'status'
  ];
  
  const updateFields = [];
  const params = [];
  let paramIndex = 1;
  
  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updateFields.push(`${dbKey} = $${paramIndex}`);
      
      // Handle JSON fields
      if (['required_skills', 'required_courses', 'required_skills_list'].includes(dbKey)) {
        params.push(updates[key] ? JSON.stringify(updates[key]) : null);
      } else {
        params.push(updates[key]);
      }
      
      paramIndex++;
    }
  });
  
  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  params.push(postingId);
  const result = await query(
    `UPDATE job_postings 
    SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramIndex}
    RETURNING *`,
    params
  );
  
  if (result.rows.length === 0) {
    throw new Error('Posting not found');
  }
  
  return mapPostingRow(result.rows[0]);
}

/**
 * Delete a posting
 * @param {string} postingId - Posting UUID
 * @returns {Promise<boolean>} True if deleted
 */
export async function deletePosting(postingId) {
  const result = await query(
    `DELETE FROM job_postings WHERE id = $1 RETURNING id`,
    [postingId]
  );
  
  return result.rows.length > 0;
}

/**
 * Check if user is eligible for a posting
 * @param {string} userId - User UUID
 * @param {string} postingId - Posting UUID
 * @returns {Promise<Object>} Eligibility check result
 */
export async function checkEligibility(userId, postingId) {
  const posting = await getPosting(postingId);
  if (!posting) {
    return { eligible: false, reason: 'Posting not found' };
  }
  
  // Check readiness score
  if (posting.minReadinessScore !== null) {
    const readinessResult = await query(
      `SELECT readiness_score FROM placement_readiness WHERE user_id = $1`,
      [userId]
    );
    
    const readinessScore = readinessResult.rows[0]?.readiness_score || 0;
    if (readinessScore < posting.minReadinessScore) {
      return {
        eligible: false,
        reason: `Minimum readiness score of ${posting.minReadinessScore}% required. Your score: ${readinessScore}%`
      };
    }
  }
  
  // Check required courses
  if (posting.requiredCourses && posting.requiredCourses.length > 0) {
    const coursesResult = await query(
      `SELECT COUNT(*) as completed_count
      FROM course_enrollments
      WHERE user_id = $1 
        AND course_id = ANY($2::uuid[])
        AND enrollment_status = 'completed'`,
      [userId, posting.requiredCourses]
    );
    
    const completedCount = parseInt(coursesResult.rows[0].completed_count);
    if (completedCount < posting.requiredCourses.length) {
      return {
        eligible: false,
        reason: `Must complete all required courses. Completed: ${completedCount}/${posting.requiredCourses.length}`
      };
    }
  }
  
  return { eligible: true };
}

/**
 * Safely parse JSON value from database
 * Handles both JSONB (already parsed) and JSON string cases
 * @param {any} value - Value from database
 * @param {any} defaultValue - Default value if parsing fails (default: null)
 * @returns {any} Parsed value or default
 */
function safeJsonParse(value, defaultValue = null) {
  // If already an object/array (JSONB returns parsed), return as-is
  if (value === null || value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'object') {
    return value;
  }
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      // If parsing fails, return default value
      console.warn('Failed to parse JSON value:', value, e);
      return defaultValue;
    }
  }
  return defaultValue;
}

/**
 * Map database row to posting object
 * @param {Object} row - Database row
 * @returns {Object} Mapped posting object
 */
function mapPostingRow(row) {
  return {
    id: row.id,
    title: row.title,
    companyName: row.company_name,
    postingType: row.posting_type,
    location: row.location,
    description: row.description,
    requirements: row.requirements,
    responsibilities: row.responsibilities,
    salaryMin: row.salary_min ? parseFloat(row.salary_min) : null,
    salaryMax: row.salary_max ? parseFloat(row.salary_max) : null,
    salaryCurrency: row.salary_currency,
    salaryDisplay: row.salary_display,
    requiredSkills: safeJsonParse(row.required_skills, null),
    preferredQualifications: row.preferred_qualifications,
    experienceLevel: row.experience_level,
    applicationDeadline: row.application_deadline,
    applicationLink: row.application_link,
    minReadinessScore: row.min_readiness_score ? parseFloat(row.min_readiness_score) : null,
    requiredCourses: safeJsonParse(row.required_courses, null),
    requiredSkillsList: safeJsonParse(row.required_skills_list, null),
    postedBy: row.posted_by,
    postedByName: row.posted_by_name,
    companyUserId: row.company_user_id,
    organizationId: row.organization_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

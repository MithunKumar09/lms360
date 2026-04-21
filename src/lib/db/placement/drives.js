/**
 * Recruitment Drives Database Utilities
 * 
 * Provides CRUD operations for recruitment drives.
 * 
 * @module db/placement/drives
 */

import { query, getClient } from '../index.js';

/**
 * Create a new recruitment drive
 * @param {Object} driveData - Drive data
 * @param {string} driveData.title - Drive title
 * @param {string} driveData.companyName - Company name
 * @param {string} driveData.description - Description
 * @param {Date} driveData.driveDate - Drive date
 * @param {Date} driveData.driveEndDate - Drive end date (optional)
 * @param {string} driveData.location - Location
 * @param {string} driveData.venueAddress - Venue address
 * @param {boolean} driveData.isVirtual - Is virtual drive
 * @param {string} driveData.virtualLink - Virtual link
 * @param {number} driveData.minReadinessScore - Minimum readiness score
 * @param {string} driveData.eligibilityCriteria - Eligibility criteria
 * @param {Array} driveData.requiredCourses - Required course IDs
 * @param {Date} driveData.registrationDeadline - Registration deadline
 * @param {number} driveData.maxParticipants - Maximum participants
 * @param {string} driveData.createdBy - Creator user ID
 * @param {string} driveData.organizationId - Organization ID
 * @param {string} driveData.status - Status
 * @returns {Promise<Object>} Created drive object
 */
export async function createDrive(driveData) {
  const {
    title,
    companyName,
    description,
    driveDate,
    driveEndDate,
    location,
    venueAddress,
    isVirtual = false,
    virtualLink,
    minReadinessScore,
    eligibilityCriteria,
    requiredCourses,
    registrationDeadline,
    maxParticipants,
    createdBy,
    organizationId,
    status = 'upcoming'
  } = driveData;
  
  const result = await query(
    `INSERT INTO recruitment_drives (
      title, company_name, description,
      drive_date, drive_end_date,
      location, venue_address,
      is_virtual, virtual_link,
      min_readiness_score, eligibility_criteria, required_courses,
      registration_deadline, max_participants,
      created_by, organization_id, status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
    ) RETURNING *`,
    [
      title,
      companyName,
      description || null,
      driveDate,
      driveEndDate || null,
      location || null,
      venueAddress || null,
      isVirtual,
      virtualLink || null,
      minReadinessScore || null,
      eligibilityCriteria || null,
      requiredCourses ? JSON.stringify(requiredCourses) : null,
      registrationDeadline || null,
      maxParticipants || null,
      createdBy,
      organizationId || null,
      status
    ]
  );
  
  return mapDriveRow(result.rows[0]);
}

/**
 * Get a drive by ID
 * @param {string} driveId - Drive UUID
 * @returns {Promise<Object|null>} Drive object or null
 */
export async function getDrive(driveId) {
  const result = await query(
    `SELECT 
      rd.*,
      u.first_name || ' ' || u.last_name as created_by_name,
      COUNT(rdr.id) as registered_count
    FROM recruitment_drives rd
    LEFT JOIN users u ON rd.created_by = u.id
    LEFT JOIN recruitment_drive_registrations rdr ON rd.id = rdr.drive_id
    WHERE rd.id = $1
    GROUP BY rd.id, u.first_name, u.last_name`,
    [driveId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const drive = mapDriveRow(result.rows[0]);
  drive.registeredCount = parseInt(result.rows[0].registered_count);
  return drive;
}

/**
 * Get drives with filters
 * @param {Object} filters - Filter options
 * @param {string} filters.status - Filter by status
 * @param {string} filters.organizationId - Filter by organization
 * @param {Date} filters.fromDate - Filter from date
 * @param {Date} filters.toDate - Filter to date
 * @param {number} filters.page - Page number
 * @param {number} filters.pageSize - Items per page
 * @returns {Promise<Object>} Object with drives array and pagination
 */
export async function getDrives(filters = {}) {
  const {
    status,
    organizationId,
    fromDate,
    toDate,
    page = 1,
    pageSize = 10
  } = filters;
  
  const offset = (page - 1) * pageSize;
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  if (status) {
    conditions.push(`rd.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }
  
  if (organizationId) {
    conditions.push(`rd.organization_id = $${paramIndex}`);
    params.push(organizationId);
    paramIndex++;
  }
  
  if (fromDate) {
    conditions.push(`rd.drive_date >= $${paramIndex}`);
    params.push(fromDate);
    paramIndex++;
  }
  
  if (toDate) {
    conditions.push(`rd.drive_date <= $${paramIndex}`);
    params.push(toDate);
    paramIndex++;
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM recruitment_drives rd ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);
  
  // Get drives
  params.push(pageSize, offset);
  const result = await query(
    `SELECT 
      rd.*,
      u.first_name || ' ' || u.last_name as created_by_name,
      COUNT(rdr.id) as registered_count
    FROM recruitment_drives rd
    LEFT JOIN users u ON rd.created_by = u.id
    LEFT JOIN recruitment_drive_registrations rdr ON rd.id = rdr.drive_id
    ${whereClause}
    GROUP BY rd.id, u.first_name, u.last_name
    ORDER BY rd.drive_date ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );
  
  const drives = result.rows.map(row => {
    const drive = mapDriveRow(row);
    drive.registeredCount = parseInt(row.registered_count);
    return drive;
  });
  
  return {
    drives,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

/**
 * Update a drive
 * @param {string} driveId - Drive UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated drive object
 */
export async function updateDrive(driveId, updates) {
  const allowedFields = [
    'title', 'company_name', 'description',
    'drive_date', 'drive_end_date',
    'location', 'venue_address',
    'is_virtual', 'virtual_link',
    'min_readiness_score', 'eligibility_criteria', 'required_courses',
    'registration_deadline', 'max_participants',
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
      if (dbKey === 'required_courses') {
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
  
  params.push(driveId);
  const result = await query(
    `UPDATE recruitment_drives 
    SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramIndex}
    RETURNING *`,
    params
  );
  
  if (result.rows.length === 0) {
    throw new Error('Drive not found');
  }
  
  return mapDriveRow(result.rows[0]);
}

/**
 * Delete a drive
 * @param {string} driveId - Drive UUID
 * @returns {Promise<boolean>} True if deleted
 */
export async function deleteDrive(driveId) {
  const result = await query(
    `DELETE FROM recruitment_drives WHERE id = $1 RETURNING id`,
    [driveId]
  );
  
  return result.rows.length > 0;
}

/**
 * Register user for a drive
 * @param {string} userId - User UUID
 * @param {string} driveId - Drive UUID
 * @returns {Promise<Object>} Registration object
 */
export async function registerForDrive(userId, driveId) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Check if already registered
    const existing = await client.query(
      `SELECT id FROM recruitment_drive_registrations 
      WHERE user_id = $1 AND drive_id = $2`,
      [userId, driveId]
    );
    
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      throw new Error('You are already registered for this drive');
    }
    
    // Check drive capacity
    const drive = await getDrive(driveId);
    if (!drive) {
      await client.query('ROLLBACK');
      throw new Error('Drive not found');
    }
    
    if (drive.maxParticipants && drive.registeredCount >= drive.maxParticipants) {
      await client.query('ROLLBACK');
      throw new Error('Drive is full');
    }
    
    // Check registration deadline
    if (drive.registrationDeadline && new Date() > new Date(drive.registrationDeadline)) {
      await client.query('ROLLBACK');
      throw new Error('Registration deadline has passed');
    }
    
    // Check eligibility
    const eligibility = await checkDriveEligibility(userId, driveId);
    if (!eligibility.eligible) {
      await client.query('ROLLBACK');
      throw new Error(eligibility.reason || 'Not eligible for this drive');
    }
    
    // Create registration
    const result = await client.query(
      `INSERT INTO recruitment_drive_registrations (
        user_id, drive_id, registration_status,
        eligibility_checked, eligibility_status, eligibility_message
      ) VALUES ($1, $2, 'registered', true, $3, $4)
      RETURNING *`,
      [
        userId,
        driveId,
        eligibility.eligible ? 'eligible' : 'not_eligible',
        eligibility.reason || null
      ]
    );
    
    await client.query('COMMIT');
    
    return mapRegistrationRow(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if user is eligible for a drive
 * @param {string} userId - User UUID
 * @param {string} driveId - Drive UUID
 * @returns {Promise<Object>} Eligibility check result
 */
export async function checkDriveEligibility(userId, driveId) {
  const drive = await getDrive(driveId);
  if (!drive) {
    return { eligible: false, reason: 'Drive not found' };
  }
  
  // Check readiness score
  if (drive.minReadinessScore !== null) {
    const readinessResult = await query(
      `SELECT readiness_score FROM placement_readiness WHERE user_id = $1`,
      [userId]
    );
    
    const readinessScore = readinessResult.rows[0]?.readiness_score || 0;
    if (readinessScore < drive.minReadinessScore) {
      return {
        eligible: false,
        reason: `Minimum readiness score of ${drive.minReadinessScore}% required. Your score: ${readinessScore}%`
      };
    }
  }
  
  // Check required courses
  if (drive.requiredCourses && drive.requiredCourses.length > 0) {
    const coursesResult = await query(
      `SELECT COUNT(*) as completed_count
      FROM course_enrollments
      WHERE user_id = $1 
        AND course_id = ANY($2::uuid[])
        AND enrollment_status = 'completed'`,
      [userId, drive.requiredCourses]
    );
    
    const completedCount = parseInt(coursesResult.rows[0].completed_count);
    if (completedCount < drive.requiredCourses.length) {
      return {
        eligible: false,
        reason: `Must complete all required courses. Completed: ${completedCount}/${drive.requiredCourses.length}`
      };
    }
  }
  
  return { eligible: true };
}

/**
 * Get user's drive registrations
 * @param {string} userId - User UUID
 * @returns {Promise<Array>} Array of registration objects
 */
export async function getUserDriveRegistrations(userId) {
  const result = await query(
    `SELECT 
      rdr.*,
      rd.title as drive_title,
      rd.company_name,
      rd.drive_date,
      rd.location,
      rd.is_virtual
    FROM recruitment_drive_registrations rdr
    INNER JOIN recruitment_drives rd ON rdr.drive_id = rd.id
    WHERE rdr.user_id = $1
    ORDER BY rd.drive_date ASC`,
    [userId]
  );
  
  return result.rows.map(row => {
    const registration = mapRegistrationRow(row);
    registration.driveTitle = row.drive_title;
    registration.companyName = row.company_name;
    registration.driveDate = row.drive_date;
    registration.location = row.location;
    registration.isVirtual = row.is_virtual;
    return registration;
  });
}

/**
 * Map database row to drive object
 * @param {Object} row - Database row
 * @returns {Object} Mapped drive object
 */
function mapDriveRow(row) {
  return {
    id: row.id,
    title: row.title,
    companyName: row.company_name,
    description: row.description,
    driveDate: row.drive_date,
    driveEndDate: row.drive_end_date,
    location: row.location,
    venueAddress: row.venue_address,
    isVirtual: row.is_virtual,
    virtualLink: row.virtual_link,
    minReadinessScore: row.min_readiness_score ? parseFloat(row.min_readiness_score) : null,
    eligibilityCriteria: row.eligibility_criteria,
    requiredCourses: row.required_courses ? JSON.parse(row.required_courses) : null,
    registrationDeadline: row.registration_deadline,
    maxParticipants: row.max_participants ? parseInt(row.max_participants) : null,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    organizationId: row.organization_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Map database row to registration object
 * @param {Object} row - Database row
 * @returns {Object} Mapped registration object
 */
function mapRegistrationRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    driveId: row.drive_id,
    registrationStatus: row.registration_status,
    eligibilityChecked: row.eligibility_checked,
    eligibilityStatus: row.eligibility_status,
    eligibilityMessage: row.eligibility_message,
    notes: row.notes,
    registeredAt: row.registered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

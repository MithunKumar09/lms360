/**
 * Company Challenges Database Utilities
 * 
 * Provides CRUD operations for company challenges/skill testing.
 * 
 * @module db/company/challenges
 */

import { query } from '../index.js';

/**
 * Create a new company challenge
 */
export async function createChallenge(challengeData) {
  const {
    companyUserId,
    organizationId,
    title,
    description,
    challengeType,
    instructions,
    evaluationCriteria,
    maxMarks = 100.00,
    passingMarks = 50.00,
    startDate,
    endDate,
    submissionDeadline,
    allowLateSubmission = false,
    maxFileSizeMb = 10,
    allowedFileTypes,
    maxTeamSize = 1,
    status = 'draft',
    isPublic = true,
    autoEvaluate = false
  } = challengeData;
  
  const result = await query(
    `INSERT INTO company_challenges (
      company_user_id, organization_id, title, description,
      challenge_type, instructions, evaluation_criteria,
      max_marks, passing_marks, start_date, end_date, submission_deadline,
      allow_late_submission, max_file_size_mb, allowed_file_types,
      max_team_size, status, is_public, auto_evaluate
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
    ) RETURNING *`,
    [
      companyUserId,
      organizationId || null,
      title,
      description || null,
      challengeType,
      instructions || null,
      evaluationCriteria || null,
      maxMarks,
      passingMarks,
      startDate,
      endDate,
      submissionDeadline,
      allowLateSubmission,
      maxFileSizeMb,
      allowedFileTypes || null,
      maxTeamSize,
      status,
      isPublic,
      autoEvaluate
    ]
  );
  
  return mapChallengeRow(result.rows[0]);
}

/**
 * Get challenge by ID
 */
export async function getChallenge(challengeId) {
  const result = await query(
    `SELECT 
      cc.*,
      u.first_name || ' ' || u.last_name as company_name,
      u.email as company_email
    FROM company_challenges cc
    LEFT JOIN users u ON cc.company_user_id = u.id
    WHERE cc.id = $1`,
    [challengeId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapChallengeRow(result.rows[0]);
}

/**
 * Get challenges with filters
 */
export async function getChallenges(filters = {}) {
  const {
    companyUserId,
    organizationId,
    challengeType,
    status,
    isPublic,
    search,
    page = 1,
    pageSize = 10
  } = filters;
  
  const offset = (page - 1) * pageSize;
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  if (companyUserId) {
    conditions.push(`cc.company_user_id = $${paramIndex}`);
    params.push(companyUserId);
    paramIndex++;
  }
  
  if (organizationId) {
    conditions.push(`cc.organization_id = $${paramIndex}`);
    params.push(organizationId);
    paramIndex++;
  }
  
  if (challengeType) {
    conditions.push(`cc.challenge_type = $${paramIndex}`);
    params.push(challengeType);
    paramIndex++;
  }
  
  if (status) {
    conditions.push(`cc.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }
  
  if (isPublic !== undefined && isPublic !== null) {
    conditions.push(`cc.is_public = $${paramIndex}`);
    params.push(isPublic);
    paramIndex++;
  }
  
  if (search) {
    conditions.push(`(
      cc.title ILIKE $${paramIndex} OR
      cc.description ILIKE $${paramIndex}
    )`);
    params.push(`%${search}%`);
    paramIndex++;
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM company_challenges cc ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);
  
  // Get challenges
  params.push(pageSize, offset);
  const result = await query(
    `SELECT 
      cc.*,
      u.first_name || ' ' || u.last_name as company_name
    FROM company_challenges cc
    LEFT JOIN users u ON cc.company_user_id = u.id
    ${whereClause}
    ORDER BY cc.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );
  
  return {
    challenges: result.rows.map(mapChallengeRow),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

/**
 * Update challenge
 */
export async function updateChallenge(challengeId, updates) {
  const allowedFields = [
    'title', 'description', 'challengeType', 'instructions', 'evaluationCriteria',
    'maxMarks', 'passingMarks', 'startDate', 'endDate', 'submissionDeadline',
    'allowLateSubmission', 'maxFileSizeMb', 'allowedFileTypes', 'maxTeamSize',
    'status', 'isPublic', 'autoEvaluate'
  ];
  
  const updateFields = [];
  const params = [];
  let paramIndex = 1;
  
  Object.keys(updates).forEach(key => {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowedFields.includes(key)) {
      updateFields.push(`${dbKey} = $${paramIndex}`);
      if (key === 'allowedFileTypes') {
        params.push(updates[key] || null);
      } else {
        params.push(updates[key]);
      }
      paramIndex++;
    }
  });
  
  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  params.push(challengeId);
  const result = await query(
    `UPDATE company_challenges 
    SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramIndex}
    RETURNING *`,
    params
  );
  
  if (result.rows.length === 0) {
    throw new Error('Challenge not found');
  }
  
  return mapChallengeRow(result.rows[0]);
}

/**
 * Delete challenge
 */
export async function deleteChallenge(challengeId) {
  const result = await query(
    `DELETE FROM company_challenges WHERE id = $1 RETURNING id`,
    [challengeId]
  );
  
  return result.rows.length > 0;
}

/**
 * Check if company owns challenge
 */
export async function hasAccessToChallenge(challengeId, companyUserId) {
  const result = await query(
    `SELECT id FROM company_challenges 
    WHERE id = $1 AND company_user_id = $2`,
    [challengeId, companyUserId]
  );
  
  return result.rows.length > 0;
}

/**
 * Map database row to challenge object
 */
function mapChallengeRow(row) {
  return {
    id: row.id,
    companyUserId: row.company_user_id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    challengeType: row.challenge_type,
    instructions: row.instructions,
    evaluationCriteria: row.evaluation_criteria,
    maxMarks: row.max_marks ? parseFloat(row.max_marks) : null,
    passingMarks: row.passing_marks ? parseFloat(row.passing_marks) : null,
    startDate: row.start_date,
    endDate: row.end_date,
    submissionDeadline: row.submission_deadline,
    allowLateSubmission: row.allow_late_submission,
    maxFileSizeMb: row.max_file_size_mb,
    allowedFileTypes: row.allowed_file_types || [],
    maxTeamSize: row.max_team_size,
    status: row.status,
    isPublic: row.is_public,
    autoEvaluate: row.auto_evaluate,
    companyName: row.company_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Placement Readiness Database Utilities
 * 
 * Provides functions for calculating and managing placement readiness scores.
 * 
 * @module db/placement/readiness
 */

import { query, getClient } from '../index.js';

/**
 * Calculate placement readiness score for a user
 * 
 * Formula:
 * - Course Completion Rate: 40% weight
 * - Assignment Completion Rate: 25% weight
 * - Profile Completion Rate: 15% weight
 * - Skills Assessed Count: 10% weight
 * - Mentor Endorsements: 10% weight
 * 
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Readiness object with score and status
 */
export async function calculateReadinessScore(userId) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // 1. Calculate Course Completion Rate (40% weight)
    const courseCompletion = await client.query(
      `SELECT 
        COUNT(*) as total_enrollments,
        COUNT(CASE WHEN enrollment_status = 'completed' THEN 1 END) as completed_courses
      FROM course_enrollments
      WHERE user_id = $1 AND enrollment_status IN ('active', 'completed')`,
      [userId]
    );
    
    const totalEnrollments = parseInt(courseCompletion.rows[0]?.total_enrollments || 0);
    const completedCourses = parseInt(courseCompletion.rows[0]?.completed_courses || 0);
    const courseCompletionRate = totalEnrollments > 0 
      ? (completedCourses / totalEnrollments) * 100 
      : 0;
    
    // 2. Calculate Assignment Completion Rate (25% weight)
    // Improved query with better error handling
    const assignmentCompletion = await client.query(
      `SELECT 
        COUNT(DISTINCT ca.id) as total_assignments,
        COUNT(CASE WHEN assignment_sub.status IN ('submitted', 'graded') THEN 1 END) as completed_assignments
      FROM course_assignments ca
      LEFT JOIN assignment_submissions assignment_sub ON ca.id = assignment_sub.assignment_id AND assignment_sub.student_id = $1
      WHERE ca.course_id IN (
        SELECT course_id FROM course_enrollments WHERE user_id = $1
      )`,
      [userId]
    ).catch((error) => {
      console.warn('Assignment completion query failed:', error.message);
      return { rows: [{ total_assignments: 0, completed_assignments: 0 }] };
    });
    
    const totalAssignments = parseInt(assignmentCompletion.rows[0]?.total_assignments || 0);
    const completedAssignments = parseInt(assignmentCompletion.rows[0]?.completed_assignments || 0);
    const assignmentCompletionRate = totalAssignments > 0 
      ? (completedAssignments / totalAssignments) * 100 
      : 0;
    
    // 3. Calculate Profile Completion Rate (15% weight)
    const profileData = await client.query(
      `SELECT 
        CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 ELSE 0 END +
        CASE WHEN last_name IS NOT NULL AND last_name != '' THEN 1 ELSE 0 END +
        CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 0 END +
        CASE WHEN bio IS NOT NULL AND bio != '' THEN 1 ELSE 0 END +
        CASE WHEN skill IS NOT NULL AND skill != '' THEN 1 ELSE 0 END +
        CASE WHEN avatar_url IS NOT NULL AND avatar_url != '' THEN 1 ELSE 0 END
        as completed_fields
      FROM users
      WHERE id = $1`,
      [userId]
    );
    
    const completedFields = parseInt(profileData.rows[0]?.completed_fields || 0);
    const profileCompletionRate = (completedFields / 6) * 100; // 6 fields total
    
    // 4. Get Skills Assessed Count (10% weight)
    const skillsData = await client.query(
      `SELECT 
        CASE 
          WHEN skill IS NOT NULL AND skill != '' THEN 1
          ELSE 0
        END as skills_count
      FROM users
      WHERE id = $1`,
      [userId]
    );
    
    const skillsCount = parseInt(skillsData.rows[0]?.skills_count || 0);
    // Normalize to 0-100 (assuming 10+ skills = 100%)
    // Note: skill is VARCHAR(100) single string, so we count 1 if filled, 0 if not
    const skillsScore = Math.min((skillsCount / 10) * 100, 100);
    
    // 5. Get Mentor Endorsements Count (10% weight)
    // Note: mentor_feedback table has rating (1-5) instead of endorsement boolean
    // Consider rating >= 4 as endorsement
    const mentorEndorsements = await client.query(
      `SELECT COUNT(*) as endorsement_count
      FROM mentor_feedback
      WHERE student_id = $1 AND rating >= 4`,
      [userId]
    ).catch(() => ({ rows: [{ endorsement_count: 0 }] }));
    
    const endorsementCount = parseInt(mentorEndorsements.rows[0]?.endorsement_count || 0);
    // Normalize to 0-100 (assuming 3+ endorsements = 100%)
    const endorsementScore = Math.min((endorsementCount / 3) * 100, 100);
    
    // Calculate weighted score
    const readinessScore = (
      (courseCompletionRate * 0.40) +
      (assignmentCompletionRate * 0.25) +
      (profileCompletionRate * 0.15) +
      (skillsScore * 0.10) +
      (endorsementScore * 0.10)
    );
    
    // Determine status
    let status = 'not_ready';
    if (readinessScore >= 71) {
      status = 'ready';
    } else if (readinessScore >= 41) {
      status = 'getting_ready';
    }
    
    // Insert or update readiness record
    const upsertResult = await client.query(
      `INSERT INTO placement_readiness (
        user_id, readiness_score, status,
        course_completion_rate, assignment_completion_rate,
        profile_completion_rate, skills_assessed_count,
        mentor_endorsements_count, last_calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        readiness_score = EXCLUDED.readiness_score,
        status = EXCLUDED.status,
        course_completion_rate = EXCLUDED.course_completion_rate,
        assignment_completion_rate = EXCLUDED.assignment_completion_rate,
        profile_completion_rate = EXCLUDED.profile_completion_rate,
        skills_assessed_count = EXCLUDED.skills_assessed_count,
        mentor_endorsements_count = EXCLUDED.mentor_endorsements_count,
        last_calculated_at = EXCLUDED.last_calculated_at,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        userId,
        Math.round(readinessScore * 100) / 100, // Round to 2 decimal places
        status,
        Math.round(courseCompletionRate * 100) / 100,
        Math.round(assignmentCompletionRate * 100) / 100,
        Math.round(profileCompletionRate * 100) / 100,
        skillsCount,
        endorsementCount
      ]
    );
    
    await client.query('COMMIT');
    
    return {
      id: upsertResult.rows[0].id,
      userId: upsertResult.rows[0].user_id,
      readinessScore: parseFloat(upsertResult.rows[0].readiness_score),
      status: upsertResult.rows[0].status,
      courseCompletionRate: parseFloat(upsertResult.rows[0].course_completion_rate),
      assignmentCompletionRate: parseFloat(upsertResult.rows[0].assignment_completion_rate),
      profileCompletionRate: parseFloat(upsertResult.rows[0].profile_completion_rate),
      skillsAssessedCount: parseInt(upsertResult.rows[0].skills_assessed_count),
      mentorEndorsementsCount: parseInt(upsertResult.rows[0].mentor_endorsements_count),
      lastCalculatedAt: upsertResult.rows[0].last_calculated_at
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error calculating readiness score:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get placement readiness for a user
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} Readiness object or null if not found
 */
export async function getReadiness(userId) {
  const result = await query(
    `SELECT * FROM placement_readiness WHERE user_id = $1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    readinessScore: parseFloat(row.readiness_score),
    status: row.status,
    courseCompletionRate: parseFloat(row.course_completion_rate),
    assignmentCompletionRate: parseFloat(row.assignment_completion_rate),
    profileCompletionRate: parseFloat(row.profile_completion_rate),
    skillsAssessedCount: parseInt(row.skills_assessed_count),
    mentorEndorsementsCount: parseInt(row.mentor_endorsements_count),
    lastCalculatedAt: row.last_calculated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Get readiness for multiple users
 * @param {string[]} userIds - Array of user UUIDs
 * @returns {Promise<Object>} Map of userId to readiness object
 */
export async function getReadinessForUsers(userIds) {
  if (!userIds || userIds.length === 0) {
    return {};
  }
  
  const result = await query(
    `SELECT * FROM placement_readiness WHERE user_id = ANY($1::uuid[])`,
    [userIds]
  );
  
  const readinessMap = {};
  result.rows.forEach(row => {
    readinessMap[row.user_id] = {
      id: row.id,
      userId: row.user_id,
      readinessScore: parseFloat(row.readiness_score),
      status: row.status,
      courseCompletionRate: parseFloat(row.course_completion_rate),
      assignmentCompletionRate: parseFloat(row.assignment_completion_rate),
      profileCompletionRate: parseFloat(row.profile_completion_rate),
      skillsAssessedCount: parseInt(row.skills_assessed_count),
      mentorEndorsementsCount: parseInt(row.mentor_endorsements_count),
      lastCalculatedAt: row.last_calculated_at
    };
  });
  
  return readinessMap;
}

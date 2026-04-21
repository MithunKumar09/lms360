/**
 * Course Enrollments Database Utilities
 * 
 * Provides CRUD operations for course enrollments.
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/courses/enrollments
 */

import { query, getClient } from '../index.js';

/**
 * Enroll a user in a course
 * @param {string} courseId - Course UUID
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Enrollment object
 */
export async function enrollUserInCourse(courseId, userId) {
  console.log('💾 [DB ENROLL] ===== ENROLL USER IN COURSE STARTED =====');
  console.log('💾 [DB ENROLL] Request:', { courseId, userId });
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Check if user is already enrolled
    const existingEnrollment = await client.query(
      `SELECT id, enrollment_status, enrolled_at, updated_at FROM course_enrollments 
       WHERE course_id = $1 AND user_id = $2`,
      [courseId, userId]
    );

    if (existingEnrollment.rows.length > 0) {
      const enrollment = existingEnrollment.rows[0];
      console.log('💾 [DB ENROLL] Existing enrollment found:', {
        enrollmentId: enrollment.id,
        status: enrollment.enrollment_status,
        enrolledAt: enrollment.enrolled_at,
        updatedAt: enrollment.updated_at,
      });
      
      // If enrollment exists but is dropped or suspended, reactivate it
      if (enrollment.enrollment_status === 'dropped' || enrollment.enrollment_status === 'suspended') {
        console.log('💾 [DB ENROLL] Reactivating dropped/suspended enrollment...');
        
        await client.query(
          `UPDATE course_enrollments 
           SET enrollment_status = 'active',
               enrolled_at = CURRENT_TIMESTAMP,
               last_accessed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [enrollment.id]
        );
        
        await client.query('COMMIT');
        
        const updatedEnrollment = await client.query(
          `SELECT * FROM course_enrollments WHERE id = $1`,
          [enrollment.id]
        );
        
        console.log('💾 [DB ENROLL] ✅ Enrollment reactivated:', {
          enrollmentId: updatedEnrollment.rows[0].id,
          status: updatedEnrollment.rows[0].enrollment_status,
          enrolledAt: updatedEnrollment.rows[0].enrolled_at,
          updatedAt: updatedEnrollment.rows[0].updated_at,
        });
        console.log('💾 [DB ENROLL] ✅ ===== ENROLL USER IN COURSE COMPLETED (REACTIVATED) =====');
        
        return updatedEnrollment.rows[0];
      }
      
      // If already enrolled and active, return existing enrollment
      console.log('💾 [DB ENROLL] ✅ User already enrolled and active');
      console.log('💾 [DB ENROLL] ✅ ===== ENROLL USER IN COURSE COMPLETED (EXISTING) =====');
      
      await client.query('COMMIT');
      return enrollment;
    }

    // Create new enrollment
    console.log('💾 [DB ENROLL] Creating new enrollment...');
    const enrollmentResult = await client.query(
      `INSERT INTO course_enrollments (
        course_id, user_id, enrollment_status, progress_percentage, 
        enrolled_at, last_accessed_at
      ) VALUES ($1, $2, 'active', 0.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [courseId, userId]
    );

    await client.query('COMMIT');
    
    const newEnrollment = enrollmentResult.rows[0];
    console.log('💾 [DB ENROLL] ✅ New enrollment created:', {
      enrollmentId: newEnrollment.id,
      courseId: newEnrollment.course_id,
      userId: newEnrollment.user_id,
      status: newEnrollment.enrollment_status,
      progressPercentage: newEnrollment.progress_percentage,
      enrolledAt: newEnrollment.enrolled_at,
      lastAccessedAt: newEnrollment.last_accessed_at,
    });
    console.log('💾 [DB ENROLL] ✅ ===== ENROLL USER IN COURSE COMPLETED (NEW) =====');
    
    return newEnrollment;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💾 [DB ENROLL] ❌ ===== ENROLL USER IN COURSE ERROR =====');
    console.error('💾 [DB ENROLL] Error:', error.message);
    console.error('💾 [DB ENROLL] Stack:', error.stack);
    console.error('💾 [DB ENROLL] Details:', { courseId, userId, errorCode: error.code, errorConstraint: error.constraint });
    
    // Handle duplicate enrollment error (shouldn't happen due to check, but just in case)
    if (error.code === '23505' && error.constraint === 'course_enrollments_course_id_user_id_key') {
      console.error('💾 [DB ENROLL] Duplicate enrollment detected');
      throw new Error('User is already enrolled in this course');
    }
    
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if user is enrolled in a course
 * @param {string} courseId - Course UUID
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} Enrollment object or null if not enrolled
 */
export async function checkEnrollment(courseId, userId) {
  console.log('🔍 [DB CHECK] Checking enrollment status...', { courseId, userId });
  
  try {
    const result = await query(
      `SELECT * FROM course_enrollments 
       WHERE course_id = $1 AND user_id = $2 AND enrollment_status = 'active'`,
      [courseId, userId]
    );
    
    if (result.rows.length === 0) {
      console.log('🔍 [DB CHECK] ❌ No active enrollment found');
      return null;
    }

    const enrollment = result.rows[0];
    console.log('🔍 [DB CHECK] ✅ Active enrollment found:', {
      enrollmentId: enrollment.id,
      courseId: enrollment.course_id,
      userId: enrollment.user_id,
      status: enrollment.enrollment_status,
      enrolledAt: enrollment.enrolled_at,
      progressPercentage: enrollment.progress_percentage,
    });

    return enrollment;
  } catch (error) {
    console.error('🔍 [DB CHECK] ❌ Error checking enrollment:', error);
    console.error('🔍 [DB CHECK] Details:', { courseId, userId, errorMessage: error.message });
    throw error;
  }
}

/**
 * Get first lesson ID for a course
 * @param {string} courseId - Course UUID
 * @returns {Promise<string|null>} First lesson ID or null if no lessons
 */
export async function getFirstLessonId(courseId) {
  try {
    const result = await query(
      `SELECT cl.id 
       FROM course_lessons cl
       JOIN course_chapters cc ON cl.chapter_id = cc.id
       JOIN course_modules cm ON cc.module_id = cm.id
       WHERE cm.course_id = $1
       ORDER BY cm.order_index, cc.order_index, cl.order_index
       LIMIT 1`,
      [courseId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].id;
  } catch (error) {
    console.error('Error getting first lesson:', error);
    throw error;
  }
}

/**
 * Get enrollment status for multiple courses
 * @param {string[]} courseIds - Array of course UUIDs
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Map of courseId -> enrollment status
 */
export async function getEnrollmentStatusForCourses(courseIds, userId) {
  try {
    if (!courseIds || courseIds.length === 0) {
      return {};
    }

    const placeholders = courseIds.map((_, index) => `$${index + 1}`).join(', ');
    const result = await query(
      `SELECT course_id, enrollment_status, enrolled_at
       FROM course_enrollments 
       WHERE course_id IN (${placeholders}) AND user_id = $${courseIds.length + 1} AND enrollment_status = 'active'`,
      [...courseIds, userId]
    );
    
    const enrollmentMap = {};
    result.rows.forEach(row => {
      enrollmentMap[row.course_id] = {
        isEnrolled: true,
        enrolledAt: row.enrolled_at,
        status: row.enrollment_status
      };
    });
    
    return enrollmentMap;
  } catch (error) {
    console.error('Error getting enrollment status for courses:', error);
    throw error;
  }
}


/**
 * Instructor Dashboard API Route
 * 
 * GET /api/instructors/dashboard - Get instructor dashboard statistics
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { getInstructorReviewStats } from '@/lib/db/instructors/reviews.js';

/**
 * GET /api/instructors/dashboard
 * 
 * Get instructor dashboard data including:
 * - Course statistics (total, active, enrolled, completed)
 * - Student count
 * - Feedback/review statistics
 * - Recent feedbacks (optional)
 */
export async function GET(request) {
  try {
    // Require instructor role
    const session = await requireRole(request, ['instructor', 'orginstructor']);
    const userId = session.user.id;
    const userOrgId = session.user.orgId;

    // Get instructor's assigned cohorts and subjects
    // This determines which courses the instructor has access to
    const instructorCohortsResult = await query(
      `SELECT DISTINCT cohort_id 
       FROM instructor_classes 
       WHERE instructor_user_id = $1
       UNION
       SELECT DISTINCT cohort_id 
       FROM user_class_subject_links 
       WHERE user_id = $1 AND link_type = 'instructor' AND cohort_id IS NOT NULL`,
      [userId]
    );
    
    const instructorSubjectsResult = await query(
      `SELECT DISTINCT so.subject_id
       FROM instructor_classes ic
       INNER JOIN subject_offerings so ON ic.subject_offering_id = so.id
       WHERE ic.instructor_user_id = $1 AND so.subject_id IS NOT NULL
       UNION
       SELECT DISTINCT so.subject_id
       FROM user_class_subject_links ucsl
       INNER JOIN subject_offerings so ON ucsl.subject_offering_id = so.id
       WHERE ucsl.user_id = $1 AND ucsl.link_type = 'instructor' AND so.subject_id IS NOT NULL`,
      [userId]
    );

    const instructorCohortIds = instructorCohortsResult.rows.map(row => row.cohort_id).filter(id => id);
    const instructorSubjectIds = instructorSubjectsResult.rows.map(row => row.subject_id).filter(id => id);

    // Build course filter based on instructor's assignments
    // Courses are linked to instructor through:
    // 1. Courses created by instructor (created_by = userId)
    // 2. Courses assigned to instructor's cohorts/subjects via course_assignments
    let courseFilterConditions = [];
    let courseFilterParams = [];
    let paramIndex = 1;

    // Always include courses created by the instructor
    courseFilterConditions.push(`c.created_by = $${paramIndex}`);
    courseFilterParams.push(userId);
    paramIndex++;

    // Also include courses assigned to instructor's cohorts/subjects
    if (instructorCohortIds.length > 0 || instructorSubjectIds.length > 0) {
      const assignmentConditions = [];
      
      if (instructorCohortIds.length > 0) {
        const cohortPlaceholders = instructorCohortIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
        assignmentConditions.push(`EXISTS (
          SELECT 1 FROM course_assignments ca
          WHERE ca.course_id = c.id
          AND ca.cohort_id IN (${cohortPlaceholders})
          AND ca.is_active = true
        )`);
        courseFilterParams.push(...instructorCohortIds);
        paramIndex += instructorCohortIds.length;
      }
      
      if (instructorSubjectIds.length > 0) {
        const subjectPlaceholders = instructorSubjectIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
        assignmentConditions.push(`EXISTS (
          SELECT 1 FROM course_assignments ca
          WHERE ca.course_id = c.id
          AND ca.subject_id IN (${subjectPlaceholders})
          AND ca.is_active = true
        )`);
        courseFilterParams.push(...instructorSubjectIds);
        paramIndex += instructorSubjectIds.length;
      }
      
      if (assignmentConditions.length > 0) {
        // Combine: courses created by instructor OR assigned to their cohorts/subjects
        courseFilterConditions[0] = `(${courseFilterConditions[0]} OR ${assignmentConditions.join(' OR ')})`;
      }
    }

    const courseFilter = `WHERE ${courseFilterConditions.join(' AND ')}`;

    // Total courses assigned to instructor's cohorts/subjects
    const totalCoursesQuery = `
      SELECT COUNT(DISTINCT c.id)::INTEGER as total
      FROM courses c
      ${courseFilter}
    `;

    // Active courses (published status)
    const activeCoursesQuery = `
      SELECT COUNT(DISTINCT c.id)::INTEGER as total
      FROM courses c
      ${courseFilter}
      AND c.status = 'published'
    `;

    // Enrolled courses count (courses with at least one active enrollment)
    const enrolledCoursesQuery = `
      SELECT COUNT(DISTINCT c.id)::INTEGER as total
      FROM courses c
      INNER JOIN course_enrollments ce ON c.id = ce.course_id
      ${courseFilter}
      AND ce.enrollment_status = 'active'
    `;

    // Completed courses (courses with completed enrollments)
    const completedCoursesQuery = `
      SELECT COUNT(DISTINCT c.id)::INTEGER as total
      FROM courses c
      INNER JOIN course_enrollments ce ON c.id = ce.course_id
      ${courseFilter}
      AND ce.enrollment_status = 'completed'
    `;

    // Total unique students enrolled in instructor's courses
    const totalStudentsQuery = `
      SELECT COUNT(DISTINCT ce.user_id)::INTEGER as total
      FROM course_enrollments ce
      INNER JOIN courses c ON ce.course_id = c.id
      ${courseFilter}
      AND ce.enrollment_status = 'active'
    `;

    // Execute all queries in parallel with course filter parameters
    const [
      totalCoursesResult,
      activeCoursesResult,
      enrolledCoursesResult,
      completedCoursesResult,
      totalStudentsResult
    ] = await Promise.all([
      query(totalCoursesQuery, courseFilterParams),
      query(activeCoursesQuery, courseFilterParams),
      query(enrolledCoursesQuery, courseFilterParams),
      query(completedCoursesQuery, courseFilterParams),
      query(totalStudentsQuery, courseFilterParams)
    ]);

    // Get review statistics
    let reviewStats = {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };

    try {
      reviewStats = await getInstructorReviewStats(userId);
    } catch (error) {
      console.error('Error fetching instructor review statistics:', error);
      // Continue with default stats if error
    }

    // Get recent feedbacks (last 5)
    let recentFeedbacks = [];
    try {
      const recentFeedbacksQuery = `
        SELECT 
          ir.id,
          ir.rating,
          ir.feedback_text,
          ir.created_at,
          u.first_name,
          u.last_name,
          u.email,
          u.avatar_url,
          COALESCE(
            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
            u.email
          ) as student_name
        FROM instructor_reviews ir
        JOIN users u ON ir.student_id = u.id
        WHERE ir.instructor_id = $1
        ORDER BY ir.created_at DESC
        LIMIT 5
      `;
      const recentResult = await query(recentFeedbacksQuery, [userId]);
      recentFeedbacks = recentResult.rows.map(review => ({
        id: review.id,
        rating: review.rating,
        feedbackText: review.feedback_text || '',
        createdAt: review.created_at,
        student: {
          name: review.student_name,
          email: review.email,
          photoUrl: review.avatar_url,
          firstName: review.first_name,
          lastName: review.last_name
        }
      }));
    } catch (error) {
      console.error('Error fetching recent feedbacks:', error);
      // Continue with empty array if error
    }

    return NextResponse.json({
      success: true,
      dashboard: {
        courses: {
          total: parseInt(totalCoursesResult.rows[0]?.total || 0, 10),
          active: parseInt(activeCoursesResult.rows[0]?.total || 0, 10),
          enrolled: parseInt(enrolledCoursesResult.rows[0]?.total || 0, 10),
          completed: parseInt(completedCoursesResult.rows[0]?.total || 0, 10)
        },
        students: {
          total: parseInt(totalStudentsResult.rows[0]?.total || 0, 10)
        },
        reviews: reviewStats,
        recentFeedbacks
      }
    });
  } catch (error) {
    console.error('Error fetching instructor dashboard:', error);
    
    // Handle specific error types
    let statusCode = error.status || 500;
    let errorMessage = 'Failed to fetch instructor dashboard';
    
    if (error.message?.includes('Forbidden') || error.message?.includes('Unauthorized')) {
      statusCode = error.status || 403;
      errorMessage = 'Access denied. Instructor role required.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: statusCode }
    );
  }
}

/**
 * Lesson Access Control Middleware
 * 
 * Checks if user has access to a lesson and tracks enrollment status.
 * Allows access to everyone but ensures proper enrollment tracking.
 */

import { query } from '@/lib/db/index.js';
import { hasPaidAccess } from '@/lib/utils/paymentAccess.js';
import { checkEnrollment, enrollUserInCourse } from '@/lib/db/courses/enrollments.js';

/**
 * Check if user has access to a lesson
 * @param {UUID} userId - User ID
 * @param {UUID} courseId - Course ID
 * @param {UUID} lessonId - Lesson ID (optional, for preview check)
 * @returns {Promise<Object>} Access check result
 */
export async function checkLessonAccess(userId, courseId, lessonId = null) {
  try {
    // Get course details (fixed: removed non-existent 'price' column)
    const courseResult = await query(
      `SELECT id, regular_price, discounted_price, status, created_by
       FROM courses WHERE id = $1`,
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return {
        hasAccess: false,
        reason: 'Course not found',
        statusCode: 404,
      };
    }

    const course = courseResult.rows[0];

    // Check if course is published
    if (course.status !== 'published') {
      return {
        hasAccess: false,
        reason: 'Course is not published',
        statusCode: 403,
      };
    }

    // Check if user is the course creator (instructor/vendor)
    if (course.created_by === userId) {
      // Ensure enrollment exists for tracking
      let enrollment = await checkEnrollment(courseId, userId);
      if (!enrollment) {
        try {
          enrollment = await enrollUserInCourse(courseId, userId);
        } catch (error) {
          // If enrollment fails, still allow access for creator
          console.warn('Failed to auto-enroll course creator:', error.message);
        }
      }
      
      return {
        hasAccess: true,
        reason: 'Course creator',
        isEnrolled: !!enrollment,
      };
    }

    // Check if lesson is a preview lesson
    if (lessonId) {
      const lessonResult = await query(
        `SELECT cl.id, cl.is_preview 
         FROM course_lessons cl
         JOIN course_chapters cc ON cl.chapter_id = cc.id
         JOIN course_modules cm ON cc.module_id = cm.id
         WHERE cl.id = $1 AND cm.course_id = $2`,
        [lessonId, courseId]
      );

      if (lessonResult.rows.length > 0 && lessonResult.rows[0].is_preview) {
        return {
          hasAccess: true,
          reason: 'Preview lesson',
        };
      }
    }

    // Determine if course is free
    const coursePrice = course.discounted_price > 0 ? course.discounted_price : course.regular_price;
    const isFree = !coursePrice || coursePrice === 0 || coursePrice === null;

    // Check if user is already enrolled
    let enrollment = await checkEnrollment(courseId, userId);

    if (isFree) {
      // Free course: Auto-enroll if not enrolled, always allow access
      if (!enrollment) {
        try {
          enrollment = await enrollUserInCourse(courseId, userId);
        } catch (error) {
          // If enrollment fails, log but still allow access for free courses
          console.warn('Failed to auto-enroll user in free course:', error.message);
        }
      }

      return {
        hasAccess: true,
        reason: 'Free course - auto enrolled',
        isEnrolled: !!enrollment,
        enrollmentType: 'free',
      };
    } else {
      // Paid course: Check if user has paid access OR is already enrolled
      const paidAccess = await hasPaidAccess(userId, 'course', courseId);
      
      if (paidAccess) {
        // User has paid: Ensure enrollment exists
        if (!enrollment) {
          try {
            enrollment = await enrollUserInCourse(courseId, userId);
          } catch (error) {
            console.warn('Failed to enroll user after payment:', error.message);
          }
        }

        return {
          hasAccess: true,
          reason: 'Paid access',
          isEnrolled: !!enrollment,
          enrollmentType: 'paid',
        };
      } else if (enrollment) {
        // User is enrolled but payment status unclear - allow access
        return {
          hasAccess: true,
          reason: 'Enrolled (access granted)',
          isEnrolled: true,
          enrollmentType: 'enrolled',
        };
      } else {
        // Paid course, no payment, no enrollment - deny access
        return {
          hasAccess: false,
          reason: 'Payment required',
          statusCode: 402, // Payment Required
          coursePrice,
        };
      }
    }
  } catch (error) {
    console.error('checkLessonAccess error:', error);
    return {
      hasAccess: false,
      reason: 'Error checking access',
      statusCode: 500,
    };
  }
}

/**
 * Middleware function for Next.js API routes
 * @param {Function} handler - API route handler
 * @returns {Function} Wrapped handler
 */
export function withLessonAccess(handler) {
  return async (request, context) => {
    const { params } = context;
    const courseId = params.id || params.courseId;
    const lessonId = params.lessonId;

    // Get user from session (assuming session is available in request)
    const session = request.session || (await import('@/lib/auth/guards.js').then(m => m.getSession(request)));
    
    if (!session || !session.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = session.user.id;
    const accessCheck = await checkLessonAccess(userId, courseId, lessonId);

    if (!accessCheck.hasAccess) {
      return new Response(
        JSON.stringify({
          success: false,
          error: accessCheck.reason,
          coursePrice: accessCheck.coursePrice,
        }),
        { 
          status: accessCheck.statusCode || 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Add access info to request for handler to use
    request.lessonAccess = accessCheck;
    
    return handler(request, context);
  };
}

export default checkLessonAccess;


/**
 * Course Enrollment API Route
 * 
 * POST /api/courses/[id]/enroll - Enroll a user in a course
 * GET /api/courses/[id]/enroll - Check enrollment status
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { enrollUserInCourse, checkEnrollment, getFirstLessonId } from '@/lib/db/courses/enrollments.js';
import { query } from '@/lib/db/index.js';

/**
 * POST /api/courses/[id]/enroll
 * Enroll a user in a course
 */
export async function POST(request, { params }) {
  try {
    // Authentication: Only students and alumni can enroll
    const session = await requireRole(request, ['student', 'alumni']);
    const userId = session.user.id;
    const courseId = params.id;

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Verify course exists and is published
    const courseCheck = await query(
      `SELECT id, title, regular_price, discounted_price, course_type_id,
              (SELECT name FROM course_types WHERE id = courses.course_type_id) as course_type_name
       FROM courses 
       WHERE id = $1 AND status = 'published'`,
      [courseId]
    );

    if (courseCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Course not found or not available for enrollment' },
        { status: 404 }
      );
    }

    const course = courseCheck.rows[0];
    
    // Determine if course is free
    const courseTypeName = course.course_type_name?.toLowerCase() || '';
    const isFree = courseTypeName === 'free' || 
                   (!course.regular_price || course.regular_price === 0) && 
                   (!course.discounted_price || course.discounted_price === 0);

    // Check if already enrolled
    const existingEnrollment = await checkEnrollment(courseId, userId);
    if (existingEnrollment) {
      // Get first lesson ID for navigation
      const firstLessonId = await getFirstLessonId(courseId);
      
      return NextResponse.json({
        success: true,
        message: 'Already enrolled in this course',
        enrollment: {
          id: existingEnrollment.id,
          courseId: existingEnrollment.course_id,
          userId: existingEnrollment.user_id,
          enrolledAt: existingEnrollment.enrolled_at,
          status: existingEnrollment.enrollment_status,
        },
        firstLessonId,
      });
    }

    // For paid courses, check if user has a paid order
    if (!isFree) {
      console.log('📚 [ENROLL API] Checking for paid order...', {
        userId,
        courseId,
      });
      
      // First, check for ANY order (paid or pending) to see what exists
      const allOrdersCheck = await query(
        `SELECT id, status, razorpay_order_id, created_at, updated_at, item_type, item_id 
         FROM orders
         WHERE user_id = $1 AND item_type = 'course' AND item_id = $2
         ORDER BY created_at DESC
         LIMIT 5`,
        [userId, courseId]
      );
      
      if (allOrdersCheck.rows.length > 0) {
        console.log('📚 [ENROLL API] Found orders for this course:', {
          totalOrders: allOrdersCheck.rows.length,
          orders: allOrdersCheck.rows.map(order => ({
            id: order.id,
            status: order.status,
            razorpayOrderId: order.razorpay_order_id,
            createdAt: order.created_at,
            updatedAt: order.updated_at,
          })),
        });
      } else {
        console.log('📚 [ENROLL API] No orders found for this course at all');
      }
      
      // Now check specifically for paid orders
      const paymentCheck = await query(
        `SELECT id, status, razorpay_order_id, created_at, updated_at FROM orders
         WHERE user_id = $1 AND item_type = 'course' AND item_id = $2 AND status = 'paid'
         LIMIT 1`,
        [userId, courseId]
      );

      if (paymentCheck.rows.length === 0) {
        console.log('📚 [ENROLL API] ❌ No paid order found for course enrollment');
        if (allOrdersCheck.rows.length > 0) {
          console.log('📚 [ENROLL API] ⚠️ Orders exist but none are in "paid" status. Latest order status:', allOrdersCheck.rows[0].status);
        }
        return NextResponse.json(
          {
            success: false,
            error: 'Payment required. Please complete payment to enroll in this course.',
            requiresPayment: true,
            course: {
              id: course.id,
              title: course.title,
              isFree: false,
            },
          },
          { status: 402 } // 402 Payment Required
        );
      }

      console.log('📚 [ENROLL API] ✅ Paid order found:', {
        orderId: paymentCheck.rows[0].id,
        status: paymentCheck.rows[0].status,
        createdAt: paymentCheck.rows[0].created_at,
        updatedAt: paymentCheck.rows[0].updated_at,
      });
    }

    // Enroll user
    console.log('📚 [ENROLL API] Enrolling user in course...', {
      courseId,
      userId,
      isFree,
    });
    
    const enrollment = await enrollUserInCourse(courseId, userId);
    
    console.log('📚 [ENROLL API] ✅ Enrollment completed:', {
      enrollmentId: enrollment.id,
      courseId: enrollment.course_id,
      userId: enrollment.user_id,
      status: enrollment.enrollment_status,
      enrolledAt: enrollment.enrolled_at,
    });

    // Get first lesson ID for navigation
    const firstLessonId = await getFirstLessonId(courseId);

    return NextResponse.json({
      success: true,
      message: 'Successfully enrolled in course',
      enrollment: {
        id: enrollment.id,
        courseId: enrollment.course_id,
        userId: enrollment.user_id,
        enrolledAt: enrollment.enrolled_at,
        status: enrollment.enrollment_status,
      },
      course: {
        id: course.id,
        title: course.title,
        isFree,
      },
      firstLessonId,
    });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to enroll in course',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * GET /api/courses/[id]/enroll
 * Check enrollment status for a course
 */
export async function GET(request, { params }) {
  try {
    // Authentication: Only students and alumni can check enrollment
    const session = await requireRole(request, ['student', 'alumni']);
    const userId = session.user.id;
    const courseId = params.id;

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Check enrollment status
    console.log('📚 [ENROLL API] GET - Checking enrollment status...', {
      courseId,
      userId,
    });
    
    const enrollment = await checkEnrollment(courseId, userId);

    if (!enrollment) {
      console.log('📚 [ENROLL API] GET - ❌ User not enrolled');
      return NextResponse.json({
        success: true,
        isEnrolled: false,
      });
    }

    console.log('📚 [ENROLL API] GET - ✅ User is enrolled:', {
      enrollmentId: enrollment.id,
      courseId: enrollment.course_id,
      userId: enrollment.user_id,
      status: enrollment.enrollment_status,
      enrolledAt: enrollment.enrolled_at,
      progressPercentage: enrollment.progress_percentage,
    });

    // Get first lesson ID for navigation
    const firstLessonId = await getFirstLessonId(courseId);
    
    if (firstLessonId) {
      console.log('📚 [ENROLL API] GET - First lesson ID:', firstLessonId);
    }

    return NextResponse.json({
      success: true,
      isEnrolled: true,
      enrollment: {
        id: enrollment.id,
        courseId: enrollment.course_id,
        userId: enrollment.user_id,
        enrolledAt: enrollment.enrolled_at,
        status: enrollment.enrollment_status,
        progressPercentage: enrollment.progress_percentage,
      },
      firstLessonId,
    });
  } catch (error) {
    console.error('Error checking enrollment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check enrollment status',
      },
      { status: error.status || 500 }
    );
  }
}


/**
 * Enrolled Courses API Route
 * 
 * GET /api/students/enrolled-courses - Get all courses student is enrolled in
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { calculateStudentCourseProgress } from '@/lib/services/courseProgress.js';
import { formatLessonCount, formatCourseDuration } from '@/lib/utils/courseUtils.js';

/**
 * GET /api/students/enrolled-courses
 * Get all courses student is enrolled in with progress
 * For parents: Get courses for their linked children
 */
export async function GET(request) {
  try {
    // Authentication: Students, alumni, and parents can access
    const session = await requireRole(request, ['student', 'alumni', 'parent']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const userRole = session.user.role;
    const orgId = session.user.orgId;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const offset = (page - 1) * limit;
    const status = searchParams.get('status'); // 'active' or 'completed'

    // For parents, get their linked children's user IDs
    let studentUserIds = [userId]; // Default to own user ID for students/alumni
    if (userRole === 'parent') {
      const parentStudentsResult = await query(
        `SELECT DISTINCT student_user_id 
         FROM parent_student_links 
         WHERE parent_user_id = $1 AND org_id = $2`,
        [userId, orgId]
      );
      studentUserIds = Array.isArray(parentStudentsResult?.rows)
        ? parentStudentsResult.rows
            .filter(row => row && typeof row === 'object' && row.student_user_id)
            .map(row => row.student_user_id)
        : [];
      
      // If parent has no linked children, return empty result
      if (studentUserIds.length === 0) {
        return NextResponse.json({
          success: true,
          courses: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }
    }

    // Build query conditions
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // For parents, use IN clause; for students/alumni, use single user_id
    if (studentUserIds.length === 1) {
      whereConditions.push(`ce.user_id = $${paramIndex}`);
      queryParams.push(studentUserIds[0]);
      paramIndex++;
    } else {
      // Multiple student IDs (parent viewing multiple children)
      const placeholders = studentUserIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
      whereConditions.push(`ce.user_id IN (${placeholders})`);
      queryParams.push(...studentUserIds);
      paramIndex += studentUserIds.length;
    }

    whereConditions.push(`ce.enrollment_status = 'active'`);
    whereConditions.push(`c.status = 'published'`);

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    // For parents viewing multiple children, count each course enrollment separately
    // For students/alumni, count distinct courses (one enrollment per course)
    const countQuery = userRole === 'parent' 
      ? `
        SELECT COUNT(*) as total
        FROM course_enrollments ce
        JOIN courses c ON ce.course_id = c.id
        ${whereClause}
      `
      : `
        SELECT COUNT(DISTINCT c.id) as total
        FROM course_enrollments ce
        JOIN courses c ON ce.course_id = c.id
        ${whereClause}
      `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(
      (Array.isArray(countResult?.rows) && countResult.rows[0]?.total) || 0,
      10
    );

    // Get enrolled courses with pagination
    // Note: For parents, we may have multiple rows per course (one per child)
    // For students/alumni, we have one row per course per user
    const coursesQuery = `
      SELECT
        c.id,
        c.title,
        c.slug,
        c.description,
        c.intro_video_url,
        c.cover_image_url,
        c.regular_price,
        c.discounted_price,
        c.status,
        c.created_at,
        c.updated_at,
        cc.name as category_name,
        ct.name as course_type_name,
        cl.name as course_level_name,
        pt.name as program_type_name,
        ce.user_id as student_user_id,
        ce.enrolled_at,
        ce.progress_percentage,
        (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id AND enrollment_status = 'active') as enrolled_count,
        -- Get total lessons count
        (
          SELECT COUNT(*)
          FROM course_lessons cl
          WHERE cl.chapter_id IN (
            SELECT id FROM course_chapters cc
            WHERE cc.module_id IN (
              SELECT id FROM course_modules cm
              WHERE cm.course_id = c.id
            )
          )
        ) as total_lessons,
        -- Get total duration in seconds
        (
          SELECT COALESCE(SUM(cl.duration), 0)
          FROM course_lessons cl
          JOIN course_chapters cc ON cl.chapter_id = cc.id
          JOIN course_modules cm ON cc.module_id = cm.id
          WHERE cm.course_id = c.id
        ) as total_duration_seconds,
        -- Get ratings
        (
          SELECT json_build_object(
            'averageRating', COALESCE(AVG(rating)::NUMERIC(10,2), 0),
            'totalReviews', COUNT(*)
          )
          FROM course_reviews
          WHERE course_id = c.id
        ) as ratings,
        -- Get instructors
        (
          SELECT json_agg(
            json_build_object(
              'id', u.id,
              'name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email),
              'email', u.email,
              'firstName', u.first_name,
              'lastName', u.last_name,
              'avatarUrl', u.avatar_url,
              'avatar_url', u.avatar_url,
              'profileUrl', u.avatar_url,
              'profile_url', u.avatar_url
            )
          )
          FROM course_instructors ci
          JOIN users u ON ci.instructor_id = u.id
          WHERE ci.course_id = c.id
        ) as instructors
      FROM course_enrollments ce
      JOIN courses c ON ce.course_id = c.id
      LEFT JOIN course_categories cc ON c.category_id = cc.id
      LEFT JOIN course_types ct ON c.course_type_id = ct.id
      LEFT JOIN course_levels cl ON c.course_level_id = cl.id
      LEFT JOIN program_types pt ON c.program_type_id = pt.id
      ${whereClause}
      ORDER BY ce.enrolled_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    const coursesResult = await query(coursesQuery, queryParams);

    // Transform courses and calculate progress
    const courses = await Promise.all(
      (Array.isArray(coursesResult?.rows) ? coursesResult.rows : [])
        .filter(row => row && typeof row === 'object')
        .map(async (row) => {
        // For parents, use the student_user_id from the enrollment; for students/alumni, use userId
        const studentIdForProgress = userRole === 'parent' ? row.student_user_id : userId;
        
        // Calculate progress for each course
        let progress = null;
        try {
          progress = await calculateStudentCourseProgress(studentIdForProgress, row.id);
        } catch (error) {
          console.error(`Error calculating progress for course ${row.id}:`, error);
          // Use enrollment progress_percentage as fallback
          progress = {
            progressPercentage: parseFloat(row.progress_percentage || 0),
            isCompleted: false,
          };
        }

        // Parse ratings
        const ratingsData = row.ratings || {};
        const averageRating = parseFloat(ratingsData.averageRating || 0);
        const totalReviews = parseInt(ratingsData.totalReviews || 0, 10);

        // Parse lesson count and duration
        const totalLessons = parseInt(row.total_lessons || 0, 10);
        const totalDurationSeconds = parseInt(row.total_duration_seconds || 0, 10);
        const totalDurationMinutes = Math.floor(totalDurationSeconds / 60); // Convert seconds to minutes

        const course = {
          id: row.id,
          title: row.title,
          slug: row.slug,
          description: row.description,
          thumbnailUrl: row.intro_video_url,
          coverImageUrl: row.cover_image_url || null,
          regularPrice: parseFloat(row.regular_price || 0),
          discountedPrice: parseFloat(row.discounted_price || 0),
          price: parseFloat(row.discounted_price || row.regular_price || 0),
          originalPrice: parseFloat(row.regular_price || 0),
          status: row.status,
          categoryName: row.category_name,
          courseTypeName: row.course_type_name,
          courseLevelName: row.course_level_name,
          programTypeName: row.program_type_name,
          enrolledAt: row.enrolled_at,
          enrolledCount: parseInt(row.enrolled_count || 0, 10),
          // For parents, include which student this course belongs to
          ...(userRole === 'parent' && { studentUserId: row.student_user_id }),
          isFree: (row.course_type_name?.toLowerCase() === 'free' || 
                   (!row.regular_price || row.regular_price === 0) && 
                   (!row.discounted_price || row.discounted_price === 0)),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          progress: progress.progressPercentage,
          isCompleted: progress.isCompleted,
          isActive: !progress.isCompleted && progress.progressPercentage > 0,
          instructors: row.instructors || [],
          instructorCount: row.instructors ? row.instructors.length : 0,
          // Add ratings
          averageRating,
          totalReviews,
          // Add lesson count (formatted)
          formattedLessonCount: formatLessonCount(totalLessons),
          lesson: formatLessonCount(totalLessons), // Fallback for old format
          // Add duration (formatted)
          formattedDuration: formatCourseDuration(totalDurationMinutes),
          duration: formatCourseDuration(totalDurationMinutes), // Fallback for old format
        };

        return course;
      })
    );

    // Filter by status if provided
    let filteredCourses = courses;
    if (status === 'completed') {
      filteredCourses = courses.filter(c => c.isCompleted);
    } else if (status === 'active') {
      filteredCourses = courses.filter(c => !c.isCompleted);
    }

    // Recalculate total if filtered
    const filteredTotal = status ? filteredCourses.length : total;

    return NextResponse.json({
      success: true,
      courses: filteredCourses,
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch enrolled courses',
      },
      { status: error.status || 500 }
    );
  }
}


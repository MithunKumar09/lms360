/**
 * Active Courses API Route
 * 
 * GET /api/students/active-courses - Get courses available to student via class/subject assignments
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { checkEnrollment } from '@/lib/db/courses/enrollments.js';
import { formatLessonCount, formatCourseDuration } from '@/lib/utils/courseUtils.js';

/**
 * GET /api/students/active-courses
 * Get courses available to student via class/subject assignments
 */
export async function GET(request) {
  try {
    // Authentication: Only students and alumni can access
    const session = await requireRole(request, ['student', 'alumni']);
    
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
    const userOrgId = session.user.orgId || null;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const offset = (page - 1) * limit;
    const programTypeId = searchParams.get('program_type_id'); // Optional program type filter

    // Get student's organization from user record (fallback to session orgId)
    let studentOrgId = userOrgId;
    if (!studentOrgId) {
      const userResult = await query(
        `SELECT org_id FROM users WHERE id = $1`,
        [userId]
      );
      studentOrgId = (Array.isArray(userResult?.rows) && userResult.rows[0]?.org_id) || null;
    }

    // Get student's cohorts (classes) from user_class_subject_links
    const studentCohortsResult = await query(
      `SELECT DISTINCT cohort_id
       FROM user_class_subject_links
       WHERE user_id = $1 AND link_type = 'student' AND cohort_id IS NOT NULL`,
      [userId]
    );

    // Get student's subjects from user_class_subject_links
    const studentSubjectsResult = await query(
      `SELECT DISTINCT so.subject_id
       FROM user_class_subject_links ucsl
       JOIN subject_offerings so ON ucsl.subject_offering_id = so.id
       WHERE ucsl.user_id = $1 AND ucsl.link_type = 'student' AND so.subject_id IS NOT NULL`,
      [userId]
    );

    const cohortIds = Array.isArray(studentCohortsResult?.rows)
      ? studentCohortsResult.rows
          .filter(row => row && typeof row === 'object')
          .map(row => row.cohort_id)
          .filter(Boolean)
      : [];
    const subjectIds = Array.isArray(studentSubjectsResult?.rows)
      ? studentSubjectsResult.rows
          .filter(row => row && typeof row === 'object')
          .map(row => row.subject_id)
          .filter(Boolean)
      : [];

    // Build query conditions
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Course must be published
    whereConditions.push(`c.status = 'published'`);

    // Course must match student's organization (or be global/null)
    // If student has an organization, show courses from their org OR global courses (org_id IS NULL)
    if (studentOrgId) {
      whereConditions.push(`(c.org_id = $${paramIndex} OR c.org_id IS NULL)`);
      queryParams.push(studentOrgId);
      paramIndex++;
    } else {
      // If student has no organization, only show global courses
      whereConditions.push(`c.org_id IS NULL`);
    }

    // Filter by program type if provided
    if (programTypeId) {
      whereConditions.push(`c.program_type_id = $${paramIndex}`);
      queryParams.push(programTypeId);
      paramIndex++;
    }

    // Course must match student's cohorts OR subjects via course_assignments
    if (cohortIds.length > 0 || subjectIds.length > 0) {
      const matchConditions = [];

      if (cohortIds.length > 0) {
        const cohortPlaceholders = cohortIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
        matchConditions.push(`EXISTS (
          SELECT 1 FROM course_assignments ca
          WHERE ca.course_id = c.id
          AND ca.cohort_id IN (${cohortPlaceholders})
          AND ca.is_active = true
        )`);
        queryParams.push(...cohortIds);
        paramIndex += cohortIds.length;
      }

      if (subjectIds.length > 0) {
        const subjectPlaceholders = subjectIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
        matchConditions.push(`EXISTS (
          SELECT 1 FROM course_assignments ca
          WHERE ca.course_id = c.id
          AND ca.subject_id IN (${subjectPlaceholders})
          AND ca.is_active = true
        )`);
        queryParams.push(...subjectIds);
        paramIndex += subjectIds.length;
      }

      if (matchConditions.length > 0) {
        whereConditions.push(`(${matchConditions.join(' OR ')})`);
      }
    } else {
      // If student has no cohorts/subjects, return empty result
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

    // Get enrolled course IDs to exclude
    const enrolledCoursesResult = await query(
      `SELECT course_id FROM course_enrollments
       WHERE user_id = $1 AND enrollment_status = 'active'`,
      [userId]
    );
    const enrolledCourseIds = Array.isArray(enrolledCoursesResult?.rows)
      ? enrolledCoursesResult.rows
          .filter(row => row && typeof row === 'object')
          .map(row => row.course_id)
          .filter(Boolean)
      : [];

    if (enrolledCourseIds.length > 0) {
      const enrolledPlaceholders = enrolledCourseIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
      whereConditions.push(`c.id NOT IN (${enrolledPlaceholders})`);
      queryParams.push(...enrolledCourseIds);
      paramIndex += enrolledCourseIds.length;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM courses c
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(
      (Array.isArray(countResult?.rows) && countResult.rows[0]?.total) || 0,
      10
    );

    // Get courses with pagination
    // Use GROUP BY instead of DISTINCT to handle JSON columns
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
        MAX(cc.name) as category_name,
        MAX(ct.name) as course_type_name,
        MAX(cl.name) as course_level_name,
        MAX(pt.name) as program_type_name,
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
      FROM courses c
      LEFT JOIN course_categories cc ON c.category_id = cc.id
      LEFT JOIN course_types ct ON c.course_type_id = ct.id
      LEFT JOIN course_levels cl ON c.course_level_id = cl.id
      LEFT JOIN program_types pt ON c.program_type_id = pt.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY MAX(c.created_at) DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    const coursesResult = await query(coursesQuery, queryParams);

    // Transform courses
    const courses = Array.isArray(coursesResult?.rows)
      ? coursesResult.rows
          .filter(row => row && typeof row === 'object')
          .map(row => {
      // Parse ratings
      const ratingsData = row.ratings || {};
      const averageRating = parseFloat(ratingsData.averageRating || 0);
      const totalReviews = parseInt(ratingsData.totalReviews || 0, 10);

      // Parse lesson count and duration
      const totalLessons = parseInt(row.total_lessons || 0, 10);
      const totalDurationSeconds = parseInt(row.total_duration_seconds || 0, 10);
      const totalDurationMinutes = Math.floor(totalDurationSeconds / 60); // Convert seconds to minutes

      return {
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
        enrolledCount: parseInt(row.enrolled_count || 0, 10),
        isFree: (row.course_type_name?.toLowerCase() === 'free' || 
                 (!row.regular_price || row.regular_price === 0) && 
                 (!row.discounted_price || row.discounted_price === 0)),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
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
    })
      : [];

    return NextResponse.json({
      success: true,
      courses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching active courses:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch active courses',
      },
      { status: error.status || 500 }
    );
  }
}


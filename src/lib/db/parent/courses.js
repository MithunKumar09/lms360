/**
 * Parent Student Courses Database Utilities
 * 
 * Provides queries for student courses visible to parents.
 * Respects access permissions and filters by linked children.
 * 
 * @module db/parent/courses
 */

import { query } from '../index.js';
import { calculateStudentCourseProgress } from '@/lib/services/courseProgress.js';
import { formatLessonCount, formatCourseDuration } from '@/lib/utils/courseUtils.js';

/**
 * Get student courses (enrolled/active/completed)
 * @param {string} studentId - Student user UUID
 * @param {Object} filters - Filter parameters (page, limit, status)
 * @returns {Promise<Object>} Courses data with pagination
 */
export async function getStudentCourses(studentId, filters = {}) {
  const { page = 1, limit = 12, status } = filters;
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const whereConditions = ['ce.user_id = $1'];
  const queryParams = [studentId];
  let paramIndex = 2;

  whereConditions.push(`ce.enrollment_status = 'active'`);
  whereConditions.push(`c.status = 'published'`);

  if (status === 'completed') {
    whereConditions.push(`ce.enrollment_status = 'completed'`);
  } else if (status === 'active') {
    whereConditions.push(`ce.enrollment_status = 'active' AND ce.progress_percentage < 100`);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Get total count
  const countQuery = `
    SELECT COUNT(DISTINCT c.id) as total
    FROM course_enrollments ce
    JOIN courses c ON ce.course_id = c.id
    ${whereClause}
  `;
  const countResult = await query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0]?.total || 0, 10);

  // Get courses with pagination
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
      ce.enrolled_at,
      ce.progress_percentage,
      ce.completed_at,
      (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id AND enrollment_status = 'active') as enrolled_count,
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
      (
        SELECT COALESCE(SUM(cl.duration), 0)
        FROM course_lessons cl
        JOIN course_chapters cc ON cl.chapter_id = cc.id
        JOIN course_modules cm ON cc.module_id = cm.id
        WHERE cm.course_id = c.id
      ) as total_duration_seconds,
      (
        SELECT json_build_object(
          'averageRating', COALESCE(AVG(rating)::NUMERIC(10,2), 0),
          'totalReviews', COUNT(*)
        )
        FROM course_reviews
        WHERE course_id = c.id
      ) as ratings,
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
    coursesResult.rows.map(async (row) => {
      // Calculate progress for each course
      let progress = null;
      try {
        progress = await calculateStudentCourseProgress(studentId, row.id);
      } catch (error) {
        console.error(`Error calculating progress for course ${row.id}:`, error);
        progress = {
          progressPercentage: parseFloat(row.progress_percentage || 0),
          isCompleted: row.enrollment_status === 'completed',
        };
      }

      // Parse ratings
      const ratingsData = row.ratings || {};
      const averageRating = parseFloat(ratingsData.averageRating || 0);
      const totalReviews = parseInt(ratingsData.totalReviews || 0, 10);

      // Parse lesson count and duration
      const totalLessons = parseInt(row.total_lessons || 0, 10);
      const totalDurationSeconds = parseInt(row.total_duration_seconds || 0, 10);
      const totalDurationMinutes = Math.floor(totalDurationSeconds / 60);

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
        isFree: (row.course_type_name?.toLowerCase() === 'free' || 
                 (!row.regular_price || row.regular_price === 0) && 
                 (!row.discounted_price || row.discounted_price === 0)),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        progress: progress.progressPercentage,
        isCompleted: progress.isCompleted || row.enrollment_status === 'completed',
        isActive: !progress.isCompleted && progress.progressPercentage > 0,
        instructors: row.instructors || [],
        instructorCount: row.instructors ? row.instructors.length : 0,
        averageRating,
        totalReviews,
        formattedLessonCount: formatLessonCount(totalLessons),
        lesson: formatLessonCount(totalLessons),
        formattedDuration: formatCourseDuration(totalDurationMinutes),
        duration: formatCourseDuration(totalDurationMinutes),
      };

      return course;
    })
  );

  // Filter by status if provided (for completed/active distinction)
  let filteredCourses = courses;
  if (status === 'completed') {
    filteredCourses = courses.filter(c => c.isCompleted);
  } else if (status === 'active') {
    filteredCourses = courses.filter(c => !c.isCompleted);
  }

  const filteredTotal = status ? filteredCourses.length : total;

  return {
    courses: filteredCourses,
    pagination: {
      page,
      limit,
      total: filteredTotal,
      totalPages: Math.ceil(filteredTotal / limit),
    },
  };
}

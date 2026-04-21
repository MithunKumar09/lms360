/**
 * Roadmap API Route
 * 
 * GET /api/students/roadmap - Get roadmap data for authenticated student
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { calculateStudentCourseProgress } from '@/lib/services/courseProgress.js';
import { 
  calculateCourseMilestones,
  getCourseMilestones,
  getStampCount,
  checkMilestoneCompletion
} from '@/lib/services/roadmapMilestones.js';
import { formatLessonCount, formatCourseDuration } from '@/lib/utils/courseUtils.js';

/**
 * GET /api/students/roadmap
 * Get roadmap data for authenticated student
 * Returns enrolled courses with milestones and progress
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

    // Fetch enrolled courses
    const enrolledCoursesQuery = `
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
      WHERE ce.user_id = $1 
        AND ce.enrollment_status = 'active'
        AND c.status = 'published'
      ORDER BY ce.enrolled_at DESC
    `;
    const coursesResult = await query(enrolledCoursesQuery, [userId]);

    // Process each course with milestones
    const courses = await Promise.all(
      (Array.isArray(coursesResult?.rows) ? coursesResult.rows : [])
        .filter(row => row && typeof row === 'object')
        .map(async (row) => {
        const courseId = row.id;

        // Calculate/retrieve milestones for this course
        let milestonesData;
        try {
          // First, ensure milestones exist (calculate if needed)
          await calculateCourseMilestones(courseId, userId);
          
          // Get milestones
          const milestoneRecords = await getCourseMilestones(userId, courseId);
          
          // Get module/quiz/assignment titles for milestones
          const milestones = await Promise.all(
            milestoneRecords.map(async (milestone) => {
              let title = `Milestone ${milestone.milestone_number}`;
              
              // Get title based on type
              if (milestone.milestone_type === 'module' && milestone.milestone_reference_id) {
                const moduleResult = await query(
                  `SELECT title FROM course_modules WHERE id = $1`,
                  [milestone.milestone_reference_id]
                );
                title = (Array.isArray(moduleResult?.rows) && moduleResult.rows[0]?.title) || title;
              } else if (milestone.milestone_type === 'quiz' && milestone.milestone_reference_id) {
                const quizResult = await query(
                  `SELECT title FROM quizzes WHERE id = $1`,
                  [milestone.milestone_reference_id]
                );
                title = `Quiz: ${(Array.isArray(quizResult?.rows) && quizResult.rows[0]?.title) || 'Quiz'}`;
              } else if (milestone.milestone_type === 'assignment' && milestone.milestone_reference_id) {
                const assignmentResult = await query(
                  `SELECT title FROM assignments WHERE id = $1`,
                  [milestone.milestone_reference_id]
                );
                title = `Assignment: ${(Array.isArray(assignmentResult?.rows) && assignmentResult.rows[0]?.title) || 'Assignment'}`;
              } else if (milestone.milestone_type === 'progress') {
                const threshold = milestone.milestone_number === 1 ? 25 :
                                 milestone.milestone_number === 2 ? 50 :
                                 milestone.milestone_number === 3 ? 75 : 100;
                title = `${threshold}% Progress`;
              } else if (milestone.milestone_type === 'completion') {
                title = 'Course Completion';
              }

              // Check if stamp is awarded and get stamp type
              let stampType = null;
              if (milestone.stamp_awarded) {
                const stampResult = await query(
                  `SELECT stamp_type FROM student_stamps WHERE milestone_id = $1`,
                  [milestone.id]
                );
                stampType = (Array.isArray(stampResult?.rows) && stampResult.rows[0]?.stamp_type) || null;
              }

              return {
                number: milestone.milestone_number,
                type: milestone.milestone_type,
                title,
                referenceId: milestone.milestone_reference_id,
                completed: milestone.completed_at !== null,
                completedAt: milestone.completed_at,
                stampAwarded: milestone.stamp_awarded,
                stampType,
              };
            })
          );

          milestonesData = {
            milestones,
            totalMilestones: milestones.length,
            completedMilestones: milestones.filter(m => m.completed).length,
          };
        } catch (error) {
          console.error(`Error getting milestones for course ${courseId}:`, error);
          milestonesData = {
            milestones: [],
            totalMilestones: 0,
            completedMilestones: 0,
          };
        }

        // Calculate progress
        let progress = null;
        try {
          progress = await calculateStudentCourseProgress(userId, courseId);
        } catch (error) {
          console.error(`Error calculating progress for course ${courseId}:`, error);
          progress = {
            progressPercentage: parseFloat(row.progress_percentage || 0),
            isCompleted: false,
          };
        }

        // Get stamp count
        let stampCount = 0;
        try {
          stampCount = await getStampCount(userId, courseId);
        } catch (error) {
          console.error(`Error getting stamp count for course ${courseId}:`, error);
        }

        // Parse ratings
        const ratingsData = row.ratings || {};
        const averageRating = parseFloat(ratingsData.averageRating || 0);
        const totalReviews = parseInt(ratingsData.totalReviews || 0, 10);

        // Parse lesson count and duration
        const totalLessons = parseInt(row.total_lessons || 0, 10);
        const totalDurationSeconds = parseInt(row.total_duration_seconds || 0, 10);
        const totalDurationMinutes = Math.floor(totalDurationSeconds / 60);

        return {
          id: courseId,
          title: row.title,
          slug: row.slug,
          description: row.description,
          coverImageUrl: row.cover_image_url || null,
          progress: progress.progressPercentage,
          isCompleted: progress.isCompleted,
          milestones: milestonesData.milestones,
          totalMilestones: milestonesData.totalMilestones,
          completedMilestones: milestonesData.completedMilestones,
          stampCount,
          enrolledAt: row.enrolled_at,
          enrolledCount: parseInt(row.enrolled_count || 0, 10),
          averageRating,
          totalReviews,
          formattedLessonCount: formatLessonCount(totalLessons),
          formattedDuration: formatCourseDuration(totalDurationMinutes),
        };
      })
    );

    // Calculate summary statistics
    const totalMilestones = courses.reduce((sum, course) => sum + (course.totalMilestones || 0), 0);
    const completedMilestones = courses.reduce((sum, course) => sum + (course.completedMilestones || 0), 0);
    const totalStamps = courses.reduce((sum, course) => sum + (course.stampCount || 0), 0);
    
    // Calculate overall progress percentage
    const overallProgress = totalMilestones === 0 
      ? 0 
      : Math.min(100, Math.round((completedMilestones / totalMilestones) * 100));

    // Get cohort configuration for totalYears
    // Default to 4 if not available
    let totalYears = 4;
    try {
      // Try to get student's cohort years if available
      // This assumes the cohort data is available from course data or a separate query
      const cohortYears = new Set();
      courses.forEach(course => {
        if (course.year) {
          cohortYears.add(course.year);
        }
      });
      // Use the maximum year found, or default to 4
      totalYears = cohortYears.size > 0 ? Math.max(...Array.from(cohortYears)) : 4;
    } catch (error) {
      console.warn('Could not determine cohort years, using default:', error);
      totalYears = 4;
    }

    const summary = {
      totalYears,
      completedMilestones,
      totalMilestones,
      overallProgress,
      totalStamps,
    };

    // Cache response for 30 seconds
    return NextResponse.json(
      {
        success: true,
        courses,
        summary,
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch roadmap data',
      },
      { status: error.status || 500 }
    );
  }
}

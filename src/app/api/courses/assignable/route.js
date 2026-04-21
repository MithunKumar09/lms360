/**
 * Assignable Courses API Route
 * 
 * GET /api/courses/assignable - Fetch assignable courses for admin/instructor
 * 
 * Query Parameters:
 * - role: 'admin' | 'instructor' (required)
 * - cohortId: Filter by cohort
 * - classId: Filter by class (cohort)
 * - subjectId: Filter by subject
 * - instructorId: Filter by instructor
 * - createdFrom: Date filter (from) - ISO date string
 * - createdTo: Date filter (to) - ISO date string
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

export async function GET(request) {
  try {
    // Require admin or instructor role
    const session = await requireRole(request, ['admin', 'instructor']);
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;
    const userId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const whereConditions = ['c.status = $1'];
    const queryParams = ['published'];
    let paramIndex = 2;

    // Role-based filtering
    if (userRole === 'admin') {
      // Admin: Only see courses from their organization
      if (userOrgId) {
        whereConditions.push(`c.org_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
      } else {
        return NextResponse.json(
          { success: false, error: 'Admin must belong to an organization' },
          { status: 403 }
        );
      }
    } else if (userRole === 'instructor') {
      // Instructor: See courses from their organization matching their classes/subjects
      if (userOrgId) {
        whereConditions.push(`c.org_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;

        // Get instructor's assigned cohorts and subjects from instructor_classes and user_class_subject_links
        // This ensures instructors only see courses that match their assigned classes/subjects
        const instructorCohortsResult = await query(
          `SELECT DISTINCT cohort_id 
           FROM instructor_classes 
           WHERE instructor_user_id = $1
           UNION
           SELECT DISTINCT cohort_id 
           FROM user_class_subject_links 
           WHERE user_id = $1 AND link_type = 'instructor'`,
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

        const instructorCohortIds = instructorCohortsResult.rows.map(row => row.cohort_id);
        const instructorSubjectIds = instructorSubjectsResult.rows.map(row => row.subject_id);

        console.log('👨‍🏫 [ASSIGNABLE COURSES] Instructor assignments:', {
          cohortIds: instructorCohortIds,
          subjectIds: instructorSubjectIds,
        });

        // Filter courses to only show those matching instructor's assignments
        // Course must match at least one of: instructor's cohorts OR instructor's subjects
        if (instructorCohortIds.length > 0 || instructorSubjectIds.length > 0) {
          const courseMatchConditions = [];
          
          // Match by cohorts
          if (instructorCohortIds.length > 0) {
            const cohortPlaceholders = instructorCohortIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
            courseMatchConditions.push(`EXISTS (
              SELECT 1 FROM course_assignments ca
              WHERE ca.course_id = c.id
              AND ca.cohort_id IN (${cohortPlaceholders})
              AND ca.is_active = true
            )`);
            queryParams.push(...instructorCohortIds);
            paramIndex += instructorCohortIds.length;
          }
          
          // Match by subjects
          if (instructorSubjectIds.length > 0) {
            const subjectPlaceholders = instructorSubjectIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
            courseMatchConditions.push(`EXISTS (
              SELECT 1 FROM course_assignments ca
              WHERE ca.course_id = c.id
              AND ca.subject_id IN (${subjectPlaceholders})
              AND ca.is_active = true
            )`);
            queryParams.push(...instructorSubjectIds);
            paramIndex += instructorSubjectIds.length;
          }
          
          // Course must match at least one condition (OR logic)
          if (courseMatchConditions.length > 0) {
            whereConditions.push(`(${courseMatchConditions.join(' OR ')})`);
          }
        } else {
          // If instructor has no assignments, show no courses
          console.log('👨‍🏫 [ASSIGNABLE COURSES] Instructor has no assignments, showing no courses');
          whereConditions.push(`1 = 0`); // Always false condition
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Instructor must belong to an organization' },
          { status: 403 }
        );
      }
    }

    // Additional filters
    const cohortId = searchParams.get('cohortId');
    if (cohortId) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM course_assignments ca
        WHERE ca.course_id = c.id
        AND ca.cohort_id = $${paramIndex}
        AND ca.is_active = true
      )`);
      queryParams.push(cohortId);
      paramIndex++;
    }

    const classId = searchParams.get('classId');
    if (classId) {
      // classId is actually cohort_id in the system
      whereConditions.push(`EXISTS (
        SELECT 1 FROM course_assignments ca
        WHERE ca.course_id = c.id
        AND ca.cohort_id = $${paramIndex}
        AND ca.is_active = true
      )`);
      queryParams.push(classId);
      paramIndex++;
    }

    const subjectId = searchParams.get('subjectId');
    if (subjectId) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM course_assignments ca
        WHERE ca.course_id = c.id
        AND ca.subject_id = $${paramIndex}
        AND ca.is_active = true
      )`);
      queryParams.push(subjectId);
      paramIndex++;
    }

    const instructorId = searchParams.get('instructorId');
    if (instructorId) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = c.id
        AND ci.instructor_id = $${paramIndex}
      )`);
      queryParams.push(instructorId);
      paramIndex++;
    }

    const createdFrom = searchParams.get('createdFrom');
    if (createdFrom) {
      whereConditions.push(`c.created_at >= $${paramIndex}`);
      queryParams.push(createdFrom);
      paramIndex++;
    }

    const createdTo = searchParams.get('createdTo');
    if (createdTo) {
      whereConditions.push(`c.created_at <= $${paramIndex}`);
      queryParams.push(createdTo);
      paramIndex++;
    }

    // Build WHERE clause
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get total count
    const countQuery = `SELECT COUNT(DISTINCT c.id) as total FROM courses c ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get courses with pagination
    const coursesQuery = `
      SELECT DISTINCT
        c.id,
        c.title,
        c.description,
        c.intro_video_url as "introVideo",
        c.about_course as "aboutCourse",
        c.created_at as "createdAt",
        -- Get cover image (return NULL if not available - will use placeholder in frontend)
        NULL as "coverImage",
        -- Get instructor info
        (
          SELECT jsonb_build_object(
            'id', u.id,
            'name', COALESCE(
              NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
              u.email
            )
          )
          FROM course_instructors ci
          INNER JOIN users u ON u.id = ci.instructor_id
          WHERE ci.course_id = c.id
          LIMIT 1
        ) as instructor,
        -- Get cohorts (from course_assignments)
        (
          SELECT COALESCE(jsonb_agg(DISTINCT ch.code), '[]'::jsonb)
          FROM course_assignments ca
          INNER JOIN cohorts ch ON ch.id = ca.cohort_id
          WHERE ca.course_id = c.id
          AND ca.assignment_type = 'main'
          AND ca.is_active = true
        ) as cohorts,
        -- Get classes (cohorts represent classes)
        (
          SELECT COALESCE(jsonb_agg(DISTINCT ch.code), '[]'::jsonb)
          FROM course_assignments ca
          INNER JOIN cohorts ch ON ch.id = ca.cohort_id
          WHERE ca.course_id = c.id
          AND ca.assignment_type = 'main'
          AND ca.is_active = true
        ) as classes,
        -- Get subjects
        (
          SELECT COALESCE(jsonb_agg(DISTINCT sc.title), '[]'::jsonb)
          FROM course_assignments ca
          INNER JOIN subject_catalog sc ON sc.id = ca.subject_id
          WHERE ca.course_id = c.id
          AND ca.assignment_type = 'main'
          AND ca.is_active = true
        ) as subjects
      FROM courses c
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const coursesResult = await query(coursesQuery, queryParams);

    // Format courses data
    const courses = coursesResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description || row.aboutCourse || '',
      introVideo: row.introVideo,
      coverImage: row.coverImage,
      instructor: row.instructor || { id: null, name: 'Unknown' },
      cohorts: row.cohorts || [],
      classes: row.classes || [],
      subjects: row.subjects || [],
      createdAt: row.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        courses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching assignable courses:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch assignable courses',
      },
      { status: error.status || 500 }
    );
  }
}


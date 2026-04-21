/**
 * Quizzes API Route
 * 
 * Handles quiz operations for all roles (Superadmin, Admin, Instructor).
 * 
 * GET /api/quizzes - List quizzes (role-scoped)
 * POST /api/quizzes - Create quiz
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query, getClient } from '@/lib/db/index.js';

/**
 * GET /api/quizzes
 * List quizzes (role-scoped)
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - courseId: Filter by course ID
 * - orgId: Filter by organization ID (superadmin only)
 * - status: Filter by status (draft, published, closed)
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const courseId = searchParams.get('courseId') || null;
    const orgId = searchParams.get('orgId') || null;
    const status = searchParams.get('status') || null;
    const quizType = searchParams.get('quizType') || null;
    const miniCourseId = searchParams.get('miniCourseId') || null;
    const cohortId = searchParams.get('cohortId') || null;
    const studentView = searchParams.get('studentView') === 'true';

    // Build WHERE conditions based on role
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    if (userRole === 'student' || studentView) {
      console.log('🎓 [QUIZZES API] Student quiz fetch started', { userId, userRole, studentView });
      
      // Student: Only published quizzes from enrolled courses, published mini courses, and global quizzes
      // Get enrolled course IDs
      const enrolledCoursesResult = await query(
        `SELECT DISTINCT course_id 
         FROM course_enrollments 
         WHERE user_id = $1 AND enrollment_status = 'active'`,
        [userId]
      );
      const enrolledCourseIds = enrolledCoursesResult.rows.map(row => row.course_id);
      console.log('🎓 [QUIZZES API] Enrolled courses:', { 
        count: enrolledCourseIds.length, 
        courseIds: enrolledCourseIds 
      });

      // Get student's cohort IDs from student_links table (needed for debug queries)
      const studentCohortsResult = await query(
        `SELECT DISTINCT cohort_id 
         FROM student_links 
         WHERE user_id = $1 AND cohort_id IS NOT NULL`,
        [userId]
      );
      const studentCohortIds = studentCohortsResult.rows.map(row => row.cohort_id);
      console.log('🎓 [QUIZZES API] Student cohorts:', { 
        count: studentCohortIds.length, 
        cohortIds: studentCohortIds 
      });

      // DEBUG: Check what quizzes exist for this course
      if (enrolledCourseIds.length > 0) {
        const debugQuizzesResult = await query(
          `SELECT id, title, course_id, status, quiz_type, cohort_ids 
           FROM quizzes 
           WHERE course_id = ANY($1::uuid[])`,
          [enrolledCourseIds]
        );
        console.log('🎓 [QUIZZES API] DEBUG - All quizzes for enrolled courses:', {
          count: debugQuizzesResult.rows.length,
          quizzes: debugQuizzesResult.rows.map(q => ({
            id: q.id,
            title: q.title,
            course_id: q.course_id,
            status: q.status,
            quiz_type: q.quiz_type,
            cohort_ids: q.cohort_ids,
            cohort_ids_type: Array.isArray(q.cohort_ids) ? 'array' : typeof q.cohort_ids,
            cohort_ids_length: Array.isArray(q.cohort_ids) ? q.cohort_ids.length : 'N/A'
          }))
        });

        // DEBUG: Check ALL published quizzes in the organization to see if quiz exists
        const allPublishedQuizzesResult = await query(
          `SELECT id, title, course_id, status, quiz_type, cohort_ids, org_id
           FROM quizzes 
           WHERE status = 'published' AND org_id = $1
           ORDER BY created_at DESC
           LIMIT 20`,
          [userOrgId]
        );
        console.log('🎓 [QUIZZES API] DEBUG - All published quizzes in org:', {
          orgId: userOrgId,
          count: allPublishedQuizzesResult.rows.length,
          quizzes: allPublishedQuizzesResult.rows.map(q => ({
            id: q.id,
            title: q.title,
            course_id: q.course_id,
            enrolled_course_match: enrolledCourseIds.includes(q.course_id),
            status: q.status,
            quiz_type: q.quiz_type,
            cohort_ids: q.cohort_ids,
            student_cohort_match: Array.isArray(q.cohort_ids) && studentCohortIds.length > 0 
              ? q.cohort_ids.some(cid => studentCohortIds.includes(cid))
              : 'N/A (no student cohorts)'
          }))
        });
      }

      // Student cohorts already fetched above for debug queries

      // Build student-specific conditions
      const studentConditions = [];
      
      // 1. Quizzes from enrolled courses (published only)
      // For main_course quizzes, also check if cohort_ids match student's cohorts
      if (enrolledCourseIds.length > 0) {
        const coursePlaceholders = enrolledCourseIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
        
        if (studentCohortIds.length > 0) {
          // Check if quiz has no cohort_ids (available to all) OR if quiz's cohort_ids overlap with student's cohorts
          const cohortPlaceholders = studentCohortIds.map((_, idx) => `$${paramIndex + enrolledCourseIds.length + idx}`).join(', ');
          const condition = `(
            q.course_id IN (${coursePlaceholders}) 
            AND q.status = 'published' 
            AND (
              q.cohort_ids IS NULL 
              OR q.cohort_ids = '{}'::uuid[] 
              OR q.cohort_ids && ARRAY[${cohortPlaceholders}]::uuid[]
            )
          )`;
          studentConditions.push(condition);
          queryParams.push(...enrolledCourseIds, ...studentCohortIds);
          paramIndex += enrolledCourseIds.length + studentCohortIds.length;
          console.log('🎓 [QUIZZES API] Added enrolled course condition with cohort filtering', {
            enrolledCourses: enrolledCourseIds.length,
            studentCohorts: studentCohortIds.length,
            condition
          });
        } else {
          // Student has no cohorts, only show quizzes with no cohort_ids
          const condition = `(
            q.course_id IN (${coursePlaceholders}) 
            AND q.status = 'published' 
            AND (q.cohort_ids IS NULL OR q.cohort_ids = '{}'::uuid[])
          )`;
          studentConditions.push(condition);
          queryParams.push(...enrolledCourseIds);
          paramIndex += enrolledCourseIds.length;
          console.log('🎓 [QUIZZES API] Added enrolled course condition (no cohorts - only quizzes without cohort_ids)', {
            enrolledCourses: enrolledCourseIds.length,
            condition
          });
        }
      } else {
        console.log('🎓 [QUIZZES API] ⚠️ Student has NO enrolled courses');
      }
      
      // 2. Published mini course quizzes
      studentConditions.push(`(q.quiz_type = 'mini_course' AND q.status = 'published' AND EXISTS (
        SELECT 1 FROM mini_courses mc 
        WHERE mc.id = q.mini_course_id AND mc.status = 'published'
      ))`);
      console.log('🎓 [QUIZZES API] Added mini course condition');
      
      // 3. Global quizzes (published only)
      studentConditions.push(`(q.quiz_type = 'global' AND q.status = 'published')`);
      console.log('🎓 [QUIZZES API] Added global quiz condition');
      
      // Combine with OR
      if (studentConditions.length > 0) {
        const combinedCondition = `(${studentConditions.join(' OR ')})`;
        whereConditions.push(combinedCondition);
        console.log('🎓 [QUIZZES API] Final student condition:', combinedCondition);
      } else {
        // No enrolled courses, only show mini courses and global
        whereConditions.push(`(q.quiz_type IN ('mini_course', 'global') AND q.status = 'published')`);
        console.log('🎓 [QUIZZES API] Using fallback condition (no enrolled courses)');
      }
      
      console.log('🎓 [QUIZZES API] Query params so far:', { 
        paramCount: queryParams.length, 
        params: queryParams.slice(0, 10) // Log first 10 params
      });
    } else if (userRole === 'superadmin') {
      // Superadmin: Can see all quizzes (global + all orgs)
      // If orgId filter is provided, filter by org
      if (orgId) {
        whereConditions.push(`q.org_id = $${paramIndex}`);
        queryParams.push(orgId);
        paramIndex++;
      } else {
        // Show all quizzes (global and org-specific)
        // No org filter needed
      }
    } else if (userRole === 'admin') {
      // Admin: Only quizzes from their organization
      if (userOrgId) {
        whereConditions.push(`q.org_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
      } else {
        // Admin with no org: Only global quizzes they created
        whereConditions.push(`q.org_id IS NULL AND q.created_by = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }
    } else if (userRole === 'instructor') {
      // Instructor: Quizzes from their courses AND standalone quizzes they created
      whereConditions.push(`(
        (q.course_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM courses c 
          WHERE c.id = q.course_id AND c.created_by = $${paramIndex}
        )) OR
        (q.course_id IS NULL AND q.created_by = $${paramIndex})
      )`);
      queryParams.push(userId);
      paramIndex++;
    }

    // Filter by course
    if (courseId) {
      whereConditions.push(`q.course_id = $${paramIndex}`);
      queryParams.push(courseId);
      paramIndex++;
    }

    // Filter by status (but skip for student view as it's already in student conditions)
    if (status && !(userRole === 'student' || studentView)) {
      whereConditions.push(`q.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
      console.log('🎓 [QUIZZES API] Added status filter (non-student):', status);
    } else if (status && (userRole === 'student' || studentView)) {
      console.log('🎓 [QUIZZES API] Skipping redundant status filter for student (already in student conditions)');
    }

    // Filter by quiz type
    if (quizType) {
      whereConditions.push(`q.quiz_type = $${paramIndex}`);
      queryParams.push(quizType);
      paramIndex++;
    }

    // Filter by mini course
    if (miniCourseId) {
      whereConditions.push(`q.mini_course_id = $${paramIndex}`);
      queryParams.push(miniCourseId);
      paramIndex++;
    }

    // Filter by cohort (using array contains)
    if (cohortId) {
      whereConditions.push(`$${paramIndex} = ANY(q.cohort_ids)`);
      queryParams.push(cohortId);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    console.log('🎓 [QUIZZES API] Final WHERE clause:', whereClause);
    console.log('🎓 [QUIZZES API] Final query params:', { 
      count: queryParams.length, 
      params: queryParams 
    });

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM quizzes q
      ${whereClause}
    `;
    console.log('🎓 [QUIZZES API] Count query:', countQuery);
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);
    console.log('🎓 [QUIZZES API] Total quizzes found:', total);

    // Get quizzes with course, org, and mini course info
    const quizzesQuery = `
      SELECT 
        q.id,
        q.course_id,
        q.org_id,
        q.created_by,
        q.quiz_type,
        q.mini_course_id,
        q.admin_id,
        q.cohort_ids,
        q.is_roadmap_mandatory,
        q.certificate_enabled,
        q.title,
        q.description,
        q.instructions,
        q.total_marks,
        q.passing_marks,
        q.time_limit_minutes,
        q.max_attempts,
        q.show_results_immediately,
        q.show_correct_answers,
        q.randomize_questions,
        q.randomize_options,
        q.status,
        q.start_date,
        q.end_date,
        q.created_at,
        q.updated_at,
        c.title as course_title,
        c.slug as course_slug,
        o.name as org_name,
        mc.title as mini_course_title,
        mc.cover_photo_url as mini_course_cover_photo
      FROM quizzes q
      LEFT JOIN courses c ON q.course_id = c.id
      LEFT JOIN organizations o ON q.org_id = o.id
      LEFT JOIN mini_courses mc ON q.mini_course_id = mc.id
      ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    console.log('🎓 [QUIZZES API] Quizzes query:', quizzesQuery);
    console.log('🎓 [QUIZZES API] Quizzes query params:', queryParams);
    const quizzesResult = await query(quizzesQuery, queryParams);
    console.log('🎓 [QUIZZES API] Quizzes result:', { 
      count: quizzesResult.rows.length,
      quizzes: quizzesResult.rows.map(q => ({
        id: q.id,
        title: q.title,
        course_id: q.course_id,
        quiz_type: q.quiz_type,
        status: q.status,
        cohort_ids: q.cohort_ids
      }))
    });

    const quizzes = quizzesResult.rows.map(row => ({
      id: row.id,
      courseId: row.course_id,
      courseTitle: row.course_title,
      courseSlug: row.course_slug,
      orgId: row.org_id,
      orgName: row.org_name,
      createdBy: row.created_by,
      quizType: row.quiz_type || 'main_course', // Default for backward compatibility
      miniCourseId: row.mini_course_id,
      miniCourseTitle: row.mini_course_title,
      miniCourseCoverPhoto: row.mini_course_cover_photo,
      adminId: row.admin_id,
      cohortIds: row.cohort_ids || [],
      isRoadmapMandatory: row.is_roadmap_mandatory || false,
      certificateEnabled: row.certificate_enabled || false,
      title: row.title,
      description: row.description,
      instructions: row.instructions,
      totalMarks: parseFloat(row.total_marks),
      passingMarks: parseFloat(row.passing_marks),
      timeLimitMinutes: row.time_limit_minutes,
      maxAttempts: row.max_attempts,
      showResultsImmediately: row.show_results_immediately,
      showCorrectAnswers: row.show_correct_answers,
      randomizeQuestions: row.randomize_questions,
      randomizeOptions: row.randomize_options,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      quizzes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ [API] [Quizzes GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch quizzes',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/quizzes
 * Create quiz
 * 
 * Body:
 * - courseId: UUID (optional - can be null for standalone quiz)
 * - orgId: UUID (optional - for superadmin/admin, null for global)
 * - title: string (required)
 * - description: string (optional)
 * - instructions: string (optional)
 * - totalMarks: number (default: 100)
 * - passingMarks: number (default: 50)
 * - timeLimitMinutes: number (optional, null for no limit)
 * - maxAttempts: number (default: 1)
 * - showResultsImmediately: boolean (default: false)
 * - showCorrectAnswers: boolean (default: false)
 * - randomizeQuestions: boolean (default: false)
 * - randomizeOptions: boolean (default: false)
 * - status: 'draft' | 'published' (default: 'draft')
 * - startDate: ISO string (optional)
 * - endDate: ISO string (optional)
 * - questions: array of question objects (required)
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;

    const body = await request.json();
    const {
      courseId,
      orgId,
      createdBy, // For admin/superadmin: selected instructor ID
      quizType = 'main_course', // Default for backward compatibility
      miniCourseId = null,
      cohortIds = null, // Array of cohort IDs for admin
      adminId = null, // For admin-created global quizzes
      title,
      description,
      instructions,
      totalMarks = 100,
      passingMarks = 50,
      timeLimitMinutes = null,
      maxAttempts = 1,
      showResultsImmediately = false,
      showCorrectAnswers = false,
      randomizeQuestions = false,
      randomizeOptions = false,
      status = 'draft',
      startDate = null,
      endDate = null,
      questions = [],
    } = body;

    // Validation
    if (!title || title.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Title must be at least 3 characters' },
        { status: 400 }
      );
    }
    if (totalMarks <= 0) {
      return NextResponse.json(
        { success: false, error: 'Total marks must be greater than 0' },
        { status: 400 }
      );
    }
    if (passingMarks < 0 || passingMarks > totalMarks) {
      return NextResponse.json(
        { success: false, error: 'Passing marks must be between 0 and total marks' },
        { status: 400 }
      );
    }
    if (timeLimitMinutes !== null && timeLimitMinutes <= 0) {
      return NextResponse.json(
        { success: false, error: 'Time limit must be greater than 0' },
        { status: 400 }
      );
    }
    if (maxAttempts <= 0) {
      return NextResponse.json(
        { success: false, error: 'Max attempts must be greater than 0' },
        { status: 400 }
      );
    }
    if (!['draft', 'published', 'closed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Validate quiz type
    if (!['main_course', 'mini_course', 'global'].includes(quizType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid quiz type. Must be main_course, mini_course, or global' },
        { status: 400 }
      );
    }

    // Validate quiz type logic
    if (quizType === 'main_course') {
      if (!courseId) {
        return NextResponse.json(
          { success: false, error: 'Course ID is required for main_course quiz type' },
          { status: 400 }
        );
      }
      if (miniCourseId) {
        return NextResponse.json(
          { success: false, error: 'Mini course ID must be null for main_course quiz type' },
          { status: 400 }
        );
      }
    } else if (quizType === 'mini_course') {
      if (!miniCourseId) {
        return NextResponse.json(
          { success: false, error: 'Mini course ID is required for mini_course quiz type' },
          { status: 400 }
        );
      }
      if (courseId) {
        return NextResponse.json(
          { success: false, error: 'Course ID must be null for mini_course quiz type' },
          { status: 400 }
        );
      }
      // Verify mini course exists
      const miniCourseCheck = await query(
        `SELECT id, org_id FROM mini_courses WHERE id = $1`,
        [miniCourseId]
      );
      if (miniCourseCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Mini course not found' },
          { status: 404 }
        );
      }
      // Verify mini course belongs to admin's org (if admin)
      if (userRole === 'admin' && userOrgId) {
        if (miniCourseCheck.rows[0].org_id !== userOrgId) {
          return NextResponse.json(
            { success: false, error: 'Mini course does not belong to your organization' },
            { status: 403 }
          );
        }
      }
    } else if (quizType === 'global') {
      if (courseId || miniCourseId) {
        return NextResponse.json(
          { success: false, error: 'Course ID and mini course ID must be null for global quiz type' },
          { status: 400 }
        );
      }
    }

    // Validate cohortIds if provided
    let finalCohortIds = null;
    if (cohortIds !== null && cohortIds !== undefined) {
      if (!Array.isArray(cohortIds)) {
        return NextResponse.json(
          { success: false, error: 'cohortIds must be an array' },
          { status: 400 }
        );
      }
      if (cohortIds.length > 0) {
        // Validate all cohort IDs are valid UUIDs and belong to admin's org
        if (userRole === 'admin' && userOrgId) {
          const cohortCheck = await query(
            `SELECT id FROM cohorts WHERE id = ANY($1::uuid[]) AND org_id = $2`,
            [cohortIds, userOrgId]
          );
          if (cohortCheck.rows.length !== cohortIds.length) {
            return NextResponse.json(
              { success: false, error: 'One or more cohort IDs are invalid or do not belong to your organization' },
              { status: 400 }
            );
          }
        }
        finalCohortIds = cohortIds;
      }
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one question is required' },
        { status: 400 }
      );
    }

    // Role-based validation
    let finalOrgId = null;
    let finalCourseId = courseId || null;
    let finalCreatedBy = userId; // Default to current user
    let finalAdminId = adminId || null;

    if (userRole === 'superadmin') {
      // Superadmin: orgId is required, instructor (createdBy) is optional
      if (!orgId) {
        return NextResponse.json(
          { success: false, error: 'Organization selection is required' },
          { status: 400 }
        );
      }
      // If instructor is selected, verify it exists and belongs to selected org
      if (createdBy && createdBy !== userId) {
        const instructorCheck = await query(
          `SELECT id, org_id FROM users WHERE id = $1 AND role = 'instructor'`,
          [createdBy]
        );
        if (instructorCheck.rows.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Invalid instructor selected' },
            { status: 400 }
          );
        }
        if (instructorCheck.rows[0].org_id !== orgId) {
          return NextResponse.json(
            { success: false, error: 'Instructor does not belong to the selected organization' },
            { status: 400 }
          );
        }
        finalCreatedBy = createdBy;
      } else {
        // No instructor selected, use current user (superadmin) as created_by
        finalCreatedBy = userId;
      }
      finalOrgId = orgId;
      // For global quizzes, adminId can be set
      if (quizType === 'global' && adminId) {
        finalAdminId = adminId;
      }
    } else if (userRole === 'admin') {
      // Admin: orgId is automatically set to their org, courseId is optional
      // Instructor (createdBy) is optional - if selected, verify it belongs to admin's organization
      if (createdBy && createdBy !== userId) {
        // Verify instructor exists and belongs to admin's organization
        const instructorCheck = await query(
          `SELECT id, org_id FROM users WHERE id = $1 AND role = 'instructor' AND org_id = $2`,
          [createdBy, userOrgId]
        );
        if (instructorCheck.rows.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Invalid instructor selected or instructor does not belong to your organization' },
            { status: 400 }
          );
        }
        finalCreatedBy = createdBy;
      } else {
        // No instructor selected, use current user (admin) as created_by
        finalCreatedBy = userId;
      }
      finalOrgId = userOrgId || null;
      // For global quizzes created by admin, set adminId
      if (quizType === 'global') {
        finalAdminId = userId;
      }
    } else if (userRole === 'instructor') {
      // Instructor: No orgId (will be set from course if course is selected), courseId is optional
      // createdBy is always the current user (instructor)
      finalOrgId = null; // Will be set from course if course is selected
      
      // If course is selected, verify it belongs to instructor
      if (finalCourseId) {
        const courseCheck = await query(
          `SELECT id, created_by, org_id FROM courses WHERE id = $1 AND created_by = $2`,
          [finalCourseId, userId]
        );
        if (courseCheck.rows.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Course not found or you do not have permission' },
            { status: 403 }
          );
        }
        // Set orgId from course if course is selected
        finalOrgId = courseCheck.rows[0].org_id;
      }
      finalCreatedBy = userId; // Instructor always creates for themselves
    }

    // Validate questions
    let totalQuestionMarks = 0;
    for (const question of questions) {
      if (!question.questionText || question.questionText.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'All questions must have text' },
          { status: 400 }
        );
      }
      if (!['multiple_choice', 'true_false', 'short_answer', 'essay'].includes(question.questionType)) {
        return NextResponse.json(
          { success: false, error: 'Invalid question type' },
          { status: 400 }
        );
      }
      if (question.marks <= 0) {
        return NextResponse.json(
          { success: false, error: 'Question marks must be greater than 0' },
          { status: 400 }
        );
      }
      totalQuestionMarks += question.marks;

      // Validate options for multiple_choice and true_false
      if (['multiple_choice', 'true_false'].includes(question.questionType)) {
        if (!question.options || question.options.length < 2) {
          return NextResponse.json(
            { success: false, error: 'Multiple choice and true/false questions must have at least 2 options' },
            { status: 400 }
          );
        }
        // Check if at least one option is marked as correct
        const hasCorrectAnswer = question.options.some(opt => opt.isCorrect);
        if (!hasCorrectAnswer) {
          return NextResponse.json(
            { success: false, error: 'At least one option must be marked as correct' },
            { status: 400 }
          );
        }
      }
    }

    // Start transaction
    const client = await getClient();
    await client.query('BEGIN');

    try {
      // Insert quiz
      const insertQuizQuery = `
        INSERT INTO quizzes (
          course_id,
          org_id,
          created_by,
          quiz_type,
          mini_course_id,
          admin_id,
          cohort_ids,
          title,
          description,
          instructions,
          total_marks,
          passing_marks,
          time_limit_minutes,
          max_attempts,
          show_results_immediately,
          show_correct_answers,
          randomize_questions,
          randomize_options,
          status,
          start_date,
          end_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING id, created_at, updated_at
      `;
      const quizResult = await client.query(insertQuizQuery, [
        finalCourseId,
        finalOrgId,
        finalCreatedBy, // Use selected instructor for admin/superadmin, or current user for instructor
        quizType,
        miniCourseId,
        finalAdminId,
        finalCohortIds,
        title.trim(),
        description?.trim() || null,
        instructions?.trim() || null,
        totalMarks,
        passingMarks,
        timeLimitMinutes,
        maxAttempts,
        showResultsImmediately,
        showCorrectAnswers,
        randomizeQuestions,
        randomizeOptions,
        status,
        startDate,
        endDate,
      ]);

      const quizId = quizResult.rows[0].id;

      // Insert questions
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const insertQuestionQuery = `
          INSERT INTO quiz_questions (
            quiz_id,
            question_text,
            question_type,
            marks,
            order_index
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `;
        const questionResult = await client.query(insertQuestionQuery, [
          quizId,
          question.questionText.trim(),
          question.questionType,
          question.marks,
          i + 1,
        ]);

        const questionId = questionResult.rows[0].id;

        // Insert options for multiple_choice and true_false
        if (['multiple_choice', 'true_false'].includes(question.questionType) && question.options) {
          for (let j = 0; j < question.options.length; j++) {
            const option = question.options[j];
            const insertOptionQuery = `
              INSERT INTO quiz_question_options (
                question_id,
                option_text,
                is_correct,
                order_index
              ) VALUES ($1, $2, $3, $4)
            `;
            await client.query(insertOptionQuery, [
              questionId,
              option.optionText.trim(),
              option.isCorrect || false,
              j + 1,
            ]);
          }
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        quiz: {
          id: quizId,
          courseId: finalCourseId,
          orgId: finalOrgId,
          quizType,
          miniCourseId,
          adminId: finalAdminId,
          cohortIds: finalCohortIds || [],
          title: title.trim(),
          description: description?.trim() || null,
          instructions: instructions?.trim() || null,
          totalMarks,
          passingMarks,
          timeLimitMinutes,
          maxAttempts,
          showResultsImmediately,
          showCorrectAnswers,
          randomizeQuestions,
          randomizeOptions,
          status,
          startDate,
          endDate,
          createdAt: quizResult.rows[0].created_at,
          updatedAt: quizResult.rows[0].updated_at,
        },
        message: 'Quiz created successfully',
      }, { status: 201 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ [API] [Quizzes POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create quiz',
      },
      { status: error.status || 500 }
    );
  }
}


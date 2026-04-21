/**
 * Assignments API Route
 * 
 * Handles assignment operations for instructors.
 * 
 * GET /api/assignments - List assignments (instructor's assignments only)
 * POST /api/assignments - Create assignment (instructor only)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { getClientIp } from '@/lib/auth/validation.js';

/**
 * GET /api/assignments
 * List assignments (instructor's assignments only)
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - courseId: Filter by course ID
 * - status: Filter by status (draft, published, closed)
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['instructor']);
    const userId = session.user.id;
    const userOrgId = session.user.orgId || session.user.org_id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const courseId = searchParams.get('courseId') || null;
    const status = searchParams.get('status') || null;

    // Build WHERE conditions
    const whereConditions = ['a.created_by = $1'];
    const queryParams = [userId];
    let paramIndex = 2;

    // Filter by course (must be instructor's course)
    if (courseId) {
      whereConditions.push(`a.course_id = $${paramIndex}`);
      queryParams.push(courseId);
      paramIndex++;
    }

    // Filter by status
    if (status) {
      whereConditions.push(`a.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM assignments a
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get assignments with course info
    const assignmentsQuery = `
      SELECT 
        a.id,
        a.course_id,
        a.created_by,
        a.title,
        a.description,
        a.instructions,
        a.max_marks,
        a.passing_marks,
        a.due_date,
        a.allow_late_submission,
        a.late_submission_penalty,
        a.max_file_size_mb,
        a.allowed_file_types,
        a.status,
        a.created_at,
        a.updated_at,
        c.title as course_title,
        c.slug as course_slug
      FROM assignments a
      LEFT JOIN courses c ON a.course_id = c.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    const assignmentsResult = await query(assignmentsQuery, queryParams);

    const assignments = assignmentsResult.rows.map(row => ({
      id: row.id,
      courseId: row.course_id,
      courseTitle: row.course_title,
      courseSlug: row.course_slug,
      createdBy: row.created_by,
      title: row.title,
      description: row.description,
      instructions: row.instructions,
      maxMarks: parseFloat(row.max_marks),
      passingMarks: parseFloat(row.passing_marks),
      dueDate: row.due_date,
      allowLateSubmission: row.allow_late_submission,
      lateSubmissionPenalty: parseFloat(row.late_submission_penalty || 0),
      maxFileSizeMb: row.max_file_size_mb,
      allowedFileTypes: row.allowed_file_types || [],
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      assignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ [API] [Assignments GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch assignments',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/assignments
 * Create assignment (instructor only)
 * 
 * Body:
 * - courseId: UUID (required)
 * - title: string (required)
 * - description: string (optional)
 * - instructions: string (optional)
 * - maxMarks: number (default: 100)
 * - passingMarks: number (default: 50)
 * - dueDate: ISO string (required)
 * - allowLateSubmission: boolean (default: false)
 * - lateSubmissionPenalty: number (default: 0)
 * - maxFileSizeMb: number (default: 10)
 * - allowedFileTypes: string[] (optional)
 * - status: 'draft' | 'published' (default: 'draft')
 */
export async function POST(request) {
  console.log('📝 [ASSIGNMENT API] ===== CREATE ASSIGNMENT REQUEST STARTED =====');
  
  try {
    // Authentication
    console.log('📝 [ASSIGNMENT API] Authenticating user...');
    const session = await requireRole(request, ['instructor']);
    const userId = session.user.id;
    const userOrgId = session.user.orgId || session.user.org_id;
    
    console.log('📝 [ASSIGNMENT API] User authenticated:', {
      userId,
      userOrgId,
      role: session.user.role,
      email: session.user.email,
    });

    // Parse request body
    console.log('📝 [ASSIGNMENT API] Parsing request body...');
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.log('📝 [ASSIGNMENT API] ❌ Invalid JSON in request body');
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }
    console.log('📝 [ASSIGNMENT API] Request body received:', {
      courseId: body.courseId,
      title: body.title,
      description: body.description ? `${body.description.substring(0, 50)}...` : null,
      instructions: body.instructions ? `${body.instructions.substring(0, 50)}...` : null,
      maxMarks: body.maxMarks,
      passingMarks: body.passingMarks,
      dueDate: body.dueDate,
      allowLateSubmission: body.allowLateSubmission,
      lateSubmissionPenalty: body.lateSubmissionPenalty,
      maxFileSizeMb: body.maxFileSizeMb,
      allowedFileTypes: body.allowedFileTypes,
      status: body.status,
    });

    const {
      courseId,
      title,
      description,
      instructions,
      maxMarks = 100,
      passingMarks = 50,
      dueDate,
      allowLateSubmission = false,
      lateSubmissionPenalty = 0,
      maxFileSizeMb = 10,
      allowedFileTypes = [],
      status = 'draft',
      attachments = [],
    } = body;

    // Validation
    console.log('📝 [ASSIGNMENT API] Starting validation...');
    
    if (!courseId) {
      console.error('📝 [ASSIGNMENT API] ❌ Validation failed: Course ID is required');
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }
    console.log('📝 [ASSIGNMENT API] ✅ Course ID validated:', courseId);

    if (!title || title.trim().length < 3) {
      console.error('📝 [ASSIGNMENT API] ❌ Validation failed: Title must be at least 3 characters', {
        title,
        titleLength: title?.trim().length,
      });
      return NextResponse.json(
        { success: false, error: 'Title must be at least 3 characters' },
        { status: 400 }
      );
    }
    console.log('📝 [ASSIGNMENT API] ✅ Title validated:', title.trim());

    if (!dueDate) {
      console.error('📝 [ASSIGNMENT API] ❌ Validation failed: Due date is required');
      return NextResponse.json(
        { success: false, error: 'Due date is required' },
        { status: 400 }
      );
    }
    console.log('📝 [ASSIGNMENT API] ✅ Due date validated:', dueDate);

    if (maxMarks <= 0) {
      console.error('📝 [ASSIGNMENT API] ❌ Validation failed: Max marks must be greater than 0', { maxMarks });
      return NextResponse.json(
        { success: false, error: 'Max marks must be greater than 0' },
        { status: 400 }
      );
    }
    console.log('📝 [ASSIGNMENT API] ✅ Max marks validated:', maxMarks);

    if (passingMarks < 0 || passingMarks > maxMarks) {
      console.error('📝 [ASSIGNMENT API] ❌ Validation failed: Passing marks invalid', {
        passingMarks,
        maxMarks,
      });
      return NextResponse.json(
        { success: false, error: 'Passing marks must be between 0 and max marks' },
        { status: 400 }
      );
    }
    console.log('📝 [ASSIGNMENT API] ✅ Passing marks validated:', passingMarks);

    if (lateSubmissionPenalty < 0 || lateSubmissionPenalty > 100) {
      console.error('📝 [ASSIGNMENT API] ❌ Validation failed: Late submission penalty invalid', {
        lateSubmissionPenalty,
      });
      return NextResponse.json(
        { success: false, error: 'Late submission penalty must be between 0 and 100' },
        { status: 400 }
      );
    }
    console.log('📝 [ASSIGNMENT API] ✅ Late submission penalty validated:', lateSubmissionPenalty);

    if (!['draft', 'published', 'closed'].includes(status)) {
      console.error('📝 [ASSIGNMENT API] ❌ Validation failed: Invalid status', { status });
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }
    console.log('📝 [ASSIGNMENT API] ✅ Status validated:', status);

    console.log('📝 [ASSIGNMENT API] ✅ All validations passed');

    // Verify course belongs to instructor (using same logic as course management)
    // Instructor can create assignments for courses matching their org, classes, and subjects
    console.log('📝 [ASSIGNMENT API] Verifying course access...');
    
    // First, get the course details
    const courseDetailsQuery = `
      SELECT id, created_by, org_id, title
      FROM courses
      WHERE id = $1
    `;
    const courseDetailsResult = await query(courseDetailsQuery, [courseId]);
    
    if (courseDetailsResult.rows.length === 0) {
      console.error('📝 [ASSIGNMENT API] ❌ Course not found:', { courseId });
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }
    
    const course = courseDetailsResult.rows[0];
    console.log('📝 [ASSIGNMENT API] Course details:', {
      courseId: course.id,
      courseTitle: course.title,
      courseCreatedBy: course.created_by,
      courseOrgId: course.org_id,
      userOrgId,
    });
    
    // Check if course belongs to instructor's organization
    if (course.org_id !== userOrgId) {
      console.error('📝 [ASSIGNMENT API] ❌ Course org mismatch:', {
        courseOrgId: course.org_id,
        userOrgId,
      });
      return NextResponse.json(
        { success: false, error: 'Course does not belong to your organization' },
        { status: 403 }
      );
    }
    
    // Get instructor's classes and subjects (same logic as course management)
    console.log('📝 [ASSIGNMENT API] Getting instructor classes and subjects...');
    const instructorClassesResult = await query(
      `SELECT DISTINCT cohort_id 
       FROM instructor_classes 
       WHERE instructor_user_id = $1`,
      [userId]
    );
    
    const instructorSubjectsResult = await query(
      `SELECT DISTINCT so.subject_id
       FROM instructor_classes ic
       JOIN subject_offerings so ON ic.subject_offering_id = so.id
       WHERE ic.instructor_user_id = $1 AND so.subject_id IS NOT NULL
       UNION
       SELECT DISTINCT so.subject_id
       FROM teacher_assignments ta
       JOIN subject_offerings so ON ta.subject_offering_id = so.id
       WHERE ta.teacher_id = $1 AND so.subject_id IS NOT NULL`,
      [userId]
    );
    
    const classIds = instructorClassesResult.rows.map(row => row.cohort_id);
    const subjectIds = instructorSubjectsResult.rows.map(row => row.subject_id).filter(id => id != null);
    
    console.log('📝 [ASSIGNMENT API] Instructor classes:', classIds);
    console.log('📝 [ASSIGNMENT API] Instructor subjects:', subjectIds);
    
    // Check if course matches instructor's classes
    let courseMatchesClass = false;
    if (classIds.length > 0) {
      const classCheckQuery = `
        SELECT 1 FROM course_classes cc 
        WHERE cc.course_id = $1 
        AND cc.class_id = ANY($2::uuid[])
        LIMIT 1
      `;
      const classCheckResult = await query(classCheckQuery, [courseId, classIds]);
      courseMatchesClass = classCheckResult.rows.length > 0;
      console.log('📝 [ASSIGNMENT API] Course matches instructor classes:', courseMatchesClass);
    } else {
      console.log('📝 [ASSIGNMENT API] Instructor has no classes assigned, skipping class check');
    }
    
    // Check if course matches instructor's subjects
    let courseMatchesSubject = false;
    if (subjectIds.length > 0) {
      const subjectCheckQuery = `
        SELECT 1 FROM course_subjects cs 
        WHERE cs.course_id = $1 
        AND cs.subject_id = ANY($2::uuid[])
        LIMIT 1
      `;
      const subjectCheckResult = await query(subjectCheckQuery, [courseId, subjectIds]);
      courseMatchesSubject = subjectCheckResult.rows.length > 0;
      console.log('📝 [ASSIGNMENT API] Course matches instructor subjects:', courseMatchesSubject);
    } else {
      console.log('📝 [ASSIGNMENT API] Instructor has no subjects assigned, skipping subject check');
    }
    
    // Verify: Course must match org AND (classes OR subjects)
    // If instructor has no classes/subjects assigned, allow if org matches
    const hasAccess = courseMatchesClass || courseMatchesSubject || (classIds.length === 0 && subjectIds.length === 0);
    
    if (!hasAccess) {
      console.error('📝 [ASSIGNMENT API] ❌ Course access denied:', {
        courseId,
        courseOrgId: course.org_id,
        userOrgId,
        courseMatchesClass,
        courseMatchesSubject,
        instructorClassIds: classIds,
        instructorSubjectIds: subjectIds,
        message: 'Course does not match instructor classes or subjects',
      });
      return NextResponse.json(
        { success: false, error: 'You do not have permission to create assignments for this course. The course must match your assigned classes or subjects.' },
        { status: 403 }
      );
    }
    
    console.log('📝 [ASSIGNMENT API] ✅ Course access verified:', {
      courseId: course.id,
      courseTitle: course.title,
      courseOrgId: course.org_id,
      courseMatchesClass,
      courseMatchesSubject,
    });

    // Prepare data for insertion
    const assignmentData = {
      courseId,
      userId,
      title: title.trim(),
      description: description?.trim() || null,
      instructions: instructions?.trim() || null,
      maxMarks,
      passingMarks,
      dueDate,
      allowLateSubmission,
      lateSubmissionPenalty,
      maxFileSizeMb,
      allowedFileTypes: allowedFileTypes.length > 0 ? allowedFileTypes : null,
      status,
    };
    
    console.log('📝 [ASSIGNMENT API] Prepared assignment data for insertion:', {
      ...assignmentData,
      description: assignmentData.description ? `${assignmentData.description.substring(0, 50)}...` : null,
      instructions: assignmentData.instructions ? `${assignmentData.instructions.substring(0, 50)}...` : null,
    });

    // Insert assignment
    console.log('📝 [ASSIGNMENT API] Inserting assignment into database...');
    const insertQuery = `
      INSERT INTO assignments (
        course_id,
        created_by,
        title,
        description,
        instructions,
        max_marks,
        passing_marks,
        due_date,
        allow_late_submission,
        late_submission_penalty,
        max_file_size_mb,
        allowed_file_types,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, created_at, updated_at
    `;
    
    const insertParams = [
      assignmentData.courseId,
      assignmentData.userId,
      assignmentData.title,
      assignmentData.description,
      assignmentData.instructions,
      assignmentData.maxMarks,
      assignmentData.passingMarks,
      assignmentData.dueDate,
      assignmentData.allowLateSubmission,
      assignmentData.lateSubmissionPenalty,
      assignmentData.maxFileSizeMb,
      assignmentData.allowedFileTypes,
      assignmentData.status,
    ];
    
    console.log('📝 [ASSIGNMENT API] Insert query:', {
      query: insertQuery,
      params: insertParams.map((param, idx) => ({
        paramIndex: idx + 1,
        value: typeof param === 'string' && param.length > 50 ? `${param.substring(0, 50)}...` : param,
        type: typeof param,
      })),
    });

    const result = await query(insertQuery, insertParams);
    
    if (!result || !result.rows || result.rows.length === 0) {
      console.error('📝 [ASSIGNMENT API] ❌ Database insertion failed: No rows returned');
      throw new Error('Failed to create assignment - no data returned from database');
    }

    const assignment = result.rows[0];
    const assignmentId = assignment.id;
    console.log('📝 [ASSIGNMENT API] ✅ Assignment inserted successfully:', {
      assignmentId,
      createdAt: assignment.created_at,
      updatedAt: assignment.updated_at,
    });

    // Insert attachments if provided
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      console.log('📝 [ASSIGNMENT API] Inserting attachments:', attachments.length);
      try {
        for (const attachment of attachments) {
          const attachmentQuery = `
            INSERT INTO assignment_attachments (
              assignment_id,
              file_key,
              file_url,
              file_name,
              file_type,
              file_size_bytes
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `;
          await query(attachmentQuery, [
            assignmentId,
            attachment.fileKey,
            attachment.fileUrl,
            attachment.fileName,
            attachment.fileType,
            attachment.fileSizeBytes,
          ]);
        }
        console.log('📝 [ASSIGNMENT API] ✅ All attachments inserted successfully');
      } catch (attachmentError) {
        console.error('📝 [ASSIGNMENT API] ❌ Error inserting attachments:', attachmentError);
        // Don't fail the whole request if attachments fail, but log it
      }
    }

    // Prepare response
    const responseData = {
      id: assignment.id,
      courseId,
      title: assignmentData.title,
      description: assignmentData.description,
      instructions: assignmentData.instructions,
      maxMarks,
      passingMarks,
      dueDate,
      allowLateSubmission,
      lateSubmissionPenalty,
      maxFileSizeMb,
      allowedFileTypes: allowedFileTypes,
      status,
      createdAt: assignment.created_at,
      updatedAt: assignment.updated_at,
    };

    console.log('📝 [ASSIGNMENT API] ✅ Assignment created successfully:', {
      assignmentId: responseData.id,
      courseId: responseData.courseId,
      title: responseData.title,
      status: responseData.status,
    });
    console.log('📝 [ASSIGNMENT API] ===== CREATE ASSIGNMENT REQUEST SUCCESSFUL =====');

    return NextResponse.json({
      success: true,
      assignment: responseData,
      message: 'Assignment created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('📝 [ASSIGNMENT API] ===== CREATE ASSIGNMENT ERROR =====');
    console.error('📝 [ASSIGNMENT API] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      status: error.status,
      code: error.code,
    });
    
    // Log additional error context if available
    if (error.constraint) {
      console.error('📝 [ASSIGNMENT API] Database constraint error:', {
        constraint: error.constraint,
        table: error.table,
        detail: error.detail,
      });
    }
    
    if (error.routine) {
      console.error('📝 [ASSIGNMENT API] Database routine error:', {
        routine: error.routine,
        severity: error.severity,
      });
    }

    console.error('📝 [ASSIGNMENT API] ===== ERROR END =====');
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create assignment',
        ...(process.env.NODE_ENV === 'development' && {
          details: {
            name: error.name,
            code: error.code,
            constraint: error.constraint,
            table: error.table,
          },
        }),
      },
      { status: error.status || 500 }
    );
  }
}


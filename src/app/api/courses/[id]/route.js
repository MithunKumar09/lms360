/**
 * Course API Route (Single Course)
 * 
 * Handles operations for a single course.
 * 
 * GET /api/courses/:id - Get course by ID with all details
 * PUT /api/courses/:id - Update course
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { getCoursePermissions } from '@/lib/course/permissions.js';
import { checkEnrollment } from '@/lib/db/courses/enrollments.js';

/**
 * GET /api/courses/:id
 * Get course by ID with all details (modules, chapters, lessons)
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Authentication: Allow all authenticated users (including students and vendors) to view course details
    // This is needed for students to view course curriculum on lessons page and vendors to edit their courses
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor', 'student', 'vendor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;

    console.log(`📖 [GET COURSE] Fetching course ${id} for user ${userId} (${userRole})`);

    // Fetch course basic info
    const courseQuery = `
      SELECT 
        c.id,
        c.title,
        c.slug,
        c.regular_price,
        c.discounted_price,
        c.about_course,
        c.category_id,
        c.subcategory_id,
        c.course_type_id,
        c.program_type_id,
        c.course_level_id,
        c.intro_video_url,
        c.start_date,
        c.language,
        c.description,
        c.cover_image_url,
        c.certificate_template_id,
        c.certificate_upload_url,
        c.status,
        c.org_id,
        c.created_by,
        c.created_at,
        c.updated_at,
        c.pinned,
        -- Get category name
        (SELECT name FROM course_categories WHERE id = c.category_id) as category_name,
        -- Get program type name
        (SELECT name FROM program_types WHERE id = c.program_type_id) as program_type_name,
        -- Get course type name
        (SELECT name FROM course_types WHERE id = c.course_type_id) as course_type_name,
        -- Get course level name
        (SELECT name FROM course_levels WHERE id = c.course_level_id) as course_level_name,
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
        -- Get ratings count and average (if course_reviews table exists)
        (
          SELECT COUNT(*)
          FROM course_reviews cr
          WHERE cr.course_id = c.id
        ) as total_ratings,
        (
          SELECT AVG(rating)
          FROM course_reviews cr
          WHERE cr.course_id = c.id
        ) as average_rating,
        -- Get enrolled count (safely handle if table doesn't exist)
        (
          SELECT COUNT(DISTINCT user_id)
          FROM course_enrollments
          WHERE course_id = c.id
            AND enrollment_status = 'active'
        ) as enrolled_count,
        -- Get instructors
        (
          SELECT json_agg(
            json_build_object(
              'id', u.id,
              'name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email),
              'email', u.email,
              'firstName', u.first_name,
              'lastName', u.last_name,
              'photoUrl', u.avatar_url,
              'bio', u.bio,
              'designation', u.skill,
              'username', u.username
            )
          )
          FROM course_instructors ci
          JOIN users u ON ci.instructor_id = u.id
          WHERE ci.course_id = c.id
        ) as instructors,
        -- Get classes
        (
          SELECT json_agg(
            json_build_object(
              'id', ch.id,
              'name', ch.code
            )
          )
          FROM course_classes cc
          JOIN cohorts ch ON cc.class_id = ch.id
          WHERE cc.course_id = c.id
        ) as classes,
        -- Get subjects
        (
          SELECT json_agg(
            json_build_object(
              'id', sc.id,
              'name', sc.title
            )
          )
          FROM course_subjects cs
          JOIN subject_catalog sc ON cs.subject_id = sc.id
          WHERE cs.course_id = c.id
        ) as subjects,
        -- Get skills
        (
          SELECT json_agg(cs_skill.id)
          FROM courses_skills cs
          JOIN course_skills cs_skill ON cs.skill_id = cs_skill.id
          WHERE cs.course_id = c.id
        ) as course_skills,
        -- Get requirements
        (
          SELECT json_agg(cr.requirement ORDER BY cr.order_index)
          FROM course_requirements cr
          WHERE cr.course_id = c.id
        ) as requirements,
        -- Get tags
        (
          SELECT json_agg(ct.tag)
          FROM course_tags ct
          WHERE ct.course_id = c.id
        ) as tags,
        -- Get creator info
        (
          SELECT json_build_object(
            'id', u.id,
            'name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email),
            'email', u.email,
            'role', u.role
          )
          FROM users u
          WHERE u.id = c.created_by
        ) as created_by_user
      FROM courses c
      WHERE c.id = $1
    `;

    const courseResult = await query(courseQuery, [id]);

    if (courseResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    const course = courseResult.rows[0];

    // Check permissions
    const permissions = getCoursePermissions(course, { id: userId, role: userRole, orgId: userOrgId });
    
    // For students/alumni, check if they're enrolled OR if course is published (for viewing course details)
    if (userRole === 'student' || userRole === 'alumni') {
      // Check if student is enrolled
      const enrollment = await checkEnrollment(id, userId);
      
      // Allow access if:
      // 1. Student is enrolled in the course, OR
      // 2. Course is published (students can view course details before enrolling)
      if (!enrollment && course.status !== 'published') {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to view this course. Please enroll first.' },
          { status: 403 }
        );
      }
    } else {
      // For other roles (instructor, admin, superadmin), check canView permission
      if (!permissions.canView) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to view this course' },
          { status: 403 }
        );
      }
    }

    // Fetch modules separately to avoid complex nested queries
    const modulesQuery = `
      SELECT 
        cm.id,
        cm.title,
        cm.description,
        cm.order_index as "order"
      FROM course_modules cm
      WHERE cm.course_id = $1
      ORDER BY cm.order_index
    `;
    
    const modulesResult = await query(modulesQuery, [id]);
    
    // Fetch chapters for each module
    const chaptersQuery = `
      SELECT 
        cc.id,
        cc.title,
        cc.description,
        cc.order_index as "order",
        cc.module_id
      FROM course_chapters cc
      WHERE cc.module_id = ANY($1::uuid[])
      ORDER BY cc.module_id, cc.order_index
    `;
    
    const moduleIds = modulesResult.rows.map(m => m.id);
    const chaptersResult = moduleIds.length > 0 
      ? await query(chaptersQuery, [moduleIds])
      : { rows: [] };
    
    // Fetch lessons for each chapter
    const lessonsQuery = `
      SELECT 
        cl.id,
        cl.lesson_type as type,
        cl.title,
        cl.description,
        cl.duration,
        cl.order_index as "order",
        cl.chapter_id,
        cl.video_url,
        cl.text_content,
        cl.quiz_id,
        cl.assignment_id,
        cl.material_url,
        (
          SELECT lt.transcript_text
          FROM lesson_transcripts lt
          WHERE lt.lesson_id = cl.id
          LIMIT 1
        ) as transcript
      FROM course_lessons cl
      WHERE cl.chapter_id = ANY($1::uuid[])
      ORDER BY cl.chapter_id, cl.order_index
    `;
    
    const chapterIds = chaptersResult.rows.map(c => c.id);
    const lessonsResult = chapterIds.length > 0
      ? await query(lessonsQuery, [chapterIds])
      : { rows: [] };

    // Group chapters by module
    const chaptersByModule = {};
    chaptersResult.rows.forEach(chapter => {
      if (!chaptersByModule[chapter.module_id]) {
        chaptersByModule[chapter.module_id] = [];
      }
      chaptersByModule[chapter.module_id].push(chapter);
    });
    
    // Group lessons by chapter
    const lessonsByChapter = {};
    lessonsResult.rows.forEach(lesson => {
      if (!lessonsByChapter[lesson.chapter_id]) {
        lessonsByChapter[lesson.chapter_id] = [];
      }
      lessonsByChapter[lesson.chapter_id].push(lesson);
    });
    
    // Build modules structure
    const modules = modulesResult.rows.map(module => ({
      id: module.id,
      title: module.title || '',
      description: module.description || '',
      order: module.order || 0,
      chapters: (chaptersByModule[module.id] || []).map(chapter => ({
        id: chapter.id,
        moduleId: chapter.module_id,
        title: chapter.title || '',
        description: chapter.description || '',
        order: chapter.order || 0,
        lessons: (lessonsByChapter[chapter.id] || []).map(lesson => {
          const lessonData = {
            id: lesson.id,
            chapterId: lesson.chapter_id,
            type: lesson.type || 'video',
            title: lesson.title || '',
            description: lesson.description || '',
            duration: parseFloat(lesson.duration) ? Math.round(parseFloat(lesson.duration) / 60) : 0, // Convert seconds to minutes
            order: lesson.order || 0,
            videoUrl: lesson.video_url || '',
            transcript: lesson.transcript || '',
          };
          
          // Add type-specific fields based on lesson type
          if (lesson.type === 'text') {
            lessonData.content = lesson.text_content || '';
          } else if (lesson.type === 'quiz') {
            lessonData.quizId = lesson.quiz_id || null;
          } else if (lesson.type === 'assignment') {
            lessonData.assignmentId = lesson.assignment_id || null;
          } else if (lesson.type === 'material') {
            lessonData.materialUrl = lesson.material_url || '';
          } else if (lesson.type === 'video') {
            lessonData.videoUrl = lesson.video_url || '';
          }
          
          return lessonData;
        }),
      })),
    }));

    // Transform the response to match the form structure
    const transformedCourse = {
      id: course.id,
      title: course.title,
      slug: course.slug,
      regularPrice: parseFloat(course.regular_price) || 0,
      discountedPrice: parseFloat(course.discounted_price) || 0,
      aboutCourse: course.about_course || '',
      categoryId: course.category_id,
      categoryName: course.category_name || null,
      subcategoryId: course.subcategory_id,
      courseTypeId: course.course_type_id,
      courseTypeName: course.course_type_name || null,
      programTypeId: course.program_type_id,
      programTypeName: course.program_type_name || null,
      courseLevelId: course.course_level_id,
      courseLevelName: course.course_level_name || null,
      introVideoUrl: course.intro_video_url || '',
      coverImageUrl: course.cover_image_url || '',
      startDate: course.start_date ? new Date(course.start_date).toISOString() : null,
      language: course.language || 'English',
      description: course.description || '',
      certificateTemplateId: course.certificate_template_id,
      certificateUploadUrl: course.certificate_upload_url || '',
      status: course.status,
      organizationId: course.org_id,
      createdBy: course.created_by,
      createdAt: course.created_at,
      updatedAt: course.updated_at,
      pinned: course.pinned || false,
      // Additional fields for course details page
      totalLessons: parseInt(course.total_lessons || 0, 10),
      totalRatings: parseInt(course.total_ratings || 0, 10),
      averageRating: parseFloat(course.average_rating || 0),
      enrolledCount: parseInt(course.enrolled_count || 0, 10),
      // Add course type and level objects for easier access
      courseType: course.course_type_name ? { id: course.course_type_id, name: course.course_type_name } : null,
      courseLevel: course.course_level_name ? { id: course.course_level_id, name: course.course_level_name } : null,
      // Transform arrays
      instructorIds: course.instructors ? course.instructors.map((i) => i.id) : [],
      instructors: course.instructors || [],
      classIds: course.classes ? course.classes.map((c) => c.id) : [],
      subjectIds: course.subjects ? course.subjects.map((s) => s.id) : [],
      courseSkills: course.course_skills || [],
      requirements: course.requirements || [],
      tags: course.tags || [],
      // Use pre-built modules structure
      modules: modules,
    };

    console.log(`✅ [GET COURSE] Course ${id} fetched successfully`);
    console.log(`📋 [GET COURSE] Transformed course data:`, JSON.stringify(transformedCourse, null, 2));

    return NextResponse.json({
      success: true,
      course: transformedCourse,
    });
  } catch (error) {
    console.error('❌ [GET COURSE] Error fetching course:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch course' },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/courses/:id
 * Update course
 */
export async function PUT(request, { params }) {
  try {
    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course ID is required',
        },
        { status: 400 }
      );
    }
    
    const { id } = params;

    // Authentication: superadmin, admin, instructor, or vendor
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor', 'vendor']);
    
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
    const userOrgId = session.user.orgId;

    console.log(`✏️ [UPDATE COURSE] Updating course ${id} by user ${userId} (${userRole})`);

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }
    const courseData = body;

    // Fetch the course to check permissions
    const courseResult = await query(
      `SELECT c.id, c.org_id, c.created_by, u.role as creator_role
       FROM courses c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (courseResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    const course = courseResult.rows[0];

    // Check permissions
    const permissions = getCoursePermissions(course, { id: userId, role: userRole, orgId: userOrgId });
    if (!permissions.canEdit) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to edit this course' },
        { status: 403 }
      );
    }

    // Validate course data
    const { validateCourseData } = await import('@/lib/course/validation.js');
    const { validateAllCrossFields } = await import('@/lib/course/crossFieldValidation.js');
    
    const validationResult = validateCourseData(courseData);
    if (!validationResult.isValid && Object.keys(validationResult.errors).length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors,
        },
        { status: 400 }
      );
    }

    // Cross-field validation
    const crossFieldResult = validateAllCrossFields(courseData, { role: userRole, orgId: userOrgId });
    if (!crossFieldResult.isValid && Object.keys(crossFieldResult.errors).length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: crossFieldResult.errors,
        },
        { status: 400 }
      );
    }

    // Auto-set organizationId based on user role (for admin and instructor)
    if (userRole === 'admin' || userRole === 'instructor') {
      // Admin and Instructor MUST update courses in their own organization
      if (!userOrgId) {
        console.error(`❌ [UPDATE COURSE] ${userRole} user (${userId}) does not have an organization assigned`);
        return NextResponse.json(
          {
            success: false,
            error: `You must be assigned to an organization to update courses`,
          },
          { status: 403 }
        );
      }
      
      // Ensure course belongs to admin/instructor's organization
      if (course.org_id !== userOrgId) {
        return NextResponse.json(
          { success: false, error: 'You can only update courses in your own organization' },
          { status: 403 }
        );
      }
      
      // Force admin/instructor's organization (prevent changing orgId)
      courseData.organizationId = userOrgId;
      console.log(`✅ [UPDATE COURSE] Auto-set organizationId for ${userRole}: ${userOrgId}`);
    } else if (userRole === 'vendor') {
      // Vendor: Update courses without organization (global courses)
      // Clear organization-related fields that vendors shouldn't set
      courseData.organizationId = null;
      courseData.instructorIds = courseData.instructorIds || [];
      courseData.classIds = courseData.classIds || [];
      courseData.subjectIds = courseData.subjectIds || [];
      console.log(`✅ [UPDATE COURSE] Vendor course update - cleared org/instructor/class/subject fields`);
    }

    // Superadmin can update courses for any organization or globally
    // No restrictions needed for superadmin

    // Update main course record
    const updateResult = await query(
      `UPDATE courses SET
        title = $1,
        slug = $2,
        category_id = $3,
        subcategory_id = $4,
        course_type_id = $5,
        program_type_id = $6,
        course_level_id = $7,
        regular_price = $8,
        discounted_price = $9,
        about_course = $10,
        intro_video_url = $11,
        cover_image_url = $12,
        description = $13,
        language = $14,
        start_date = $15,
        certificate_template_id = $16,
        certificate_upload_url = $17,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING id, title, slug, status`,
      [
        courseData.title,
        courseData.slug,
        courseData.categoryId || null,
        courseData.subcategoryId || null,
        courseData.courseTypeId || null,
        courseData.programTypeId || null,
        courseData.courseLevelId || null,
        courseData.regularPrice || 0,
        courseData.discountedPrice || 0,
        courseData.aboutCourse || null,
        courseData.introVideoUrl || null,
        courseData.coverImageUrl || null,
        courseData.description || null,
        courseData.language || 'English',
        courseData.startDate || null,
        courseData.certificateTemplateId || null,
        courseData.certificateUploadUrl || null,
        id,
      ]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Course not found or failed to update' },
        { status: 404 }
      );
    }

    // TODO: Update related data (instructors, classes, subjects, skills, requirements, tags, modules, chapters, lessons)
    // For now, we'll update the main course record only
    // Full update logic can be implemented later

    console.log(`✅ [UPDATE COURSE] Course ${id} updated successfully`);

    return NextResponse.json({
      success: true,
      message: 'Course updated successfully',
      id: updateResult.rows[0].id,
      course: {
        id: updateResult.rows[0].id,
        title: updateResult.rows[0].title,
        slug: updateResult.rows[0].slug,
        status: updateResult.rows[0].status,
      },
    });
  } catch (error) {
    console.error('❌ [UPDATE COURSE] Error updating course:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update course' },
      { status: error.status || 500 }
    );
  }
}

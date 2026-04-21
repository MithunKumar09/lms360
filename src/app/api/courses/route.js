/**
 * Courses API Route
 * 
 * Handles course operations.
 * 
 * GET /api/courses - List courses (public/authenticated, role-based)
 * POST /api/courses - Create/publish course
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { createCourse } from '@/lib/db/courses/courses.js';
import { validateCourseData } from '@/lib/course/validation.js';
import { validateAllCrossFields } from '@/lib/course/crossFieldValidation.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/courses
 * List courses (public listing page with role-based filtering)
 * 
 * Query Parameters:
 * - role: User role (superadmin | admin | instructor | guest)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 12)
 * - search: Search query
 * - categoryIds: Comma-separated category IDs
 * - organizationId: Organization ID filter (superadmin only)
 * - tag: Tag filter
 * - level: Course level ID filter
 * - sortBy: Sort option (newest | oldest | title_asc | title_desc | price_asc | price_desc)
 * - includeAllOrganizations: Include all orgs (superadmin)
 * - includeGlobal: Include global courses (superadmin)
 * - excludeGlobal: Exclude global courses (admin)
 * - includeAllRoles: Include courses from all roles (admin/instructor)
 * - classIds: Comma-separated class IDs (instructor)
 * - subjectIds: Comma-separated subject IDs (instructor)
 */
export async function GET(request) {
  try {
    // Optional authentication - allow both authenticated and guest users
    let session = null;
    try {
      session = await auth();
    } catch (error) {
      // Continue without authentication for guest users
    }

    const userId = session?.user?.id;
    const userRole = session?.user?.role || 'guest';
    const userOrgId = session?.user?.orgId;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const offset = (page - 1) * limit;

    // Build WHERE clause - ALWAYS show only published courses for public listing
    const whereConditions = ['c.status = $1'];
    const queryParams = ['published'];
    let paramIndex = 2;

    // Role-based filtering
    if (userRole === 'superadmin') {
      const includeAllOrgs = searchParams.get('includeAllOrganizations') === 'true';
      const includeGlobal = searchParams.get('includeGlobal') === 'true';
      const orgIdFilter = searchParams.get('organizationId');

      if (orgIdFilter) {
        whereConditions.push(`c.org_id = $${paramIndex}`);
        queryParams.push(orgIdFilter);
        paramIndex++;
      } else if (!includeAllOrgs) {
        // Default: Include all organizations and global
        // No org filter needed
      }

      if (!includeGlobal && !orgIdFilter) {
        // Include global (null org_id) by default
      }
    } else if (userRole === 'admin') {
      // Admin: See courses from their organization PLUS public courses (org_id IS NULL) created by superadmin or vendor
      if (userOrgId) {
        // Check if excludeGlobal is true (for backward compatibility with other pages)
        const excludeGlobal = searchParams.get('excludeGlobal') === 'true';
        
        if (excludeGlobal) {
          // Exclude public courses (for management pages that use this flag)
          whereConditions.push(`c.org_id = $${paramIndex}`);
          queryParams.push(userOrgId);
          paramIndex++;
        } else {
          // Include both org-specific and public courses
          whereConditions.push(`(c.org_id = $${paramIndex} OR c.org_id IS NULL)`);
          queryParams.push(userOrgId);
          paramIndex++;
        }
      } else {
        // Admin without org_id should see only public courses
        whereConditions.push(`c.org_id IS NULL`);
      }
    } else if (userRole === 'instructor') {
      // Instructor: See courses from their organization matching their classes/subjects
      // PLUS public courses (org_id IS NULL) created by superadmin or vendor
      // console.log('📚 [COURSES API] ===== INSTRUCTOR FILTERING =====');
      // console.log('📚 [COURSES API] User ID:', userId);
      // console.log('📚 [COURSES API] User Role:', userRole);
      // console.log('📚 [COURSES API] User Org ID:', userOrgId);

      if (userOrgId && userId) {
        // Get instructor's assigned cohorts and subjects from instructor_classes and user_class_subject_links
        // This ensures instructors only see courses that match their assigned classes/subjects
        // console.log('📚 [COURSES API] Querying instructor_classes for user_id:', userId);
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
        // console.log('📚 [COURSES API] Instructor cohorts query result:', instructorCohortsResult.rows);
        
        // console.log('📚 [COURSES API] Querying instructor subjects for user_id:', userId);
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
        // console.log('📚 [COURSES API] Instructor subjects query result:', instructorSubjectsResult.rows);

        const instructorCohortIds = instructorCohortsResult.rows.map(row => row.cohort_id).filter(id => id != null);
        const instructorSubjectIds = instructorSubjectsResult.rows.map(row => row.subject_id).filter(id => id != null);

        // console.log('📚 [COURSES API] Extracted instructorCohortIds:', instructorCohortIds);
        // console.log('📚 [COURSES API] Extracted instructorSubjectIds:', instructorSubjectIds);

        // Filter courses to only show those matching instructor's assignments
        // Course must match at least one of: instructor's cohorts OR instructor's subjects
        const courseMatchConditions = [];
        
        // Match by cohorts (using course_assignments table)
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
        
        // Match by subjects (using course_assignments table)
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

        // Build combined condition: (org-specific courses matching criteria) OR (public courses)
        const orgSpecificConditions = [];
        orgSpecificConditions.push(`c.org_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;

        if (courseMatchConditions.length > 0) {
          // console.log('📚 [COURSES API] Instructor match conditions count:', courseMatchConditions.length);
          // console.log('📚 [COURSES API] Instructor match conditions:', courseMatchConditions);
          orgSpecificConditions.push(`(${courseMatchConditions.join(' OR ')})`);
        }

        // Combine: (org-specific courses) OR (public courses)
        if (orgSpecificConditions.length > 1) {
          // Has match conditions: (org_id = X AND (match conditions)) OR (org_id IS NULL)
          whereConditions.push(`((${orgSpecificConditions.join(' AND ')}) OR (c.org_id IS NULL))`);
        } else {
          // No match conditions: (org_id = X) OR (org_id IS NULL)
          whereConditions.push(`((${orgSpecificConditions.join(' AND ')}) OR (c.org_id IS NULL))`);
        }
      } else {
        // Instructor without org_id should see only public courses
        // console.log('📚 [COURSES API] ⚠️ Instructor without org_id or userId - showing only public courses');
        whereConditions.push(`c.org_id IS NULL`);
      }
      
      // console.log('📚 [COURSES API] Final WHERE conditions for instructor:', whereConditions);
      // console.log('📚 [COURSES API] Final query params count for instructor:', queryParams.length);
    } else if (userRole === 'student' || userRole === 'alumni') {
      // Student/Alumni: See courses from their organization matching their classes, subjects, and instructors
      // PLUS public courses (org_id IS NULL) created by superadmin or vendor
      // console.log('📚 [COURSES API] ===== STUDENT/ALUMNI FILTERING =====');
      // console.log('📚 [COURSES API] User ID:', userId);
      // console.log('📚 [COURSES API] User Role:', userRole);
      // console.log('📚 [COURSES API] User Org ID:', userOrgId);

      if (userOrgId && userId) {
        // Get student's classes (cohort_ids) from student_links and user_class_subject_links
        // console.log('📚 [COURSES API] Querying student_links for user_id:', userId);
        const studentLinksResult = await query(
          `SELECT * FROM student_links WHERE user_id = $1`,
          [userId]
        );
        // console.log('📚 [COURSES API] student_links result:', studentLinksResult.rows);

        // console.log('📚 [COURSES API] Querying user_class_subject_links for user_id:', userId);
        const userClassSubjectLinksResult = await query(
          `SELECT * FROM user_class_subject_links WHERE user_id = $1 AND link_type IN ('student', 'alumni')`,
          [userId]
        );
        // console.log('📚 [COURSES API] user_class_subject_links result:', userClassSubjectLinksResult.rows);

        const studentClassesResult = await query(
          `SELECT DISTINCT cohort_id 
           FROM student_links 
           WHERE user_id = $1
           UNION
           SELECT DISTINCT cohort_id 
           FROM user_class_subject_links 
           WHERE user_id = $1 AND link_type IN ('student', 'alumni')`,
          [userId]
        );
        // console.log('📚 [COURSES API] Combined classes query result:', studentClassesResult.rows);

        // Get student's subjects from user_class_subject_links -> subject_offerings -> subject_catalog
        // console.log('📚 [COURSES API] Querying subjects for user_id:', userId);
        const studentSubjectsResult = await query(
          `SELECT DISTINCT so.subject_id, so.id as subject_offering_id, ucsl.cohort_id
           FROM user_class_subject_links ucsl
           JOIN subject_offerings so ON ucsl.subject_offering_id = so.id
           WHERE ucsl.user_id = $1 
             AND ucsl.link_type IN ('student', 'alumni')
             AND so.subject_id IS NOT NULL`,
          [userId]
        );
        // console.log('📚 [COURSES API] Subjects query result:', studentSubjectsResult.rows);

        // Get student's instructors from user_class_subject_links -> subject_offerings -> teacher_assignments
        // console.log('📚 [COURSES API] Querying instructors for user_id:', userId);
        const studentInstructorsResult = await query(
          `SELECT DISTINCT ta.teacher_id, so.subject_id, ucsl.cohort_id
           FROM user_class_subject_links ucsl
           JOIN subject_offerings so ON ucsl.subject_offering_id = so.id
           JOIN teacher_assignments ta ON so.id = ta.subject_offering_id
           WHERE ucsl.user_id = $1 
             AND ucsl.link_type IN ('student', 'alumni')
             AND ta.teacher_id IS NOT NULL`,
          [userId]
        );
        // console.log('📚 [COURSES API] Instructors query result:', studentInstructorsResult.rows);

        const classIds = studentClassesResult.rows.map(row => row.cohort_id);
        const subjectIds = studentSubjectsResult.rows.map(row => row.subject_id).filter(id => id != null);
        const instructorIds = studentInstructorsResult.rows.map(row => row.teacher_id).filter(id => id != null);

        // console.log('📚 [COURSES API] Extracted classIds:', classIds);
        // console.log('📚 [COURSES API] Extracted subjectIds:', subjectIds);
        // console.log('📚 [COURSES API] Extracted instructorIds:', instructorIds);

        // Build OR conditions for matching courses
        // Course must match at least one of: class, subject, or instructor
        const matchConditions = [];

        // Filter by class IDs if student has classes
        if (classIds.length > 0) {
          const classPlaceholders = classIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
          matchConditions.push(`EXISTS (
            SELECT 1 FROM course_classes cc 
            WHERE cc.course_id = c.id 
            AND cc.class_id IN (${classPlaceholders})
          )`);
          queryParams.push(...classIds);
          paramIndex += classIds.length;
        }

        // Filter by subject IDs if student has subjects
        if (subjectIds.length > 0) {
          const subjectPlaceholders = subjectIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
          matchConditions.push(`EXISTS (
            SELECT 1 FROM course_subjects cs 
            WHERE cs.course_id = c.id 
            AND cs.subject_id IN (${subjectPlaceholders})
          )`);
          queryParams.push(...subjectIds);
          paramIndex += subjectIds.length;
        }

        // Filter by instructor IDs if student has instructors
        if (instructorIds.length > 0) {
          const instructorPlaceholders = instructorIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
          matchConditions.push(`EXISTS (
            SELECT 1 FROM course_instructors ci 
            WHERE ci.course_id = c.id 
            AND ci.instructor_id IN (${instructorPlaceholders})
          )`);
          queryParams.push(...instructorIds);
          paramIndex += instructorIds.length;
        }

        // Build combined condition: (org-specific courses matching criteria) OR (public courses)
        const orgSpecificConditions = [];
        orgSpecificConditions.push(`c.org_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;

        if (matchConditions.length > 0) {
          // console.log('📚 [COURSES API] Match conditions count:', matchConditions.length);
          // console.log('📚 [COURSES API] Match conditions:', matchConditions);
          orgSpecificConditions.push(`(${matchConditions.join(' OR ')})`);
        }

        // Combine: (org-specific courses) OR (public courses)
        if (orgSpecificConditions.length > 1) {
          // Has match conditions: (org_id = X AND (match conditions)) OR (org_id IS NULL)
          whereConditions.push(`((${orgSpecificConditions.join(' AND ')}) OR (c.org_id IS NULL))`);
        } else {
          // No match conditions: (org_id = X) OR (org_id IS NULL)
          whereConditions.push(`((${orgSpecificConditions.join(' AND ')}) OR (c.org_id IS NULL))`);
        }
      } else {
        // Student without org_id should see only public courses
        // console.log('📚 [COURSES API] ⚠️ Student without org_id or userId - showing only public courses');
        whereConditions.push(`c.org_id IS NULL`);
      }
      
      // console.log('📚 [COURSES API] Final WHERE conditions:', whereConditions);
      // console.log('📚 [COURSES API] Final query params count:', queryParams.length);
    } else if (userRole === 'vendor') {
      // Vendor: See only public courses (org_id IS NULL) - both superadmin and vendor created courses
      // console.log('📚 [COURSES API] ===== VENDOR FILTERING =====');
      // console.log('📚 [COURSES API] User ID:', userId);
      // console.log('📚 [COURSES API] User Role:', userRole);
      whereConditions.push(`c.org_id IS NULL`);
      // No additional param needed
      // console.log('📚 [COURSES API] Final WHERE conditions for vendor:', whereConditions);
    } else {
      // Guest: See only global courses (no org_id)
      whereConditions.push(`c.org_id IS NULL`);
      // No additional param needed
    }

    // Additional filters
    const search = searchParams.get('search');
    if (search) {
      whereConditions.push(`(c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }

    const categoryIds = searchParams.get('categoryIds');
    if (categoryIds) {
      const categoryIdArray = categoryIds.split(',').filter(Boolean);
      if (categoryIdArray.length > 0) {
        const placeholders = categoryIdArray.map((_, idx) => `$${paramIndex + idx}`).join(', ');
        whereConditions.push(`c.category_id IN (${placeholders})`);
        queryParams.push(...categoryIdArray);
        paramIndex += categoryIdArray.length;
      }
    }

    const levelId = searchParams.get('level');
    if (levelId) {
      whereConditions.push(`c.course_level_id = $${paramIndex}`);
      queryParams.push(levelId);
      paramIndex++;
    }

    const tag = searchParams.get('tag');
    if (tag) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM course_tags ct 
        WHERE ct.course_id = c.id 
        AND ct.tag ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${tag}%`);
      paramIndex++;
    }

    // Filter by instructor IDs (for "Author More Courses" feature)
    const instructorIds = searchParams.get('instructorIds');
    if (instructorIds) {
      const instructorIdArray = instructorIds.split(',').filter(Boolean);
      if (instructorIdArray.length > 0) {
        const placeholders = instructorIdArray.map((_, idx) => `$${paramIndex + idx}`).join(', ');
        whereConditions.push(`EXISTS (
          SELECT 1 FROM course_instructors ci 
          WHERE ci.course_id = c.id 
          AND ci.instructor_id IN (${placeholders})
        )`);
        queryParams.push(...instructorIdArray);
        paramIndex += instructorIdArray.length;
      }
    }

    // Build WHERE clause
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Build ORDER BY clause
    let orderBy = 'c.created_at DESC'; // Default: newest first
    const sortBy = searchParams.get('sortBy');
    if (sortBy === 'oldest') {
      orderBy = 'c.created_at ASC';
    } else if (sortBy === 'title_asc') {
      orderBy = 'c.title ASC';
    } else if (sortBy === 'title_desc') {
      orderBy = 'c.title DESC';
    } else if (sortBy === 'price_asc') {
      orderBy = 'COALESCE(c.discounted_price, c.regular_price) ASC NULLS LAST';
    } else if (sortBy === 'price_desc') {
      orderBy = 'COALESCE(c.discounted_price, c.regular_price) DESC NULLS LAST';
    } else if (sortBy === 'newest') {
      orderBy = 'c.created_at DESC';
    }

    // Get total count
    const countQuery = `SELECT COUNT(DISTINCT c.id) as total FROM courses c ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get courses with pagination and full details
    const coursesQuery = `SELECT 
        c.id,
        c.title,
        c.slug,
        c.description,
        c.about_course,
        c.intro_video_url,
        c.cover_image_url,
        c.regular_price,
        c.discounted_price,
        c.course_type_id,
        c.course_level_id,
        c.category_id,
        c.subcategory_id,
        c.org_id,
        c.created_at,
        -- Get category
        (
          SELECT json_build_object('id', cat.id, 'name', cat.name)
          FROM course_categories cat
          WHERE cat.id = c.category_id
          LIMIT 1
        ) as category,
        -- Get subcategory
        (
          SELECT json_build_object('id', subcat.id, 'name', subcat.name)
          FROM course_subcategories subcat
          WHERE subcat.id = c.subcategory_id
          LIMIT 1
        ) as subcategory,
        -- Get level
        (
          SELECT json_build_object('id', cl.id, 'name', cl.name)
          FROM course_levels cl
          WHERE cl.id = c.course_level_id
        ) as level,
        -- Get course type
        (
          SELECT json_build_object('id', ct.id, 'name', ct.name)
          FROM course_types ct
          WHERE ct.id = c.course_type_id
        ) as course_type,
        -- Get instructors
        (
          SELECT json_agg(
            json_build_object(
              'id', u.id,
              'name', COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email),
              'email', u.email,
              'profile_url', u.avatar_url
            )
          )
          FROM course_instructors ci
          JOIN users u ON ci.instructor_id = u.id
          WHERE ci.course_id = c.id
        ) as instructors,
        -- Get organization
        (
          SELECT json_build_object('id', o.id, 'name', o.name)
          FROM organizations o
          WHERE o.id = c.org_id
          LIMIT 1
        ) as organization,
        -- Get rating statistics
        (
          SELECT json_build_object(
            'averageRating', COALESCE(AVG(rating)::NUMERIC(10,2), 0),
            'totalReviews', COUNT(*)
          )
          FROM course_reviews
          WHERE course_id = c.id
        ) as ratings,
        -- Get creator info (for filtering by creator role)
        (
          SELECT json_build_object(
            'id', u.id,
            'role', u.role
          )
          FROM users u
          WHERE u.id = c.created_by
        ) as created_by_user
       FROM courses c
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    
    const finalQueryParams = [...queryParams, limit, offset];
    const coursesResult = await query(coursesQuery, finalQueryParams);

    // Fetch modules for each course (since modules are in separate tables)
    const courseIds = coursesResult.rows.map(row => row.id);
    let modulesMap = {};
    
    if (courseIds.length > 0) {
      const placeholders = courseIds.map((_, idx) => `$${idx + 1}`).join(', ');
      const modulesQuery = `
        SELECT 
          cm.id as module_id,
          cm.course_id,
          cm.title as module_title,
          cm.description as module_description,
          cm.order_index as module_order,
          cc.id as chapter_id,
          cc.title as chapter_title,
          cc.description as chapter_description,
          cc.order_index as chapter_order,
          cl.id as lesson_id,
          cl.title as lesson_title,
          cl.description as lesson_description,
          cl.lesson_type,
          cl.video_url,
          cl.text_content,
          cl.material_url,
          cl.duration,
          cl.order_index as lesson_order,
          cl.is_preview
        FROM course_modules cm
        LEFT JOIN course_chapters cc ON cc.module_id = cm.id
        LEFT JOIN course_lessons cl ON cl.chapter_id = cc.id
        WHERE cm.course_id IN (${placeholders})
        ORDER BY cm.order_index, cc.order_index, cl.order_index
      `;
      
      const modulesResult = await query(modulesQuery, courseIds);
      
      // Build modules structure
      modulesResult.rows.forEach(row => {
        if (!modulesMap[row.course_id]) {
          modulesMap[row.course_id] = {};
        }
        if (!modulesMap[row.course_id][row.module_id]) {
          modulesMap[row.course_id][row.module_id] = {
            id: row.module_id,
            title: row.module_title,
            description: row.module_description,
            orderIndex: row.module_order,
            chapters: {}
          };
        }
        if (row.chapter_id && !modulesMap[row.course_id][row.module_id].chapters[row.chapter_id]) {
          modulesMap[row.course_id][row.module_id].chapters[row.chapter_id] = {
            id: row.chapter_id,
            title: row.chapter_title,
            description: row.chapter_description,
            orderIndex: row.chapter_order,
            lessons: []
          };
        }
        if (row.lesson_id) {
          const chapter = modulesMap[row.course_id][row.module_id].chapters[row.chapter_id];
          if (chapter) {
            chapter.lessons.push({
              id: row.lesson_id,
              title: row.lesson_title,
              description: row.lesson_description,
              type: row.lesson_type,
              videoUrl: row.video_url,
              textContent: row.text_content,
              materialUrl: row.material_url,
              duration: row.duration,
              orderIndex: row.lesson_order,
              isPreview: row.is_preview
            });
          }
        }
      });
    }

    // Transform courses
    // console.log('📚 [COURSES API] ===== TRANSFORMING COURSES =====');
    // console.log('📚 [COURSES API] Total rows to transform:', coursesResult.rows.length);
    
    const courses = coursesResult.rows.map((row) => {
      const courseModules = modulesMap[row.id] 
        ? Object.values(modulesMap[row.id]).map(module => ({
            ...module,
            chapters: Object.values(module.chapters).map(chapter => ({
              ...chapter,
              lessons: chapter.lessons || []
            }))
          }))
        : [];
      
      // Determine if course is free based on course type name
      const courseTypeName = row.course_type?.name?.toLowerCase() || '';
      const isFree = courseTypeName === 'free' || 
                     (!row.regular_price || row.regular_price === 0) && 
                     (!row.discounted_price || row.discounted_price === 0);
      
      // Calculate effective price (use discounted_price if available, otherwise regular_price)
      // For free courses, set price to null/0
      const effectivePrice = isFree 
        ? null 
        : (row.discounted_price && row.discounted_price > 0 
        ? row.discounted_price 
          : (row.regular_price && row.regular_price > 0 ? row.regular_price : null));
      
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description,
        aboutCourse: row.about_course,
        introVideoUrl: row.intro_video_url,
        coverImageUrl: row.cover_image_url || null, // Cover image URL from database
        thumbnailUrl: row.cover_image_url || null, // Use cover_image_url as thumbnail fallback
        regularPrice: isFree ? null : row.regular_price,
        discountedPrice: isFree ? null : row.discounted_price,
        price: effectivePrice, // For backward compatibility - null for free courses
        isFree: isFree, // Explicitly set isFree flag
        categoryName: row.category?.name || null,
        categoryId: row.category?.id || null,
        subcategoryName: row.subcategory?.name || null,
        subcategoryId: row.subcategory?.id || null,
        level: row.level?.name || null,
        levelId: row.level?.id || null,
        courseTypeName: row.course_type?.name || null,
        courseTypeId: row.course_type?.id || null,
        organization: row.organization,
        organizationId: row.org_id,
        instructors: row.instructors || [],
        createdAt: row.created_at,
        modules: courseModules,
        // Calculate lesson count for CourseCard compatibility
        formattedLessonCount: (() => {
          const totalLessons = courseModules.reduce((total, module) => {
            return total + (module.chapters?.reduce((chapterTotal, chapter) => {
              return chapterTotal + (chapter.lessons?.length || 0);
            }, 0) || 0);
          }, 0);
          return totalLessons === 1 ? '1 Lesson' : `${totalLessons} Lessons`;
        })(),
        // Rating data
        averageRating: parseFloat(row.ratings?.averageRating || 0),
        totalReviews: parseInt(row.ratings?.totalReviews || 0, 10),
        // Creator info (for filtering)
        creatorRole: row.created_by_user?.role || null,
      };
    });

    // console.log('📚 [COURSES API] ===== RESPONSE SUMMARY =====');
    // console.log('📚 [COURSES API] Total courses:', total);
    // console.log('📚 [COURSES API] Courses returned:', courses.length);
    // console.log('📚 [COURSES API] Pagination:', { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) });
    
    return NextResponse.json({
      success: true,
      courses,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch courses',
        courses: [],
        pagination: {
          page: 1,
          limit: 12,
          totalItems: 0,
          totalPages: 0,
        },
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/courses
 * Create/publish course
 */
export async function POST(request) {
  try {
    // Authentication: superadmin, admin, or instructor
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor', 'vendor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;

    const body = await request.json();
    const courseData = body;

    // Validate course data
    const validationResult = validateCourseData(courseData);
    if (!validationResult.isValid && Object.keys(validationResult.errors).length > 0) {
      console.error('❌ [API] Course validation failed:', validationResult.errors);
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
      console.error('❌ [API] Cross-field validation failed:', crossFieldResult.errors);
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: crossFieldResult.errors,
        },
        { status: 400 }
      );
    }

    // Auto-set organizationId based on user role
    if (userRole === 'admin' || userRole === 'instructor') {
      // Admin and Instructor MUST create courses for their own organization
      if (!userOrgId) {
        console.error(`❌ [API] ${userRole} user (${userId}) does not have an organization assigned`);
        return NextResponse.json(
          {
            success: false,
            error: `You must be assigned to an organization to create courses`,
          },
          { status: 403 }
        );
      }
      
      // Force admin/instructor's organization (override any client-side value)
      courseData.organizationId = userOrgId;
      console.log(`✅ [API] Auto-set organizationId for ${userRole}: ${userOrgId}`);
      
      // Prevent admin/instructor from creating courses for other organizations
      if (courseData.organizationId !== userOrgId) {
        return NextResponse.json(
          { success: false, error: 'You can only create courses for your own organization' },
          { status: 403 }
        );
      }
    } else if (userRole === 'vendor') {
      // Vendor: Create courses without organization (global courses)
      // Clear organization-related fields that vendors shouldn't set
      courseData.organizationId = null;
      courseData.instructorIds = [];
      courseData.classIds = [];
      courseData.subjectIds = [];
      console.log(`✅ [API] Vendor course creation - cleared org/instructor/class/subject fields`);
    }

    // Superadmin can create courses for any organization or globally (null)
    // If superadmin doesn't specify organizationId, it will be null (global course)
    // No restrictions needed for superadmin

    // Create course in database
    const course = await createCourse({
      title: courseData.title,
      slug: courseData.slug,
      createdBy: userId,
      orgId: courseData.organizationId || null,
      courseData: courseData,
    });

    return NextResponse.json({
      success: true,
      id: course.id,
      message: 'Course published successfully',
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        status: course.status,
      },
    });
  } catch (error) {
    console.error('Error publishing course:', error);
    
    // Handle duplicate slug error
    if (error.code === '23505' && error.constraint === 'courses_slug_key') {
      console.error('❌ [API] Duplicate slug error:', error.detail);
      return NextResponse.json(
        {
          success: false,
          error: 'A course with this slug already exists',
          message: 'A course with this slug already exists. Please change the course slug and try again.',
          field: 'slug',
        },
        { status: 409 }
      );
    }

    console.error('❌ [API] Error publishing course:', error.message || error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to publish course',
        message: error.message || 'Failed to publish course',
      },
      { status: error.status || 500 }
    );
  }
}


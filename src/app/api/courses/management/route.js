/**
 * Course Management API Route
 * 
 * Handles role-based course fetching for course management page.
 * 
 * GET /api/courses/management - Fetch courses with role-based filtering
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { formatLessonCount, formatCourseDuration } from '@/lib/utils/courseUtils.js';

/**
 * GET /api/courses/management
 * Fetch courses with role-based filtering and pagination
 * 
 * Query Parameters:
 * - role: User role (superadmin | admin | instructor)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - search: Search query
 * - instructorId: Instructor ID filter
 * - level: Course level filter
 * - organizationId: Organization ID filter
 * - classId: Class ID filter
 * - subjectId: Subject ID filter
 * - status: Status filter (active | inactive)
 * - sortBy: Sort option (newest | oldest | title_asc | title_desc)
 * - dateFrom: Start date filter (ISO date)
 * - dateTo: End date filter (ISO date)
 * - createdBy: Creator role filter (for superadmin)
 * - includeGlobal: Include global courses (for superadmin)
 * - includeOrgSpecific: Include org-specific courses (for superadmin)
 * - classIds: Comma-separated class IDs (for instructor)
 * - subjectIds: Comma-separated subject IDs (for instructor)
 */
export async function GET(request) {
  console.log('📚 [COURSE MANAGEMENT API] ===== REQUEST STARTED =====');
  try {
    // Authentication: superadmin, admin, instructor, or vendor
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor', 'vendor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;

    console.log('📚 [COURSE MANAGEMENT API] User:', {
      userId,
      userRole,
      userOrgId,
    });

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    console.log('📚 [COURSE MANAGEMENT API] Query params:', {
      page,
      limit,
      offset,
      allParams: Object.fromEntries(searchParams.entries()),
    });

    // Build WHERE clause based on role
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Role-based filtering
    if (userRole === 'superadmin') {
      // Superadmin: Can see all courses for management purposes
      // If createdBy filter is set to 'superadmin', only show superadmin-created courses
      // Otherwise, show all courses (for management)
      const createdBy = searchParams.get('createdBy');
      console.log('📚 [COURSE MANAGEMENT API] Superadmin createdBy filter:', createdBy);
      
      if (createdBy === 'superadmin') {
        // Get all superadmin users
        const superadminUsersResult = await query(
          `SELECT id FROM users WHERE role = 'superadmin'`,
          []
        );
        const superadminUserIds = superadminUsersResult.rows.map(row => row.id);
        
        console.log('📚 [COURSE MANAGEMENT API] Superadmin user IDs:', {
          count: superadminUserIds.length,
          ids: superadminUserIds,
        });
        
        if (superadminUserIds.length > 0) {
          const placeholders = superadminUserIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
          whereConditions.push(`c.created_by IN (${placeholders})`);
          queryParams.push(...superadminUserIds);
          paramIndex += superadminUserIds.length;
          console.log('📚 [COURSE MANAGEMENT API] Added created_by filter for superadmin users');
        } else {
          console.warn('📚 [COURSE MANAGEMENT API] No superadmin users found! Using current user ID as fallback.');
          // Fallback: Use current user ID if no superadmin users found
          whereConditions.push(`c.created_by = $${paramIndex}`);
          queryParams.push(userId);
          paramIndex++;
        }
      } else {
        // No createdBy filter or not 'superadmin' - show all courses for management
        console.log('📚 [COURSE MANAGEMENT API] Superadmin - showing all courses (no createdBy filter)');
      }

      // Include global courses if requested
      const includeGlobal = searchParams.get('includeGlobal') === 'true';
      const includeOrgSpecific = searchParams.get('includeOrgSpecific') === 'true';
      
      // Only apply org_id filters if createdBy filter is set
      if (createdBy === 'superadmin') {
        if (includeGlobal && includeOrgSpecific) {
          // Include both global and org-specific
          // Already handled by created_by filter
        } else if (includeGlobal) {
          whereConditions.push(`c.org_id IS NULL`);
        } else if (includeOrgSpecific) {
          whereConditions.push(`c.org_id IS NOT NULL`);
        }
      }
    } else if (userRole === 'admin') {
      // Admin: All courses of their organization (created by superadmin, admin, or instructor)
      // If admin has no orgId, show global courses they created
      if (userOrgId) {
        whereConditions.push(`c.org_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
        console.log('📚 [COURSE MANAGEMENT API] Admin with orgId - filtering by organization:', userOrgId);
      } else {
        // Admin with no orgId: Show global courses (org_id IS NULL) they created
        whereConditions.push(`c.org_id IS NULL AND c.created_by = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
        console.log('📚 [COURSE MANAGEMENT API] Admin with no orgId - showing global courses they created');
      }
    } else if (userRole === 'instructor') {
      // Check if filtering by created_by (for assignment/quiz creation)
      const createdBy = searchParams.get('createdBy');
      
      if (createdBy === 'instructor') {
        // Filter by courses created by this instructor only
        whereConditions.push(`c.created_by = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
        console.log('📚 [COURSE MANAGEMENT API] Instructor - filtering by created_by:', userId);
      } else {
        // Instructor: Courses of their organization, filtered by their classes and subjects
        whereConditions.push(`c.org_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;

        // Get instructor's classes from instructor_classes table
      const instructorClassesResult = await query(
        `SELECT DISTINCT cohort_id 
         FROM instructor_classes 
         WHERE instructor_user_id = $1`,
        [userId]
      );
      
      // Get instructor's subjects from instructor_classes -> subject_offerings -> subject_catalog
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

      console.log('📚 [COURSE MANAGEMENT API] Instructor classes:', classIds);
      console.log('📚 [COURSE MANAGEMENT API] Instructor subjects:', subjectIds);

      // Filter by class IDs from query params or user's classes
      const classIdsParam = searchParams.get('classIds');
      const filterClassIds = classIdsParam 
        ? classIdsParam.split(',').map(id => id.trim())
        : classIds;

      if (filterClassIds.length > 0) {
        const classPlaceholders = filterClassIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
        whereConditions.push(`EXISTS (
          SELECT 1 FROM course_classes cc 
          WHERE cc.course_id = c.id 
          AND cc.class_id IN (${classPlaceholders})
        )`);
        queryParams.push(...filterClassIds);
        paramIndex += filterClassIds.length;
      }

      // Filter by subject IDs from query params or user's subjects
      const subjectIdsParam = searchParams.get('subjectIds');
      const filterSubjectIds = subjectIdsParam 
        ? subjectIdsParam.split(',').map(id => id.trim())
        : subjectIds;

      if (filterSubjectIds.length > 0) {
        const subjectPlaceholders = filterSubjectIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
        whereConditions.push(`EXISTS (
          SELECT 1 FROM course_subjects cs 
          WHERE cs.course_id = c.id 
          AND cs.subject_id IN (${subjectPlaceholders})
        )`);
        queryParams.push(...filterSubjectIds);
        paramIndex += filterSubjectIds.length;
      }
      }
    } else if (userRole === 'vendor') {
      // Vendor: Only see courses they created
      whereConditions.push(`c.created_by = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
      console.log('📚 [COURSE MANAGEMENT API] Vendor - filtering by created_by:', userId);
    }

    // Status filter: For management page, show both published and draft by default
    // Only filter by status if explicitly requested
    const statusFilter = searchParams.get('status');
    if (statusFilter) {
      // Map frontend status to database status
      // 'active' -> 'published', 'inactive' -> 'draft'
      let dbStatus = statusFilter;
      if (statusFilter === 'active') {
        dbStatus = 'published';
      } else if (statusFilter === 'inactive') {
        dbStatus = 'draft';
      }
      whereConditions.push(`c.status = $${paramIndex}`);
      queryParams.push(dbStatus);
      paramIndex++;
      console.log('📚 [COURSE MANAGEMENT API] Status filter applied:', { statusFilter, dbStatus });
    } else {
      // Default: Show both published and draft courses (for management purposes)
      // This allows admins to see and manage all courses regardless of status
      whereConditions.push(`c.status IN ($${paramIndex}, $${paramIndex + 1})`);
      queryParams.push('published', 'draft');
      paramIndex += 2;
      console.log('📚 [COURSE MANAGEMENT API] Default status filter: published OR draft (all courses)');
    }

    // Additional filters
    if (searchParams.get('search')) {
      whereConditions.push(`(c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`);
      queryParams.push(`%${searchParams.get('search')}%`);
      paramIndex++;
    }

    if (searchParams.get('level')) {
      whereConditions.push(`c.course_level_id = $${paramIndex}`);
      queryParams.push(searchParams.get('level'));
      paramIndex++;
    }

    if (searchParams.get('organizationId')) {
      whereConditions.push(`c.org_id = $${paramIndex}`);
      queryParams.push(searchParams.get('organizationId'));
      paramIndex++;
    }

    if (searchParams.get('instructorId')) {
      const instructorId = searchParams.get('instructorId');
      
      // For admin/superadmin: Filter courses by instructor's classes/subjects/cohorts
      // This ensures we show courses that match the instructor's assigned classes/subjects
      if (userRole === 'admin' || userRole === 'superadmin') {
        // Get instructor's classes (cohorts) from instructor_classes table
        const instructorClassesResult = await query(
          `SELECT DISTINCT cohort_id 
           FROM instructor_classes 
           WHERE instructor_user_id = $1`,
          [instructorId]
        );
        
        // Get instructor's subjects from instructor_classes -> subject_offerings -> subject_catalog
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
          [instructorId]
        );
        
        const instructorClassIds = instructorClassesResult.rows.map(row => row.cohort_id);
        const instructorSubjectIds = instructorSubjectsResult.rows.map(row => row.subject_id).filter(id => id != null);
        
        console.log('📚 [COURSE MANAGEMENT API] Filtering by instructor:', {
          instructorId,
          classIds: instructorClassIds,
          subjectIds: instructorSubjectIds,
        });
        
        // Build conditions for courses matching instructor's classes/subjects
        const courseMatchConditions = [];
        
        // Match by classes (cohorts)
        if (instructorClassIds.length > 0) {
          const classPlaceholders = instructorClassIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
          courseMatchConditions.push(`EXISTS (
            SELECT 1 FROM course_classes cc 
            WHERE cc.course_id = c.id 
            AND cc.class_id IN (${classPlaceholders})
          )`);
          queryParams.push(...instructorClassIds);
          paramIndex += instructorClassIds.length;
        }
        
        // Match by subjects
        if (instructorSubjectIds.length > 0) {
          const subjectPlaceholders = instructorSubjectIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
          courseMatchConditions.push(`EXISTS (
            SELECT 1 FROM course_subjects cs 
            WHERE cs.course_id = c.id 
            AND cs.subject_id IN (${subjectPlaceholders})
          )`);
          queryParams.push(...instructorSubjectIds);
          paramIndex += instructorSubjectIds.length;
        }
        
        // If instructor has classes or subjects, filter courses by them
        // If instructor has no assignments, show no courses
        if (courseMatchConditions.length > 0) {
          whereConditions.push(`(${courseMatchConditions.join(' OR ')})`);
        } else {
          // If instructor has no classes/subjects, show no courses
          console.log('📚 [COURSE MANAGEMENT API] Instructor has no classes/subjects - showing no courses');
          whereConditions.push(`1 = 0`); // Always false condition - no courses
        }
      } else {
        // For instructor role: Use existing course_instructors filter
        whereConditions.push(`EXISTS (
          SELECT 1 FROM course_instructors ci 
          WHERE ci.course_id = c.id 
          AND ci.instructor_id = $${paramIndex}
        )`);
        queryParams.push(instructorId);
        paramIndex++;
      }
    }

    if (searchParams.get('classId')) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM course_classes cc 
        WHERE cc.course_id = c.id 
        AND cc.class_id = $${paramIndex}
      )`);
      queryParams.push(searchParams.get('classId'));
      paramIndex++;
    }

    if (searchParams.get('subjectId')) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM course_subjects cs 
        WHERE cs.course_id = c.id 
        AND cs.subject_id = $${paramIndex}
      )`);
      queryParams.push(searchParams.get('subjectId'));
      paramIndex++;
    }

    if (searchParams.get('dateFrom')) {
      whereConditions.push(`c.created_at >= $${paramIndex}`);
      queryParams.push(searchParams.get('dateFrom'));
      paramIndex++;
    }

    if (searchParams.get('dateTo')) {
      whereConditions.push(`c.created_at <= $${paramIndex}`);
      queryParams.push(searchParams.get('dateTo'));
      paramIndex++;
    }

    // Build WHERE clause
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    console.log('📚 [COURSE MANAGEMENT API] WHERE conditions:', {
      count: whereConditions.length,
      conditions: whereConditions,
      queryParams: queryParams,
      whereClause,
    });

    // Debug: Check total courses in database (all statuses)
    const debugTotalResult = await query(
      `SELECT COUNT(*) as total, status, COUNT(*) FILTER (WHERE created_by IN (SELECT id FROM users WHERE role = 'superadmin')) as superadmin_created
       FROM courses
       GROUP BY status`,
      []
    );
    console.log('📚 [COURSE MANAGEMENT API] Debug - All courses by status:', debugTotalResult.rows);

    // Debug: Get all courses with details including organization
    const debugAllCourses = await query(
      `SELECT c.id, c.title, c.status, c.org_id, c.created_by, u.role as creator_role, u.id as creator_id,
       o.name as org_name, o.id as org_id_from_org_table
       FROM courses c
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN organizations o ON c.org_id = o.id
       ORDER BY c.created_at DESC
       LIMIT 10`,
      []
    );
    console.log('📚 [COURSE MANAGEMENT API] Debug - All courses (first 10):', JSON.stringify(debugAllCourses.rows, null, 2));

    // Debug: Check courses created by superadmin
    const debugSuperadminResult = await query(
      `SELECT COUNT(*) as total
       FROM courses c
       JOIN users u ON c.created_by = u.id
       WHERE u.role = 'superadmin' AND c.status = 'published'`,
      []
    );
    console.log('📚 [COURSE MANAGEMENT API] Debug - Published courses by superadmin:', debugSuperadminResult.rows[0]?.total || 0);
    
    // Debug: Check if courses match the WHERE conditions we're building
    if (whereConditions.length > 0) {
      const testQuery = `SELECT COUNT(*) as total
       FROM courses c
       ${whereClause}`;
      const testResult = await query(testQuery, queryParams);
      console.log('📚 [COURSE MANAGEMENT API] Debug - Courses matching WHERE conditions:', testResult.rows[0]?.total || 0);
    }

    // Build ORDER BY clause
    let orderBy = 'c.created_at DESC'; // Default: newest first
    const sortBy = searchParams.get('sortBy');
    if (sortBy === 'oldest') {
      orderBy = 'c.created_at ASC';
    } else if (sortBy === 'title_asc') {
      orderBy = 'c.title ASC';
    } else if (sortBy === 'title_desc') {
      orderBy = 'c.title DESC';
    } else if (sortBy === 'newest') {
      orderBy = 'c.created_at DESC';
    }

    // Get total count
    const countQuery = `SELECT COUNT(DISTINCT c.id) as total
       FROM courses c
       ${whereClause}`;
    console.log('📚 [COURSE MANAGEMENT API] Count query:', countQuery);
    console.log('📚 [COURSE MANAGEMENT API] Count query params:', queryParams);
    
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);
    
    console.log('📚 [COURSE MANAGEMENT API] Total courses found:', total);

    // Get courses with pagination
    const coursesQuery = `SELECT 
        c.id,
        c.title,
        c.slug,
        c.status,
        c.org_id,
        c.org_id as org_id_raw,
        c.created_at,
        c.created_by,
        c.course_level_id,
        c.intro_video_url,
        c.regular_price,
        c.discounted_price,
        c.category_id,
        c.course_type_id,
        -- Get category name
        (SELECT name FROM course_categories WHERE id = c.category_id) as category_name,
        -- Get course type name
        (SELECT name FROM course_types WHERE id = c.course_type_id) as course_type_name,
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
        -- Get instructor info (enhanced with avatar)
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
        ) as instructors,
        -- Get organization info
        (
          SELECT json_build_object(
            'id', o.id,
            'name', o.name
          )
          FROM organizations o
          WHERE o.id = c.org_id
          LIMIT 1
        ) as organization,
        -- Get classes (cohorts)
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
        ) as created_by_user,
        -- Get level info
        (
          SELECT json_build_object(
            'id', cl.id,
            'name', cl.name
          )
          FROM course_levels cl
          WHERE cl.id = c.course_level_id
        ) as level,
        -- Get pinned status
        COALESCE(c.pinned, false) as is_pinned
       FROM courses c
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    
    const finalQueryParams = [...queryParams, limit, offset];
    console.log('📚 [COURSE MANAGEMENT API] Courses query:', coursesQuery);
    console.log('📚 [COURSE MANAGEMENT API] Courses query params:', finalQueryParams);
    console.log('📚 [COURSE MANAGEMENT API] Order by:', orderBy);
    
    const coursesResult = await query(coursesQuery, finalQueryParams);
    
    console.log('📚 [COURSE MANAGEMENT API] Courses result:', {
      rowCount: coursesResult.rows.length,
      firstRow: coursesResult.rows[0] || null,
    });

    // Transform courses to match expected format
    const courses = coursesResult.rows.map((row) => {
      const instructor = row.instructors && row.instructors.length > 0 ? row.instructors[0] : null;
      
      // Map database status to frontend status
      // 'published' -> 'active', 'draft' -> 'inactive', others -> 'inactive'
      let frontendStatus = 'inactive';
      if (row.status === 'published') {
        frontendStatus = 'active';
      } else if (row.status === 'draft') {
        frontendStatus = 'inactive';
      }
      
      // Handle organization - log for debugging
      const orgIdRaw = row.org_id_raw || row.org_id;
      let organization = row.organization;
      
      console.log(`📚 [COURSE MANAGEMENT API] Course ${row.id} ("${row.title}") organization data:`, {
        orgId: orgIdRaw,
        organizationFromQuery: organization,
        hasOrgId: !!orgIdRaw,
        hasOrganization: !!organization,
      });
      
      // If org_id exists but organization is null, the organization might not exist in the database
      if (orgIdRaw && !organization) {
        console.warn(`📚 [COURSE MANAGEMENT API] Course ${row.id} has org_id ${orgIdRaw} but organization not found in database`);
      }

      // Parse ratings
      const ratingsData = row.ratings || {};
      const averageRating = parseFloat(ratingsData.averageRating || 0);
      const totalReviews = parseInt(ratingsData.totalReviews || 0, 10);

      // Parse lesson count and duration
      const totalLessons = parseInt(row.total_lessons || 0, 10);
      const totalDurationSeconds = parseInt(row.total_duration_seconds || 0, 10);
      const totalDurationMinutes = Math.floor(totalDurationSeconds / 60); // Convert seconds to minutes

      // Calculate price
      const regularPrice = parseFloat(row.regular_price || 0);
      const discountedPrice = parseFloat(row.discounted_price || 0);
      const price = discountedPrice || regularPrice || 0;
      const isFree = (row.course_type_name?.toLowerCase() === 'free' || 
                     (!regularPrice || regularPrice === 0) && 
                     (!discountedPrice || discountedPrice === 0));
      
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        status: frontendStatus,
        level: row.level?.name || null,
        organization: organization || null, // Return null if no organization (will show "Global" in UI)
        class: row.classes && row.classes.length > 0 ? row.classes[0] : null,
        subject: row.subjects && row.subjects.length > 0 ? row.subjects[0] : null,
        instructor: instructor,
        createdAt: row.created_at,
        isPinned: row.is_pinned || false,
        createdBy: row.created_by_user,
        // Add CourseCard-compatible fields
        thumbnailUrl: row.intro_video_url || null,
        categoryName: row.category_name || null,
        courseTypeName: row.course_type_name || null,
        // Add lesson count (formatted)
        formattedLessonCount: formatLessonCount(totalLessons),
        lesson: formatLessonCount(totalLessons), // Fallback for old format
        // Add duration (formatted)
        formattedDuration: formatCourseDuration(totalDurationMinutes),
        duration: formatCourseDuration(totalDurationMinutes), // Fallback for old format
        // Add ratings
        averageRating,
        totalReviews,
        // Add price info
        price: isFree ? 0 : price,
        originalPrice: regularPrice,
        regularPrice,
        discountedPrice,
        isFree,
        // Add instructors array (enhanced)
        instructors: row.instructors || [],
        instructorCount: row.instructors ? row.instructors.length : 0,
      };
    });

    console.log('📚 [COURSE MANAGEMENT API] Transformed courses:', {
      count: courses.length,
      courses: courses.map(c => ({ id: c.id, title: c.title, status: c.status })),
    });

    const response = {
      success: true,
      courses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    console.log('📚 [COURSE MANAGEMENT API] Final response:', {
      success: response.success,
      coursesCount: response.courses.length,
      pagination: response.pagination,
    });
    console.log('📚 [COURSE MANAGEMENT API] ===== REQUEST SUCCESSFUL =====');

    return NextResponse.json(response);
  } catch (error) {
    console.error('📚 [COURSE MANAGEMENT API] ===== ERROR =====');
    console.error('📚 [COURSE MANAGEMENT API] Error fetching courses:', error);
    console.error('📚 [COURSE MANAGEMENT API] Error stack:', error.stack);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch courses',
        courses: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      },
      { status: error.status || 500 }
    );
  }
}


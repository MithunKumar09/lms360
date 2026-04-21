/**
 * Mini Courses API Route
 * 
 * Handles mini course operations for Admin and Superadmin roles.
 * 
 * GET /api/mini-courses - List mini courses (role-scoped)
 * POST /api/mini-courses - Create mini course
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query, getClient } from '@/lib/db/index.js';

/**
 * GET /api/mini-courses
 * List mini courses (role-scoped)
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - orgId: Filter by organization ID (superadmin only)
 * - status: Filter by status (draft, published, archived)
 * - search: Search by title/description
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const orgId = searchParams.get('orgId') || null;
    const status = searchParams.get('status') || null;
    const search = searchParams.get('search') || null;
    const recommended = searchParams.get('recommended') === 'true';

    // Build WHERE conditions based on role
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    if (userRole === 'student') {
      // Student: Only published mini courses
      whereConditions.push(`mc.status = 'published'`);
      // Students cannot filter by orgId or see drafts
    } else if (userRole === 'superadmin') {
      // Superadmin: Can see all mini courses
      // If orgId filter is provided, filter by org
      if (orgId) {
        whereConditions.push(`mc.org_id = $${paramIndex}`);
        queryParams.push(orgId);
        paramIndex++;
      }
    } else if (userRole === 'admin') {
      // Admin: Only mini courses from their organization
      if (userOrgId) {
        whereConditions.push(`mc.org_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
      } else {
        // Admin with no org: Only mini courses they created
        whereConditions.push(`mc.org_id IS NULL AND mc.created_by = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }
    }

    // Filter by status (students are already filtered to published only)
    if (status && userRole !== 'student') {
      whereConditions.push(`mc.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    // Search by title/description
    if (search) {
      whereConditions.push(`(
        mc.title ILIKE $${paramIndex} OR 
        mc.description ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM mini_courses mc
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get mini courses with creator and org info
    const miniCoursesQuery = `
      SELECT 
        mc.id,
        mc.org_id,
        mc.created_by,
        mc.admin_id,
        mc.title,
        mc.description,
        mc.cover_photo_url,
        mc.stamp_logo_url,
        mc.video_url,
        mc.video_file_key,
        mc.instructions,
        mc.material_url,
        mc.material_file_key,
        mc.status,
        mc.created_at,
        mc.updated_at,
        o.name as org_name,
        u.email as created_by_email
      FROM mini_courses mc
      LEFT JOIN organizations o ON mc.org_id = o.id
      LEFT JOIN users u ON mc.created_by = u.id
      ${whereClause}
      ORDER BY mc.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    const miniCoursesResult = await query(miniCoursesQuery, queryParams);

    const miniCourses = miniCoursesResult.rows.map(row => ({
      id: row.id,
      orgId: row.org_id,
      orgName: row.org_name,
      createdBy: row.created_by,
      createdByEmail: row.created_by_email,
      adminId: row.admin_id,
      title: row.title,
      description: row.description,
      coverPhotoUrl: row.cover_photo_url,
      stampLogoUrl: row.stamp_logo_url,
      videoUrl: row.video_url,
      videoFileKey: row.video_file_key,
      instructions: row.instructions,
      materialUrl: row.material_url,
      materialFileKey: row.material_file_key,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      miniCourses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ [API] [Mini Courses GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch mini courses',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/mini-courses
 * Create mini course (admin/superadmin only)
 * 
 * Body:
 * - title: string (required, 3-255 chars)
 * - description: string (required)
 * - coverPhotoUrl: string (required)
 * - stampLogoUrl: string (required, PNG, 28x28)
 * - videoUrl: string (optional)
 * - videoFileKey: string (optional)
 * - instructions: string (required, rich text)
 * - materialUrl: string (optional)
 * - materialFileKey: string (optional)
 * - status: 'draft' | 'published' | 'archived' (default: 'draft')
 * - orgId: UUID (optional, for superadmin)
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;

    const body = await request.json();
    const {
      title,
      description,
      coverPhotoUrl,
      stampLogoUrl,
      videoUrl = null,
      videoFileKey = null,
      instructions,
      materialUrl = null,
      materialFileKey = null,
      status = 'draft',
      orgId = null,
    } = body;

    // Validation
    if (!title || title.trim().length < 3 || title.trim().length > 255) {
      return NextResponse.json(
        { success: false, error: 'Title must be between 3 and 255 characters' },
        { status: 400 }
      );
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }

    if (!coverPhotoUrl || coverPhotoUrl.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cover photo URL is required' },
        { status: 400 }
      );
    }

    if (!stampLogoUrl || stampLogoUrl.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Stamp logo URL is required' },
        { status: 400 }
      );
    }

    if (!instructions || instructions.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Instructions are required' },
        { status: 400 }
      );
    }

    if (!['draft', 'published', 'archived'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be draft, published, or archived' },
        { status: 400 }
      );
    }

    // Role-based org_id determination
    let finalOrgId = null;
    let finalAdminId = null;

    if (userRole === 'superadmin') {
      // Superadmin: orgId is required
      if (!orgId) {
        return NextResponse.json(
          { success: false, error: 'Organization selection is required' },
          { status: 400 }
        );
      }
      finalOrgId = orgId;
      finalAdminId = userId; // Superadmin acts as admin for mini courses
    } else if (userRole === 'admin') {
      // Admin: Use their organization
      finalOrgId = userOrgId || null;
      finalAdminId = userId; // Admin is the admin_id
    }

    // Insert mini course
    const insertQuery = `
      INSERT INTO mini_courses (
        org_id,
        created_by,
        admin_id,
        title,
        description,
        cover_photo_url,
        stamp_logo_url,
        video_url,
        video_file_key,
        instructions,
        material_url,
        material_file_key,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, created_at, updated_at
    `;

    const result = await query(insertQuery, [
      finalOrgId,
      userId,
      finalAdminId,
      title.trim(),
      description.trim(),
      coverPhotoUrl.trim(),
      stampLogoUrl.trim(),
      videoUrl?.trim() || null,
      videoFileKey?.trim() || null,
      instructions.trim(),
      materialUrl?.trim() || null,
      materialFileKey?.trim() || null,
      status,
    ]);

    const miniCourseId = result.rows[0].id;

    return NextResponse.json({
      success: true,
      miniCourse: {
        id: miniCourseId,
        orgId: finalOrgId,
        createdBy: userId,
        adminId: finalAdminId,
        title: title.trim(),
        description: description.trim(),
        coverPhotoUrl: coverPhotoUrl.trim(),
        stampLogoUrl: stampLogoUrl.trim(),
        videoUrl: videoUrl?.trim() || null,
        videoFileKey: videoFileKey?.trim() || null,
        instructions: instructions.trim(),
        materialUrl: materialUrl?.trim() || null,
        materialFileKey: materialFileKey?.trim() || null,
        status,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
      },
      message: 'Mini course created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('❌ [API] [Mini Courses POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create mini course',
      },
      { status: error.status || 500 }
    );
  }
}


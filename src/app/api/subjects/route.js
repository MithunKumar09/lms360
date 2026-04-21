/**
 * Subjects API Route
 * 
 * Wrapper for subject-catalog API to provide subjects endpoint for course creation form.
 * Handles GET (list) operations for subjects.
 * 
 * GET /api/subjects
 * - Query params: ?org_id=&classIds=&status=active&search=&page=1&limit=20
 * - Returns: { success: true, subjects: [], pagination: {} }
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { listSubjectCatalog } from '@/lib/db/classesSubjects.js';

export async function GET(request) {
  try {
    // Authentication: superadmin, admin, or instructor
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor']);
    const userRole = session.user.role;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const classIds = searchParams.get('classIds');
    const classIdsArray = classIds ? (Array.isArray(classIds) ? classIds : classIds.split(',').filter(Boolean)) : [];
    // Get instructorIds from query params (instructors hold subjects)
    const instructorIdsParam = searchParams.get('instructorIds');
    const instructorIdsArray = instructorIdsParam 
      ? (Array.isArray(instructorIdsParam) 
          ? instructorIdsParam 
          : instructorIdsParam.split(',').filter(Boolean)) 
      : [];
    
    // Get org_id from query params (support both org_id and orgId)
    const orgIdFromQuery = searchParams.get('org_id') || searchParams.get('orgId');
    
    const filters = {
      org_id: (userRole === 'admin' || userRole === 'instructor') ? session.user.orgId : (orgIdFromQuery || null),
      status: searchParams.get('status') || 'active',
      search: searchParams.get('search') || searchParams.get('q'),
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sort: searchParams.get('sort') || 'created_at',
      order: searchParams.get('order') || 'DESC',
      // If classIds are provided, we can filter subjects by class
      // Note: This requires a join with subject_offerings table
      classIds: classIdsArray.length > 0 ? classIdsArray : undefined,
      // Filter by instructorIds if provided (instructors hold subjects)
      instructorIds: instructorIdsArray.length > 0 ? instructorIdsArray : undefined,
    };

    // Validate pagination
    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 100) filters.limit = 20;

    // For admin and instructor, use their orgId
    if (userRole === 'admin' || userRole === 'instructor') {
      filters.org_id = session.user.orgId;
    }

    // For superadmin, org_id is optional - if not provided, fetch all
    // But for better performance, we recommend providing org_id
    if (userRole === 'superadmin' && !filters.org_id) {
      // Allow superadmin to fetch all subjects across all orgs
      // This might return a lot of data, but it's allowed
    }

    // Fetch subjects from subject catalog
    const result = await listSubjectCatalog(filters);

    // If classIds are provided, filter subjects that are offered in those classes
    let subjects = result.subjects || [];
    if (classIdsArray.length > 0) {
      // This would require a join with subject_offerings
      // For now, return all subjects - the filtering can be done client-side
      // or we can enhance the listSubjectCatalog function to support classIds filter
    }

    // Normalize pagination format
    const pagination = result.pagination || { total: 0, totalPages: 0, page: 1, limit: 20 };
    const normalizedPagination = {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      total: pagination.total || 0,
      pages: pagination.totalPages || pagination.pages || 0,
    };

    return NextResponse.json(
      {
        success: true,
        subjects: subjects,
        pagination: normalizedPagination,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/subjects:', error);

    // Handle authentication/authorization errors
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Unauthorized. Access denied.',
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch subjects',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}


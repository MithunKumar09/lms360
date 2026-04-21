/**
 * Classes API Route
 * 
 * Wrapper for cohorts API to provide classes endpoint for course creation form.
 * Handles GET (list) operations for classes (cohorts).
 * 
 * GET /api/classes
 * - Query params: ?org_id=&status=active&search=&page=1&limit=20
 * - Returns: { success: true, classes: [], pagination: {} }
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { listCohorts } from '@/lib/db/classesSubjects.js';

export async function GET(request) {
  try {
    console.log('📚 [CLASSES API] ===== GET /api/classes REQUEST =====');
    
    // Authentication: superadmin, admin, or instructor
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor']);
    const userRole = session.user.role;
    
    console.log('📚 [CLASSES API] User:', {
      role: userRole,
      userId: session.user.id,
      email: session.user.email,
      orgId: session.user.orgId
    });

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    // Get org_id from query params (support both org_id and orgId)
    const orgIdFromQuery = searchParams.get('org_id') || searchParams.get('orgId');
    // Get instructorIds from query params (instructors hold classes)
    const instructorIdsParam = searchParams.get('instructorIds');
    const instructorIdsArray = instructorIdsParam 
      ? (Array.isArray(instructorIdsParam) 
          ? instructorIdsParam 
          : instructorIdsParam.split(',').filter(Boolean)) 
      : [];
    
    console.log('📚 [CLASSES API] Query params:', {
      orgIdFromQuery,
      instructorIdsParam,
      instructorIdsArray,
      status: searchParams.get('status'),
      search: searchParams.get('search') || searchParams.get('q'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });
    
    const filters = {
      org_id: userRole === 'admin' ? session.user.orgId : (orgIdFromQuery || null),
      status: searchParams.get('status') || 'published', // Cohorts use 'published' not 'active'
      search: searchParams.get('search') || searchParams.get('q'),
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sort: searchParams.get('sort') || 'created_at',
      order: searchParams.get('order') || 'DESC',
      // Filter by instructor assignments if instructorIds provided
      instructorIds: instructorIdsArray.length > 0 ? instructorIdsArray : undefined,
    };

    // Validate pagination
    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 100) filters.limit = 20;

    // For admin and instructor, use their orgId to fetch cohorts in their organization
    if (userRole === 'admin' || userRole === 'instructor') {
      filters.org_id = session.user.orgId;
      console.log('📚 [CLASSES API] Set org_id from session for', userRole, ':', filters.org_id);
      if (instructorIdsArray.length > 0) {
        console.log('📚 [CLASSES API] Filtering cohorts by instructor assignments:', instructorIdsArray);
      } else {
        console.log('📚 [CLASSES API] Fetching ALL cohorts in organization (no instructor filter)');
      }
    }

    // For superadmin, org_id is optional - if not provided, fetch all
    // But for better performance, we recommend providing org_id
    if (userRole === 'superadmin' && !filters.org_id) {
      // Allow superadmin to fetch all classes across all orgs
      // This might return a lot of data, but it's allowed
      console.log('📚 [CLASSES API] Superadmin - no org_id filter, fetching all cohorts');
    }

    console.log('📚 [CLASSES API] Final filters:', filters);

    // Fetch cohorts (classes) - same as course assignment options
    // This returns cohorts with program nodes, sessions, terms, sections
    const result = await listCohorts(filters);
    
    console.log('📚 [CLASSES API] Result:', {
      cohortsCount: result.cohorts?.length || 0,
      total: result.pagination?.total || 0,
      page: result.pagination?.page || 1,
    });

    // Transform cohorts to match the format expected by AsyncSelect
    // Include all related data (program nodes, sessions, terms, sections) like course assignment options
    const formattedCohorts = (result.cohorts || []).map(cohort => ({
      id: cohort.id,
      value: cohort.id,
      label: cohort.code || `Cohort ${cohort.id.substring(0, 8)}`,
      code: cohort.code,
      cohort_code: cohort.code, // Alias for compatibility
      level: cohort.level,
      program_node: cohort.program_node_id ? {
        id: cohort.program_node_id,
        name: cohort.program_node_title,
        code: cohort.program_node_code
      } : null,
      session: cohort.session_id ? {
        id: cohort.session_id,
        name: cohort.session_code
      } : null,
      term: cohort.term_id ? {
        id: cohort.term_id,
        name: cohort.term_label,
        type: cohort.term_type
      } : null,
      section: cohort.section_id ? {
        id: cohort.section_id,
        name: cohort.section_label
      } : null,
      status: cohort.status,
      total_subjects: cohort.total_subjects || 0
    }));

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
        classes: formattedCohorts, // Return formatted cohorts with all related data
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
    console.error('Error in GET /api/classes:', error);

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
        error: error.message || 'Failed to fetch classes',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}


/**
 * Admin Placement Applications API Route
 * 
 * GET /api/admin/placement/applications - Get all applications
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getAllApplications } from '@/lib/db/placement/applications.js';

/**
 * GET /api/admin/placement/applications
 * Get all applications (admin view)
 * 
 * Query parameters:
 * - status: Filter by status
 * - postingId: Filter by posting
 * - userId: Filter by user
 * - postingType: Filter by posting type
 * - organizationId: Filter by organization
 * - page: Page number
 * - pageSize: Items per page
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') || null,
      postingId: searchParams.get('postingId') || null,
      userId: searchParams.get('userId') || null,
      postingType: searchParams.get('postingType') || null,
      organizationId: session.user.role === 'superadmin' 
        ? searchParams.get('organizationId') || null
        : session.user.orgId || null,
      search: searchParams.get('search') || null,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10')
    };
    
    const result = await getAllApplications(filters);
    
    return NextResponse.json({
      success: true,
      data: result.applications,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting applications:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get applications'
      },
      { status: error.status || 500 }
    );
  }
}

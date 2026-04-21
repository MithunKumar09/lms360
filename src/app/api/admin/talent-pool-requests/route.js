/**
 * Admin Talent Pool Access Requests API Route
 * 
 * GET /api/admin/talent-pool-requests - List all access requests
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getAllAccessRequests } from '@/lib/db/company/talent-pool.js';

/**
 * GET /api/admin/talent-pool-requests
 * List all access requests
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const orgId = session.user.orgId;
    const userRole = session.user.role;
    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') || null,
      organizationId: userRole === 'superadmin' 
        ? (searchParams.get('organizationId') || null)
        : orgId || null,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10')
    };
    
    const result = await getAllAccessRequests(filters);
    
    return NextResponse.json({
      success: true,
      data: result.requests,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting talent pool access requests:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get access requests'
      },
      { status: error.status || 500 }
    );
  }
}

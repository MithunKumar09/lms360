/**
 * Company Applications API Route
 * 
 * Handles application operations for company users.
 * 
 * GET /api/company/applications - List applications for company's job postings
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getCompanyApplications } from '@/lib/db/placement/applications.js';

/**
 * GET /api/company/applications
 * List applications for company's job postings
 * 
 * Query parameters:
 * - status: Filter by status
 * - postingId: Filter by specific posting
 * - postingType: Filter by posting type ('internship', 'job', 'contract')
 * - search: Search term (searches applicant name, email, posting title)
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 10)
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') || null,
      postingId: searchParams.get('postingId') || null,
      postingType: searchParams.get('postingType') || null,
      search: searchParams.get('search') || null,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10')
    };
    
    const result = await getCompanyApplications(userId, filters);
    
    return NextResponse.json({
      success: true,
      data: result.applications,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting company applications:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get applications'
      },
      { status: error.status || 500 }
    );
  }
}
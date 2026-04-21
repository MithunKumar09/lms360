/**
 * Recruitment Drives API Route
 * 
 * GET /api/placement/drives - Get list of drives
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getDrives } from '@/lib/db/placement/drives.js';

/**
 * GET /api/placement/drives
 * Get list of recruitment drives
 * 
 * Query parameters:
 * - status: Filter by status ('upcoming', 'ongoing', 'completed', 'cancelled')
 * - fromDate: Filter from date
 * - toDate: Filter to date
 * - page: Page number
 * - pageSize: Items per page
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['student', 'alumni']);
    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') || 'upcoming',
      fromDate: searchParams.get('fromDate') || null,
      toDate: searchParams.get('toDate') || null,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10')
    };
    
    // Filter to show only upcoming and ongoing drives for students
    if (!filters.status || filters.status === 'upcoming') {
      filters.status = null; // Get all active statuses
      filters.fromDate = new Date().toISOString(); // Only future/current drives
    }
    
    const result = await getDrives(filters);
    
    return NextResponse.json({
      success: true,
      data: result.drives,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting drives:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get drives'
      },
      { status: error.status || 500 }
    );
  }
}

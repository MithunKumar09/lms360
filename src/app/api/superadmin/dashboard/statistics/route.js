/**
 * Superadmin Dashboard Statistics API Route
 * 
 * GET /api/superadmin/dashboard/statistics - Get superadmin dashboard statistics
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getSuperadminDashboardStatistics } from '@/lib/db/superadmin/statistics.js';

/**
 * GET /api/superadmin/dashboard/statistics
 * 
 * Get superadmin dashboard statistics (counts)
 * Returns: enrolledCourses, activeCourses, completeCourses, totalCourses, totalStudents, totalOrganizations
 */
export async function GET(request) {
  try {
    // Check authentication and authorization
    const session = await requireRole(request, ['superadmin']);

    const superadminId = session?.user?.id;
    
    if (!superadminId) {
      return NextResponse.json(
        { success: false, error: 'User ID not found' },
        { status: 401 }
      );
    }

    // Get dashboard statistics
    const statistics = await getSuperadminDashboardStatistics(superadminId);
    
    return NextResponse.json({
      success: true,
      ...statistics,
    });
  } catch (error) {
    console.error('Error fetching superadmin dashboard statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dashboard statistics'
      },
      { status: 500 }
    );
  }
}

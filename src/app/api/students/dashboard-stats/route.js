/**
 * Student Dashboard Statistics API Route
 * 
 * GET /api/students/dashboard-stats - Get course statistics for student dashboard
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/students/dashboard-stats
 * Get course statistics (enrolled, active, completed counts)
 */
export async function GET(request) {
  try {
    // Authentication: Only students and alumni can access
    const session = await requireRole(request, ['student', 'alumni']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;

    // Single optimized query to get all counts
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE ce.enrollment_status = 'active') as enrolled_count,
        COUNT(*) FILTER (WHERE ce.enrollment_status = 'active' AND ce.progress_percentage < 100) as active_count,
        COUNT(*) FILTER (WHERE ce.enrollment_status = 'completed' OR ce.progress_percentage >= 100) as completed_count
      FROM course_enrollments ce
      JOIN courses c ON ce.course_id = c.id
      WHERE ce.user_id = $1 AND c.status = 'published'
    `;

    const statsResult = await query(statsQuery, [userId]);
    
    if (!Array.isArray(statsResult?.rows) || statsResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          enrolledCount: 0,
          activeCount: 0,
          completedCount: 0,
        },
      });
    }
    
    const stats = statsResult.rows[0];
    if (!stats || typeof stats !== 'object') {
      return NextResponse.json({
        success: true,
        data: {
          enrolledCount: 0,
          activeCount: 0,
          completedCount: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        enrolledCount: parseInt(stats.enrolled_count || 0, 10),
        activeCount: parseInt(stats.active_count || 0, 10),
        completedCount: parseInt(stats.completed_count || 0, 10),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dashboard statistics',
      },
      { status: error.status || 500 }
    );
  }
}

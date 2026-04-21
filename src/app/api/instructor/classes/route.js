/**
 * Instructor Classes API Route
 * 
 * GET /api/instructor/classes - Fetch classes for an instructor
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

export async function GET(request) {
  try {
    // Authentication: instructor only
    const session = await requireRole(request, ['instructor']);
    
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
    const userOrgId = session.user.orgId;

    const { searchParams } = new URL(request.url);
    const instructorId = searchParams.get('instructorId') || userId;

    // Security: Instructors can only fetch their own classes
    if (instructorId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You can only fetch your own classes' },
        { status: 403 }
      );
    }

    // Fetch instructor's classes from instructor_classes table
    const classesResult = await query(
      `SELECT DISTINCT ic.cohort_id as class_id
       FROM instructor_classes ic
       WHERE ic.instructor_user_id = $1
       ORDER BY ic.cohort_id`,
      [instructorId]
    );

    const classIds = Array.isArray(classesResult?.rows) 
      ? classesResult.rows
          .filter(row => row && typeof row === 'object' && row.class_id)
          .map(row => row.class_id)
      : [];

    return NextResponse.json({
      success: true,
      classIds,
    });
  } catch (error) {
    console.error('Error fetching instructor classes:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch instructor classes',
        classIds: [],
      },
      { status: error.status || 500 }
    );
  }
}


/**
 * Parent Students API Route
 * 
 * GET /api/parent/students - Get list of linked children for parent
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getParentStudents } from '@/lib/db/parent/students.js';

export async function GET(request) {
  try {
    // Authentication: Only parents
    const session = await requireRole(request, ['parent']);
    const parentId = session.user.id;
    const orgId = session.user.orgId;

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parent must be associated with an organization',
        },
        { status: 400 }
      );
    }

    // Get linked children
    const students = await getParentStudents(parentId, orgId);

    return NextResponse.json({
      success: true,
      students,
    });
  } catch (error) {
    console.error('Error fetching parent students:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch linked children',
      },
      { status: error.status || 500 }
    );
  }
}

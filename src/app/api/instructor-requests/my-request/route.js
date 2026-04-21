/**
 * My Instructor Request API Route
 * 
 * GET /api/instructor-requests/my-request
 * Get current user's instructor request status
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';

export async function GET(request) {
  try {
    console.log('👤 [MY REQUEST] ===== GET MY REQUEST STARTED =====');
    
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's request (if any)
    const requestResult = await query(
      `SELECT 
        id,
        status,
        created_at,
        reviewed_at,
        rejection_reason
      FROM instructor_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
      [userId]
    );

    if (requestResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: null
        },
        { status: 200 }
      );
    }

    const row = requestResult.rows[0];
    const requestData = {
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      reviewed_at: row.reviewed_at,
      rejection_reason: row.rejection_reason
    };

    console.log('👤 [MY REQUEST] ✅ Request found:', requestData.status);

    return NextResponse.json(
      {
        success: true,
        data: requestData
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('👤 [MY REQUEST] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch request' 
      },
      { status: 500 }
    );
  }
}


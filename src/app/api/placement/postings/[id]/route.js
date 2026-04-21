/**
 * Job Posting Details API Route
 * 
 * GET /api/placement/postings/[id] - Get posting details
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getPosting, checkEligibility } from '@/lib/db/placement/postings.js';

/**
 * GET /api/placement/postings/[id]
 * Get detailed information about a specific posting
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['student', 'alumni']);
    const { id: postingId } = params;
    const userId = session.user.id;
    
    if (!postingId) {
      return NextResponse.json(
        { success: false, error: 'Posting ID is required' },
        { status: 400 }
      );
    }
    
    const posting = await getPosting(postingId);
    
    if (!posting) {
      return NextResponse.json(
        { success: false, error: 'Posting not found' },
        { status: 404 }
      );
    }
    
    // Check if posting is active
    if (posting.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Posting is not available' },
        { status: 404 }
      );
    }
    
    // Check eligibility
    const eligibility = await checkEligibility(userId, postingId);
    
    // Check if user already applied
    const { query } = await import('@/lib/db/index.js');
    const applicationCheck = await query(
      `SELECT id, application_status FROM applications 
      WHERE user_id = $1 AND posting_id = $2`,
      [userId, postingId]
    );
    
    const hasApplied = applicationCheck.rows.length > 0;
    const applicationStatus = hasApplied ? applicationCheck.rows[0].application_status : null;
    const applicationId = hasApplied ? applicationCheck.rows[0].id : null;
    
    return NextResponse.json({
      success: true,
      data: {
        ...posting,
        eligibility,
        hasApplied,
        applicationStatus,
        applicationId
      }
    });
  } catch (error) {
    console.error('Error getting posting:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get posting'
      },
      { status: error.status || 500 }
    );
  }
}

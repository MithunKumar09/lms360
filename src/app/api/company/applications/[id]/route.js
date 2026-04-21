/**
 * Company Application Details API Route
 * 
 * Handles single application operations for company users.
 * 
 * GET /api/company/applications/[id] - Get application details
 * PATCH /api/company/applications/[id] - Update application status
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getApplication, updateApplication } from '@/lib/db/placement/applications.js';
import { getPosting } from '@/lib/db/placement/postings.js';

/**
 * GET /api/company/applications/[id]
 * Get application details (company must own the posting)
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const { id: applicationId } = params;
    
    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required' },
        { status: 400 }
      );
    }
    
    const application = await getApplication(applicationId);
    
    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }
    
    // Verify company owns the posting for this application
    const posting = await getPosting(application.postingId);
    if (!posting || posting.companyUserId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error getting company application:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get application'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * PATCH /api/company/applications/[id]
 * Update application status (company must own the posting)
 * 
 * Body:
 * {
 *   status: string,
 *   adminNotes?: string
 * }
 */
export async function PATCH(request, { params }) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const { id: applicationId } = params;
    const body = await request.json();
    
    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required' },
        { status: 400 }
      );
    }
    
    // Verify company owns the posting for this application
    const application = await getApplication(applicationId);
    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }
    
    const posting = await getPosting(application.postingId);
    if (!posting || posting.companyUserId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    
    const { status, adminNotes } = body;
    
    // Validation
    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { success: false, error: 'status is required and must be a string' },
        { status: 400 }
      );
    }
    
    const validStatuses = [
      'pending', 'reviewing', 'shortlisted', 'interview_scheduled',
      'rejected', 'accepted', 'withdrawn', 'offer_extended'
    ];
    
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    if (adminNotes !== undefined && (typeof adminNotes !== 'string' || adminNotes.length > 2000)) {
      return NextResponse.json(
        { success: false, error: 'adminNotes must be a string with maximum 2000 characters if provided' },
        { status: 400 }
      );
    }
    
    const updatedApplication = await updateApplication(applicationId, {
      status,
      adminNotes,
      reviewedBy: userId
    });
    
    return NextResponse.json({
      success: true,
      data: updatedApplication,
      message: 'Application status updated successfully'
    });
  } catch (error) {
    console.error('Error updating company application:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update application'
      },
      { status: error.status || 500 }
    );
  }
}
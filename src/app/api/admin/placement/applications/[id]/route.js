/**
 * Admin Placement Application Details API Route
 * 
 * GET /api/admin/placement/applications/[id] - Get application details
 * PATCH /api/admin/placement/applications/[id] - Update application status
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getApplication, updateApplication } from '@/lib/db/placement/applications.js';

/**
 * GET /api/admin/placement/applications/[id]
 * Get application details
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
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
    
    return NextResponse.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error getting application:', error);
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
 * PATCH /api/admin/placement/applications/[id]
 * Update application status
 * 
 * Body:
 * {
 *   status: string,
 *   adminNotes?: string
 * }
 */
export async function PATCH(request, { params }) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const { id: applicationId } = params;
    const body = await request.json();
    
    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required' },
        { status: 400 }
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
    
    const application = await updateApplication(applicationId, {
      status,
      adminNotes,
      reviewedBy: session.user.id
    });
    
    return NextResponse.json({
      success: true,
      data: application,
      message: 'Application status updated successfully'
    });
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update application'
      },
      { status: error.status || 500 }
    );
  }
}

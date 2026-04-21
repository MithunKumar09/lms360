/**
 * Admin Talent Pool Access Request Management API Route
 * 
 * PATCH /api/admin/talent-pool-requests/[companyUserId] - Approve/reject access request
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { updateAccessRequestStatus, getAccessRequest } from '@/lib/db/company/talent-pool.js';

/**
 * PATCH /api/admin/talent-pool-requests/[companyUserId]
 * Approve/reject access request
 */
export async function PATCH(request, { params }) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const userId = session.user.id;
    const { companyUserId } = params;
    
    if (!companyUserId) {
      return NextResponse.json(
        { success: false, error: 'Company user ID is required' },
        { status: 400 }
      );
    }
    
    // Verify request exists
    const accessRequest = await getAccessRequest(companyUserId);
    if (!accessRequest) {
      return NextResponse.json(
        { success: false, error: 'Access request not found' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const { status, rejectionReason } = body;
    
    // Validate status
    if (!status || !['approved', 'rejected', 'revoked'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'status must be approved, rejected, or revoked' },
        { status: 400 }
      );
    }
    
    // Validate rejection reason if rejecting
    if (status === 'rejected' && (!rejectionReason || rejectionReason.trim() === '')) {
      return NextResponse.json(
        { success: false, error: 'rejectionReason is required when rejecting' },
        { status: 400 }
      );
    }
    
    const updated = await updateAccessRequestStatus(companyUserId, status, userId, rejectionReason || null);
    
    return NextResponse.json({
      success: true,
      data: updated,
      message: `Access request ${status} successfully`
    });
  } catch (error) {
    console.error('Error updating talent pool access request:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update access request'
      },
      { status: error.status || 500 }
    );
  }
}

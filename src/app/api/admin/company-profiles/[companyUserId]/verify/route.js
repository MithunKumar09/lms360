/**
 * Admin Company Profile Verification API Route
 * 
 * PATCH /api/admin/company-profiles/[companyUserId]/verify - Verify/unverify company profile
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { verifyCompanyProfile, unverifyCompanyProfile, getCompanyProfile } from '@/lib/db/company/profile.js';

/**
 * PATCH /api/admin/company-profiles/[companyUserId]/verify
 * Verify or unverify company profile
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
    
    // Verify profile exists
    const profile = await getCompanyProfile(companyUserId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Company profile not found' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const { verified } = body;
    
    if (typeof verified !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'verified must be a boolean' },
        { status: 400 }
      );
    }
    
    const updatedProfile = verified
      ? await verifyCompanyProfile(companyUserId, userId)
      : await unverifyCompanyProfile(companyUserId);
    
    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: `Company profile ${verified ? 'verified' : 'unverified'} successfully`
    });
  } catch (error) {
    console.error('Error updating company profile verification:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update verification status'
      },
      { status: error.status || 500 }
    );
  }
}

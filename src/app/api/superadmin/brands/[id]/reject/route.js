/**
 * Superadmin Brand Rejection API Route
 * 
 * PATCH /api/superadmin/brands/[id]/reject - Reject brand profile
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { rejectBrandProfile } from '@/lib/db/brand/profile.js';

export async function PATCH(request, { params }) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);
    const userId = session.user.id;

    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Brand profile ID is required',
        },
        { status: 400 }
      );
    }
    const { id: profileId } = params;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }
    const { rejection_reason } = body;

    if (!rejection_reason || typeof rejection_reason !== 'string' || rejection_reason.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'rejection_reason is required',
        },
        { status: 400 }
      );
    }

    // Reject brand profile
    const profile = await rejectBrandProfile(profileId, userId, rejection_reason.trim());

    return NextResponse.json({
      success: true,
      data: {
        profile,
      },
    });
  } catch (error) {
    console.error('Error rejecting brand:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reject brand',
      },
      { status: error.status || 500 }
    );
  }
}

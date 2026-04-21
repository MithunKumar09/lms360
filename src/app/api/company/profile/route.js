/**
 * Company Profile API Route
 * 
 * Handles company profile and hiring needs operations.
 * 
 * GET /api/company/profile - Get company profile
 * PUT /api/company/profile - Create/update company profile
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { upsertCompanyProfile, getCompanyProfile } from '@/lib/db/company/profile.js';

/**
 * GET /api/company/profile
 * Get company profile
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    
    const profile = await getCompanyProfile(userId);
    
    if (!profile) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'Profile not set up yet'
      });
    }
    
    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error getting company profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get profile'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/company/profile
 * Create or update company profile
 */
export async function PUT(request) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const orgId = session.user.orgId;
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.companyName) {
      return NextResponse.json(
        { success: false, error: 'companyName is required' },
        { status: 400 }
      );
    }
    
    // Validate companySize if provided
    if (body.companySize && !['startup', 'small', 'medium', 'large', 'enterprise'].includes(body.companySize)) {
      return NextResponse.json(
        { success: false, error: 'companySize must be one of: startup, small, medium, large, enterprise' },
        { status: 400 }
      );
    }
    
    const profile = await upsertCompanyProfile({
      companyUserId: userId,
      organizationId: orgId || null,
      companyName: body.companyName,
      industry: body.industry || null,
      companySize: body.companySize || null,
      website: body.website || null,
      description: body.description || null,
      companyCulture: body.companyCulture || null,
      hiringNeeds: body.hiringNeeds || null,
      logoUrl: body.logoUrl || null,
      bannerUrl: body.bannerUrl || null
    });
    
    return NextResponse.json({
      success: true,
      data: profile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating company profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update profile'
      },
      { status: error.status || 500 }
    );
  }
}

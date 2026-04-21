/**
 * Brand Profile API Route
 * 
 * GET /api/brand/profile - Get brand profile
 * PUT /api/brand/profile - Create or update brand profile
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { canManageBrandProfile } from '@/lib/auth/brandPermissions.js';
import { getBrandProfile, upsertBrandProfile } from '@/lib/db/brand/profile.js';

export async function GET(request) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    // Get brand profile (returns null if table doesn't exist)
    const profile = await getBrandProfile(userId);

    return NextResponse.json({
      success: true,
      data: {
        profile: profile || null,
      },
    });
  } catch (error) {
    console.error('Error fetching brand profile:', error);
    // Return empty profile instead of error if table doesn't exist
    if (error.code === '42P01') {
      return NextResponse.json({
        success: true,
        data: {
          profile: null,
        },
      });
    }
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch brand profile',
      },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    // Check permission
    const hasPermission = await canManageBrandProfile(session.user.role, userId);
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Insufficient permissions to manage brand profile',
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      brand_name,
      industry,
      logo_url,
      website_url,
      contact_email,
      contact_phone,
      csr_initiatives,
      focus_areas,
      mission,
      values,
      description,
    } = body;

    // Validate required fields
    if (!brand_name || brand_name.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Brand name is required and must be at least 2 characters',
        },
        { status: 400 }
      );
    }

    if (!industry || industry.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Industry is required',
        },
        { status: 400 }
      );
    }

    // Create or update profile
    const profile = await upsertBrandProfile(userId, {
      brand_name: brand_name.trim(),
      industry: industry.trim(),
      logo_url: logo_url || null,
      website_url: website_url || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      csr_initiatives: csr_initiatives || null,
      focus_areas: focus_areas || null,
      mission: mission || null,
      values: values || null,
      description: description || null,
    });

    return NextResponse.json({
      success: true,
      data: {
        profile,
      },
    });
  } catch (error) {
    // Handle missing database tables with appropriate status code
    const isTableMissing = error.isMigrationError || 
                          error.code === 'MIGRATION_REQUIRED' ||
                          error.message?.includes('not available') || 
                          error.message?.includes('migration') ||
                          error.message?.includes('table');
    
    // Only log unexpected errors - migration errors are expected and handled gracefully
    if (!isTableMissing) {
      // Log full error for unexpected errors only
      console.error('Error updating brand profile:', error);
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update brand profile',
        requiresMigration: isTableMissing,
      },
      { status: isTableMissing ? 503 : (error.status || 500) }
    );
  }
}

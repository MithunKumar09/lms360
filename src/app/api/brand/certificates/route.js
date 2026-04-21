/**
 * Brand Certificates API Route
 * 
 * GET /api/brand/certificates - Get brand certificate templates
 * POST /api/brand/certificates - Create brand certificate template
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { canCreateCertificate } from '@/lib/auth/brandPermissions.js';
import { getBrandCertificates, createBrandCertificate } from '@/lib/db/brand/certificates.js';

export async function GET(request) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Validate pagination
    if (page < 1) {
      return NextResponse.json(
        { success: false, error: 'Page must be greater than 0' },
        { status: 400 }
      );
    }
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Get certificates
    const data = await getBrandCertificates(userId, { page, limit });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching brand certificates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch certificates',
      },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    // Check permission
    const hasPermission = await canCreateCertificate(session.user.role, userId);
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Brand profile must be approved to create certificates',
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      description,
      template_design,
      criteria,
      auto_issue,
    } = body;

    // Validate required fields
    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Certificate name is required and must be at least 3 characters',
        },
        { status: 400 }
      );
    }

    if (!template_design || !template_design.logo_url) {
      return NextResponse.json(
        {
          success: false,
          error: 'Brand logo is required in template design',
        },
        { status: 400 }
      );
    }

    // Create certificate
    const certificate = await createBrandCertificate(userId, {
      name: name.trim(),
      description: description || null,
      template_design: template_design || {},
      criteria: criteria || {},
      auto_issue: auto_issue || false,
    });

    return NextResponse.json({
      success: true,
      data: {
        certificate,
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
      console.error('Error creating brand certificate:', error);
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create certificate template',
        requiresMigration: isTableMissing,
      },
      { status: isTableMissing ? 503 : (error.status || 500) }
    );
  }
}

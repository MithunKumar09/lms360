/**
 * Brand Issued Certificates API Route
 * 
 * GET /api/brand/certificates/[id]/issued - Get certificates issued for a template
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getIssuedCertificates, getBrandCertificate } from '@/lib/db/brand/certificates.js';

export async function GET(request, { params }) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    const { id: certificateId } = params;

    // Verify certificate belongs to brand
    const certificate = await getBrandCertificate(certificateId, userId);
    if (!certificate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Certificate not found',
        },
        { status: 404 }
      );
    }

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

    // Get issued certificates
    const data = await getIssuedCertificates(certificateId, { page, limit });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching issued certificates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch issued certificates',
      },
      { status: error.status || 500 }
    );
  }
}

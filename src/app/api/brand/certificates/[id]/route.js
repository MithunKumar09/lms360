/**
 * Brand Certificate Details API Route
 * 
 * GET /api/brand/certificates/[id] - Get brand certificate by ID
 * PUT /api/brand/certificates/[id] - Update brand certificate template
 * DELETE /api/brand/certificates/[id] - Delete brand certificate template
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { verifyBrandOwnsCertificate } from '@/lib/auth/brandPermissions.js';
import { getBrandCertificate, updateBrandCertificate, deleteBrandCertificate } from '@/lib/db/brand/certificates.js';

export async function GET(request, { params }) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    const { id: certificateId } = params;

    // Get certificate
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

    return NextResponse.json({
      success: true,
      data: {
        certificate,
      },
    });
  } catch (error) {
    console.error('Error fetching brand certificate:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch certificate',
      },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    const { id: certificateId } = params;

    // Check permission
    const ownsCertificate = await verifyBrandOwnsCertificate(userId, certificateId);
    if (!ownsCertificate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: You do not have permission to update this certificate',
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Update certificate
    const certificate = await updateBrandCertificate(certificateId, userId, body);

    if (!certificate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Certificate not found or you do not have permission to update it',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        certificate,
      },
    });
  } catch (error) {
    console.error('Error updating brand certificate:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update certificate',
      },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    const { id: certificateId } = params;

    // Check permission
    const ownsCertificate = await verifyBrandOwnsCertificate(userId, certificateId);
    if (!ownsCertificate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: You do not have permission to delete this certificate',
        },
        { status: 403 }
      );
    }

    // Delete certificate
    const deleted = await deleteBrandCertificate(certificateId, userId);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Certificate not found or you do not have permission to delete it',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Certificate template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting brand certificate:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete certificate',
      },
      { status: error.status || 500 }
    );
  }
}

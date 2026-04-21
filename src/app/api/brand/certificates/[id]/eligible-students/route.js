/**
 * Brand Certificate Eligible Students API Route
 * 
 * GET /api/brand/certificates/[id]/eligible-students - Get students eligible for certificate
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getEligibleStudents, getBrandCertificate } from '@/lib/db/brand/certificates.js';

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

    // Get eligible students
    const students = await getEligibleStudents(certificateId);

    return NextResponse.json({
      success: true,
      data: {
        students,
      },
    });
  } catch (error) {
    console.error('Error fetching eligible students:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch eligible students',
      },
      { status: error.status || 500 }
    );
  }
}

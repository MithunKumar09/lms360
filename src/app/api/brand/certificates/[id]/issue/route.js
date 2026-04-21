/**
 * Brand Certificate Issuance API Route
 * 
 * POST /api/brand/certificates/[id]/issue - Issue certificate to student(s)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { canIssueCertificate } from '@/lib/auth/brandPermissions.js';
import { issueCertificates } from '@/lib/db/brand/certificates.js';
import { createCertificateIssuedNotification } from '@/lib/db/brand/notifications.js';
import { query } from '@/lib/db/index.js';

export async function POST(request, { params }) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    const { id: certificateId } = params;

    // Check permission
    const hasPermission = await canIssueCertificate(session.user.role, userId, certificateId);
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: You do not have permission to issue this certificate',
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { student_ids } = body;

    // Validate required fields
    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'student_ids array is required and must not be empty',
        },
        { status: 400 }
      );
    }

    // Get certificate template info for notifications
    const certInfoQuery = `
      SELECT bc.certificate_name, bp.brand_name
      FROM brand_certificates bc
      INNER JOIN brand_profiles bp ON bp.id = bc.brand_id
      WHERE bc.id = $1
    `;
    const certInfoResult = await query(certInfoQuery, [certificateId]);
    const certInfo = certInfoResult.rows[0];

    // Issue certificates (creates records in database)
    const issuedCertificates = await issueCertificates(certificateId, student_ids);

    if (issuedCertificates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No certificates were issued. Students may have already received this certificate.',
        },
        { status: 400 }
      );
    }

    // Create notifications for each issued certificate
    // Note: certificate_url will be null initially, will be updated when PDF is generated
    for (const issuedCert of issuedCertificates) {
      try {
        await createCertificateIssuedNotification(
          issuedCert.student_id,
          issuedCert.id,
          certInfo.certificate_name,
          certInfo.brand_name,
          null // Will be updated when PDF is generated
        );
      } catch (error) {
        // Log but don't fail the entire operation if notification creation fails
        console.error('Failed to create notification for certificate:', error);
      }
    }

    // TODO: Trigger background job or queue to:
    // 1. Generate certificate PDF/image for each issued certificate
    // 2. Upload to R2 storage
    // 3. Update certificate_url in issued_certificates table
    // 4. Update notification with certificate_url

    return NextResponse.json({
      success: true,
      data: {
        issued_count: issuedCertificates.length,
        certificates: issuedCertificates,
      },
      message: `Successfully issued ${issuedCertificates.length} certificate(s). PDF generation will be completed shortly.`,
    });
  } catch (error) {
    console.error('Error issuing brand certificates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to issue certificates',
      },
      { status: error.status || 500 }
    );
  }
}

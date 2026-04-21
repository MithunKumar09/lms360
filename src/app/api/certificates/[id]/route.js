/**
 * Certificate API Route
 * 
 * GET /api/certificates/[id] - Get certificate by ID
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/certificates/[id]
 * Get certificate details by ID
 */
export async function GET(request, { params }) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Fetch certificate
    const result = await query(
      `SELECT 
        c.id,
        c.course_id,
        c.user_id,
        c.template_id,
        c.certificate_url,
        c.qr_code_url,
        c.verification_code,
        c.issued_at,
        c.created_at,
        co.title as course_title,
        u.first_name || ' ' || u.last_name as student_name,
        u.email as student_email
      FROM certificates c
      JOIN courses co ON c.course_id = co.id
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Certificate not found' },
        { status: 404 }
      );
    }

    const certificate = result.rows[0];

    // Check if user has access (own certificate or admin)
    const isOwner = certificate.user_id === session.user.id;
    const isAdmin = ['superadmin', 'admin'].includes(session.user.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      certificate: {
        id: certificate.id,
        courseId: certificate.course_id,
        courseTitle: certificate.course_title,
        userId: certificate.user_id,
        studentName: certificate.student_name,
        studentEmail: certificate.student_email,
        templateId: certificate.template_id,
        certificateUrl: certificate.certificate_url,
        qrCodeUrl: certificate.qr_code_url,
        verificationCode: certificate.verification_code,
        issuedAt: certificate.issued_at,
        createdAt: certificate.created_at,
      },
    });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch certificate',
        details: error.message,
      },
      { status: 500 }
    );
  }
}


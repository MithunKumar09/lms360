/**
 * User Certificates API Route
 * 
 * GET /api/certificates/user/[userId] - Get all certificates for a user
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/certificates/user/[userId]
 * Get all certificates for a user
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

    const { userId } = params;

    // Check if user has access (own certificates or admin)
    const isOwner = userId === session.user.id;
    const isAdmin = ['superadmin', 'admin'].includes(session.user.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch certificates
    const result = await query(
      `SELECT 
        c.id,
        c.course_id,
        c.certificate_url,
        c.qr_code_url,
        c.verification_code,
        c.issued_at,
        co.title as course_title,
        co.slug as course_slug
      FROM certificates c
      JOIN courses co ON c.course_id = co.id
      WHERE c.user_id = $1
      ORDER BY c.issued_at DESC`,
      [userId]
    );

    const certificates = result.rows.map((row) => ({
      id: row.id,
      courseId: row.course_id,
      courseTitle: row.course_title,
      courseSlug: row.course_slug,
      certificateUrl: row.certificate_url,
      qrCodeUrl: row.qr_code_url,
      verificationCode: row.verification_code,
      issuedAt: row.issued_at,
    }));

    return NextResponse.json({
      success: true,
      certificates,
    });
  } catch (error) {
    console.error('Error fetching user certificates:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch certificates',
        details: error.message,
      },
      { status: 500 }
    );
  }
}


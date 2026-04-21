/**
 * Brand Certificate Verification API Route (Public)
 * 
 * GET /api/brand/certificates/verify/[code] - Verify certificate by verification code
 * 
 * This is a public endpoint - no authentication required
 */

import { NextResponse } from 'next/server';
import { verifyCertificate } from '@/lib/db/brand/certificates.js';

export async function GET(request, { params }) {
  try {
    const { code: verificationCode } = params;

    if (!verificationCode || verificationCode.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Verification code is required',
        },
        { status: 400 }
      );
    }

    // Verify certificate
    const certificate = await verifyCertificate(verificationCode.trim());

    if (!certificate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Certificate not found or invalid verification code',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        certificate: {
          certificate_name: certificate.certificate_name,
          student_name: certificate.student_name,
          student_email: certificate.student_email,
          brand_name: certificate.brand_name,
          verification_code: certificate.verification_code,
          issued_at: certificate.issued_at,
          certificate_url: certificate.certificate_url,
        },
      },
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to verify certificate',
      },
      { status: error.status || 500 }
    );
  }
}

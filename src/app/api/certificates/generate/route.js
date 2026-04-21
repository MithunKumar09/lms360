/**
 * Certificate Generation API Route
 * 
 * POST /api/certificates/generate - Generate certificate for a user/course
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { query, getClient } from '@/lib/db/index.js';
import { generateCertificateQRCode, fillCertificateTemplate, generateVerificationUrl, generateVerificationCode } from '@/lib/certificates/generator.js';
import { generatePresignedPutUrl, buildR2PublicUrl, buildR2Key } from '@/lib/r2/r2.js';
import { getR2BucketName } from '@/lib/r2/config.js';

/**
 * POST /api/certificates/generate
 * Generate certificate for a user who completed a course
 * 
 * Body:
 * - courseId: Course ID
 * - userId: User ID (optional, defaults to current user)
 */
export async function POST(request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { courseId, userId } = body;

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Use provided userId or current user
    const targetUserId = userId || session.user.id;

    // Check if certificate already exists (generate once per user/course)
    const existingCert = await query(
      `SELECT id, certificate_url, verification_code 
       FROM certificates 
       WHERE course_id = $1 AND user_id = $2`,
      [courseId, targetUserId]
    );

    if (existingCert.rows.length > 0) {
      // Certificate already exists, return it
      return NextResponse.json({
        success: true,
        certificate: {
          id: existingCert.rows[0].id,
          certificateUrl: existingCert.rows[0].certificate_url,
          verificationCode: existingCert.rows[0].verification_code,
        },
        message: 'Certificate already exists',
      });
    }

    // Fetch course details
    const courseResult = await query(
      `SELECT 
        c.id,
        c.title as course_title,
        c.certificate_template_id,
        c.certificate_upload_url,
        u.first_name || ' ' || u.last_name as instructor_name
      FROM courses c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = $1`,
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    const course = courseResult.rows[0];

    // Fetch user details
    const userResult = await query(
      `SELECT id, first_name, last_name, email
       FROM users
       WHERE id = $1`,
      [targetUserId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];
    const studentName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;

    // Determine certificate type
    let certificateHtml = null;
    let certificateType = 'prebuilt';

    if (course.certificate_upload_url) {
      // Uploaded certificate - return as-is (no generation needed)
      const verificationCode = generateVerificationCode();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://edurock.com';
      const verificationUrl = generateVerificationUrl(verificationCode, baseUrl);

      // Generate QR code
      const qrCodeDataUrl = await generateCertificateQRCode(verificationUrl);

    // Upload QR code to R2
    const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
    const qrCodeKey = `certificates/qr/${courseId}/${targetUserId}-${Date.now()}.png`;
    // Allow image/png type
    const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif', 'image/bmp'];
    const qrCodeUploadUrl = await generatePresignedPutUrl(qrCodeKey, 'image/png', 60, {}, ALLOWED_IMAGE_TYPES);
    const qrCodePublicUrl = buildR2PublicUrl(qrCodeKey);
    
    // Upload QR code
    const qrUploadResponse = await fetch(qrCodeUploadUrl, {
      method: 'PUT',
      body: qrCodeBuffer,
      headers: {
        'Content-Type': 'image/png',
      },
    });

    if (!qrUploadResponse.ok) {
      throw new Error('Failed to upload QR code to R2');
    }

    const qrCodeUrl = qrCodePublicUrl;

      // Store certificate record (for uploaded certificates, we store the uploaded URL)
      const certResult = await query(
        `INSERT INTO certificates (
          course_id, user_id, certificate_url, qr_code_url, verification_code
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id, certificate_url, verification_code`,
        [courseId, targetUserId, course.certificate_upload_url, qrCodeUrl, verificationCode]
      );

      return NextResponse.json({
        success: true,
        certificate: {
          id: certResult.rows[0].id,
          certificateUrl: certResult.rows[0].certificate_url,
          verificationCode: certResult.rows[0].verification_code,
          qrCodeUrl,
        },
      });
    }

    // Prebuilt template - fetch template
    if (!course.certificate_template_id) {
      return NextResponse.json(
        { success: false, error: 'Course does not have a certificate template configured' },
        { status: 400 }
      );
    }

    const templateResult = await query(
      `SELECT id, name, type, template_html, file_url
       FROM certificate_templates
       WHERE id = $1 AND type = 'prebuilt'`,
      [course.certificate_template_id]
    );

    if (templateResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Certificate template not found' },
        { status: 404 }
      );
    }

    const template = templateResult.rows[0];
    certificateHtml = template.template_html;

    // Prepare data for template filling
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://edurock.com';
    const verificationCode = generateVerificationCode();
    const verificationUrl = generateVerificationUrl(verificationCode, baseUrl);
    const completionDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const templateData = {
      studentName,
      name: studentName,
      student_name: studentName,
      courseName: course.course_title,
      course: course.course_title,
      course_name: course.course_title,
      completionDate,
      date: completionDate,
      completion_date: completionDate,
      domain: baseUrl,
      website: baseUrl,
      verificationCode,
      verificationUrl,
    };

    // Generate QR code first (needed for template filling)
    const qrCodeDataUrl = await generateCertificateQRCode(verificationUrl);

    // Add QR code to template data
    templateData.qrCode = `<img src="${qrCodeDataUrl}" alt="Certificate Verification QR Code" style="max-width: 150px; height: auto;" />`;

    // Fill template (includes QR code placeholder)
    // The fillCertificateTemplate function handles {{qrCode}}, {{qr_code}}, {{qrcode}} variations
    let filledHtml = fillCertificateTemplate(certificateHtml, templateData);

    // Upload QR code to R2 for storage
    const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
    const qrCodeKey = `certificates/qr/${courseId}/${targetUserId}-${Date.now()}.png`;
    // Allow image/png type
    const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif', 'image/bmp'];
    const qrCodeUploadUrl = await generatePresignedPutUrl(qrCodeKey, 'image/png', 60, {}, ALLOWED_IMAGE_TYPES);
    const qrCodePublicUrl = buildR2PublicUrl(qrCodeKey);
    
    const qrUploadResponse = await fetch(qrCodeUploadUrl, {
      method: 'PUT',
      body: qrCodeBuffer,
      headers: {
        'Content-Type': 'image/png',
      },
    });

    if (!qrUploadResponse.ok) {
      throw new Error('Failed to upload QR code to R2');
    }

    const qrCodeUrl = qrCodePublicUrl;

    // Convert HTML to PDF using WeasyPrint (via external service or API)
    // For now, we'll store the HTML and convert it server-side
    // In production, you would call a WeasyPrint service
    const pdfUrl = await convertHtmlToPdf(filledHtml, courseId, targetUserId);

    // Store certificate record
    const certResult = await query(
      `INSERT INTO certificates (
        course_id, user_id, template_id, certificate_url, qr_code_url, verification_code
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, certificate_url, verification_code`,
      [courseId, targetUserId, course.certificate_template_id, pdfUrl, qrCodeUrl, verificationCode]
    );

    return NextResponse.json({
      success: true,
      certificate: {
        id: certResult.rows[0].id,
        certificateUrl: certResult.rows[0].certificate_url,
        verificationCode: certResult.rows[0].verification_code,
        qrCodeUrl,
      },
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate certificate',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Convert HTML to PDF using WeasyPrint
 * 
 * This function handles PDF conversion via WeasyPrint service.
 * 
 * Implementation options:
 * 1. WeasyPrint microservice/API (recommended for production)
 * 2. External service like PDFShift, HTMLtoPDF
 * 3. Serverless function (AWS Lambda, Vercel Function)
 * 
 * For now, stores HTML and provides structure for WeasyPrint integration
 */
async function convertHtmlToPdf(html, courseId, userId) {
  const timestamp = Date.now();
  
  // Store HTML in R2 first (for reference and debugging)
  const htmlKey = `certificates/html/${courseId}/${userId}-${timestamp}.html`;
  // Allow text/html type (may need to be added to R2 allowed types)
  const ALLOWED_DOC_TYPES = ['text/html', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const htmlUploadUrl = await generatePresignedPutUrl(htmlKey, 'text/html', 60, {}, ALLOWED_DOC_TYPES);
  const htmlPublicUrl = buildR2PublicUrl(htmlKey);
  
  const htmlUploadResponse = await fetch(htmlUploadUrl, {
    method: 'PUT',
    body: html,
    headers: {
      'Content-Type': 'text/html',
    },
  });

  if (!htmlUploadResponse.ok) {
    throw new Error('Failed to store HTML in R2');
  }

  // TODO: Implement WeasyPrint conversion
  // 
  // Option 1: Call WeasyPrint microservice
  // const weasyPrintServiceUrl = process.env.WEASYPRINT_SERVICE_URL || 'http://localhost:8000';
  // const pdfResponse = await fetch(`${weasyPrintServiceUrl}/convert`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ html, htmlUrl: htmlPublicUrl }),
  // });
  // const pdfBuffer = await pdfResponse.arrayBuffer();
  //
  // Option 2: Use external service (PDFShift, etc.)
  // const pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Basic ${Buffer.from(`api:${process.env.PDFSHIFT_API_KEY}`).toString('base64')}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({ source: htmlPublicUrl }),
  // });
  // const pdfBuffer = await pdfResponse.arrayBuffer();
  //
  // Then upload PDF:
  // const pdfKey = `certificates/pdf/${courseId}/${userId}-${timestamp}.pdf`;
  // const pdfUploadUrl = await generatePresignedPutUrl(pdfKey, 'application/pdf', 60, {}, ['application/pdf']);
  // await fetch(pdfUploadUrl, {
  //   method: 'PUT',
  //   body: Buffer.from(pdfBuffer),
  //   headers: { 'Content-Type': 'application/pdf' },
  // });
  // return buildR2PublicUrl(pdfKey);
  
  // For now, return HTML URL as placeholder
  // In production, replace this with actual PDF conversion and storage
  const pdfKey = `certificates/pdf/${courseId}/${userId}-${timestamp}.pdf`;
  const pdfPublicUrl = buildR2PublicUrl(pdfKey);
  
  // Placeholder: In production, implement actual PDF conversion above
  // For now, return the PDF URL structure (will be populated when PDF is generated)
  
  return pdfPublicUrl;
}


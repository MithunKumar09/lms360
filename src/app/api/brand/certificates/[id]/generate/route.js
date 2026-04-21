/**
 * Brand Certificate Generation API Route
 * 
 * POST /api/brand/certificates/[id]/generate - Generate certificate PDF/image for a student
 * 
 * This endpoint queues a background job for certificate generation.
 * The actual generation happens asynchronously via BullMQ worker.
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { generateVerificationCode } from '@/lib/certificates/generator.js';
import { queueCertificateGeneration } from '@/lib/queue/certificateQueue.js';
import { generateAndUploadCertificate } from '@/lib/certificates/serverGenerator.js';

export async function POST(request, { params }) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    const { id: certificateId } = params;

    // Parse request body
    const body = await request.json();
    const { student_id, format = 'pdf' } = body; // format: 'pdf' or 'image'

    if (!student_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'student_id is required',
        },
        { status: 400 }
      );
    }

    // Get certificate template
    const certQuery = `
      SELECT 
        bc.*,
        bp.brand_name,
        bp.user_id as brand_user_id
      FROM brand_certificates bc
      INNER JOIN brand_profiles bp ON bp.id = bc.brand_id
      WHERE bc.id = $1 AND bp.user_id = $2
    `;
    const certResult = await query(certQuery, [certificateId, userId]);
    if (certResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Certificate template not found',
        },
        { status: 404 }
      );
    }

    const certificate = certResult.rows[0];
    const templateDesign = certificate.template_data || {};

    // Get student details
    const studentQuery = `
      SELECT id, first_name, last_name, email
      FROM users
      WHERE id = $1 AND role = 'student'
    `;
    const studentResult = await query(studentQuery, [student_id]);
    if (studentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Student not found',
        },
        { status: 404 }
      );
    }

    const student = studentResult.rows[0];
    const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email;

    // Check if certificate already issued
    const issuedQuery = `
      SELECT id, certificate_url, verification_code
      FROM issued_certificates
      WHERE certificate_id = $1 AND student_id = $2
    `;
    const issuedResult = await query(issuedQuery, [certificateId, student_id]);

    let verificationCode;
    let certificateUrl;

    if (issuedResult.rows.length > 0) {
      // Certificate already issued, return existing
      return NextResponse.json({
        success: true,
        data: {
          certificate: {
            id: issuedResult.rows[0].id,
            certificate_url: issuedResult.rows[0].certificate_url,
            verification_code: issuedResult.rows[0].verification_code,
          },
        },
        message: 'Certificate already issued',
      });
    }

    // Generate verification code
    verificationCode = generateVerificationCode();

    // Prepare certificate data
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://edurock.com';
    const issuedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Get course name (if available from student's enrollments)
    const courseQuery = `
      SELECT c.title
      FROM course_enrollments ce
      INNER JOIN courses c ON c.id = ce.course_id
      WHERE ce.student_id = $1 AND ce.enrollment_status = 'completed'
      ORDER BY ce.updated_at DESC
      LIMIT 1
    `;
    const courseResult = await query(courseQuery, [student_id]);
    const courseName = courseResult.rows[0]?.title || 'Course';

    const certificateData = {
      student_name: studentName,
      course_name: courseName,
      issued_date: issuedDate,
      brand_name: certificate.brand_name,
    };

    // Store issued certificate with pending status
    const insertQuery = `
      INSERT INTO issued_certificates (
        certificate_id,
        student_id,
        verification_code,
        certificate_url,
        generation_status,
        issued_at
      ) VALUES ($1, $2, $3, $4, 'pending', CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const insertResult = await query(insertQuery, [
      certificateId,
      student_id,
      verificationCode,
      null, // URL will be set after generation
    ]);

    const issuedCertificateId = insertResult.rows[0].id;

    // Try to queue job for background processing
    let jobId = null;
    try {
      jobId = await queueCertificateGeneration({
        certificateId,
        studentId: student_id,
        issuedCertificateId,
        format,
      });

      // Update issued certificate with job_id
      await query(
        `UPDATE issued_certificates 
         SET generation_job_id = $1
         WHERE id = $2`,
        [jobId, issuedCertificateId]
      );
    } catch (queueError) {
      console.error('Failed to queue certificate generation job:', queueError);
      
      // Fallback: Process immediately if queue is not available
      try {
        const result = await generateAndUploadCertificate({
          templateDesign,
          certificateData,
          verificationCode,
          baseUrl,
          certificateId,
          studentId: student_id,
          format,
        });

        // Update with generated URL
        await query(
          `UPDATE issued_certificates 
           SET certificate_url = $1,
               generation_status = 'completed',
               generation_completed_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [result.certificateUrl, issuedCertificateId]
        );

        certificateUrl = result.certificateUrl;
      } catch (genError) {
        console.error('Immediate generation failed:', genError);
        // Update status to failed
        await query(
          `UPDATE issued_certificates 
           SET generation_status = 'failed',
               generation_error = $1
           WHERE id = $2`,
          [genError.message || 'Generation failed', issuedCertificateId]
        );

        return NextResponse.json(
          {
            success: false,
            error: 'Failed to generate certificate. Please try again later.',
          },
          { status: 500 }
        );
      }
    }

    // Get updated certificate record
    const updatedQuery = `
      SELECT id, certificate_url, verification_code, generation_status, generation_job_id
      FROM issued_certificates
      WHERE id = $1
    `;
    const updatedResult = await query(updatedQuery, [issuedCertificateId]);
    const updatedCertificate = updatedResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        certificate: {
          id: updatedCertificate.id,
          certificate_url: updatedCertificate.certificate_url,
          verification_code: updatedCertificate.verification_code,
          generation_status: updatedCertificate.generation_status,
          job_id: updatedCertificate.generation_job_id || jobId,
        },
      },
      message: jobId 
        ? 'Certificate generation queued successfully. It will be processed shortly.'
        : 'Certificate generated successfully.',
    });
  } catch (error) {
    console.error('Error generating brand certificate:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate certificate',
      },
      { status: error.status || 500 }
    );
  }
}

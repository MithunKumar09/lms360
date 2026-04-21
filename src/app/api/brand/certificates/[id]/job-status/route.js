/**
 * Certificate Generation Job Status API Route
 * 
 * GET /api/brand/certificates/[id]/job-status?job_id=xxx - Get certificate generation job status
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { getJobStatus } from '@/lib/queue/certificateQueue.js';

export async function GET(request, { params }) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    const { id: certificateId } = params;
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');
    const issuedCertificateId = searchParams.get('issued_certificate_id');

    if (!jobId && !issuedCertificateId) {
      return NextResponse.json(
        {
          success: false,
          error: 'job_id or issued_certificate_id is required',
        },
        { status: 400 }
      );
    }

    // If issued_certificate_id is provided, get job_id from database
    let actualJobId = jobId;
    if (!actualJobId && issuedCertificateId) {
      const certQuery = `
        SELECT ic.generation_job_id, ic.generation_status, ic.certificate_url, ic.generation_error
        FROM issued_certificates ic
        INNER JOIN brand_certificates bc ON bc.id = ic.certificate_id
        INNER JOIN brand_profiles bp ON bp.id = bc.brand_id
        WHERE ic.id = $1 AND bp.user_id = $2 AND bc.id = $3
      `;
      const certResult = await query(certQuery, [issuedCertificateId, userId, certificateId]);
      
      if (certResult.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Issued certificate not found',
          },
          { status: 404 }
        );
      }

      const cert = certResult.rows[0];
      actualJobId = cert.generation_job_id;

      // If no job_id but we have status from DB, return DB status
      if (!actualJobId) {
        return NextResponse.json({
          success: true,
          data: {
            status: cert.generation_status || 'pending',
            certificate_url: cert.certificate_url,
            error: cert.generation_error,
            source: 'database',
          },
        });
      }
    }

    // Get job status from queue
    const jobStatus = await getJobStatus(actualJobId);
    
    if (!jobStatus) {
      // Fallback to database status
      if (issuedCertificateId) {
        const certQuery = `
          SELECT generation_status, certificate_url, generation_error, generation_completed_at
          FROM issued_certificates
          WHERE id = $1
        `;
        const certResult = await query(certQuery, [issuedCertificateId]);
        
        if (certResult.rows.length > 0) {
          const cert = certResult.rows[0];
          return NextResponse.json({
            success: true,
            data: {
              status: cert.generation_status || 'pending',
              certificate_url: cert.certificate_url,
              error: cert.generation_error,
              completed_at: cert.generation_completed_at,
              source: 'database',
            },
          });
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Job not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        job_id: jobStatus.id,
        status: jobStatus.state,
        progress: jobStatus.progress,
        certificate_url: jobStatus.returnvalue?.certificateUrl || null,
        error: jobStatus.failedReason || null,
        created_at: jobStatus.timestamp,
        processed_at: jobStatus.processedOn,
        completed_at: jobStatus.finishedOn,
        source: 'queue',
      },
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get job status',
      },
      { status: error.status || 500 }
    );
  }
}

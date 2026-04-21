/**
 * Certificate Generation Worker
 * 
 * Processes certificate generation jobs from the queue.
 * This worker should be run as a separate process or in a background job runner.
 */

import { Worker } from 'bullmq';
import { getRedisClient } from './redis.js';
import { generateAndUploadCertificate } from '@/lib/certificates/serverGenerator.js';
import { query } from '@/lib/db/index.js';

const QUEUE_NAME = 'certificate-generation';

let certificateWorker = null;

/**
 * Validate that the job's tenant org still exists and is active.
 * Returns true if the job should proceed.
 * Discards the job (no retry) if the org is deleted.
 * Delays the job 1 hour if the org is suspended.
 * @param {Object} job - BullMQ job
 * @param {string|null} orgId - org UUID from job.data
 * @returns {Promise<boolean>} true = proceed, false = skip (already handled)
 */
async function validateTenantStatus(job, orgId) {
  if (!orgId) return true; // Global/platform jobs are not tenant-scoped

  const { rows } = await query(
    `SELECT status FROM organizations WHERE id = $1`,
    [orgId]
  );

  if (!rows[0]) {
    // Org deleted: discard the job — no retry
    console.warn(`Certificate job ${job.id}: org ${orgId} not found. Discarding.`);
    await job.discard();
    return false;
  }

  if (rows[0].status === 'suspended') {
    // Org suspended: delay 1 hour and check again later
    console.warn(`Certificate job ${job.id}: org ${orgId} is suspended. Delaying 1 hour.`);
    await job.moveToDelayed(Date.now() + 3_600_000);
    return false;
  }

  if (rows[0].status === 'deleted') {
    console.warn(`Certificate job ${job.id}: org ${orgId} is deleted. Discarding.`);
    await job.discard();
    return false;
  }

  return true;
}

/**
 * Process certificate generation job
 * @param {Object} job - BullMQ job
 * @returns {Promise<Object>} Job result
 */
async function processCertificateGeneration(job) {
  const { certificateId, studentId, issuedCertificateId, format = 'pdf', orgId = null } = job.data;

  // Tenant status check — must happen before any DB work for this org
  const shouldProceed = await validateTenantStatus(job, orgId);
  if (!shouldProceed) {
    return { skipped: true, reason: 'tenant_not_active' };
  }

  try {
    // Update status to processing
    await query(
      `UPDATE issued_certificates 
       SET generation_status = 'processing', 
           generation_job_id = $1
       WHERE id = $2`,
      [job.id, issuedCertificateId]
    );

    // Get certificate template
    const certQuery = `
      SELECT 
        bc.*,
        bp.brand_name,
        bp.user_id as brand_user_id
      FROM brand_certificates bc
      INNER JOIN brand_profiles bp ON bp.id = bc.brand_id
      WHERE bc.id = $1
    `;
    const certResult = await query(certQuery, [certificateId]);
    if (certResult.rows.length === 0) {
      throw new Error('Certificate template not found');
    }

    const certificate = certResult.rows[0];
    const templateDesign = certificate.template_data || {};

    // Get student details
    const studentQuery = `
      SELECT id, first_name, last_name, email
      FROM users
      WHERE id = $1 AND role = 'student'
    `;
    const studentResult = await query(studentQuery, [studentId]);
    if (studentResult.rows.length === 0) {
      throw new Error('Student not found');
    }

    const student = studentResult.rows[0];
    const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email;

    // Get issued certificate to get verification code
    const issuedQuery = `
      SELECT verification_code
      FROM issued_certificates
      WHERE id = $1
    `;
    const issuedResult = await query(issuedQuery, [issuedCertificateId]);
    if (issuedResult.rows.length === 0) {
      throw new Error('Issued certificate not found');
    }

    const verificationCode = issuedResult.rows[0].verification_code;

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
    const courseResult = await query(courseQuery, [studentId]);
    const courseName = courseResult.rows[0]?.title || 'Course';

    const certificateData = {
      student_name: studentName,
      course_name: courseName,
      issued_date: issuedDate,
      brand_name: certificate.brand_name,
    };

    // Generate and upload certificate
    const result = await generateAndUploadCertificate({
      templateDesign,
      certificateData,
      verificationCode,
      baseUrl,
      certificateId,
      studentId,
      format,
    });

    // Update issued certificate with URL and status
    await query(
      `UPDATE issued_certificates 
       SET certificate_url = $1,
           generation_status = 'completed',
           generation_completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [result.certificateUrl, issuedCertificateId]
    );

    return {
      success: true,
      certificateUrl: result.certificateUrl,
      issuedCertificateId,
    };
  } catch (error) {
    console.error('Certificate generation error:', error);

    // Update status to failed
    await query(
      `UPDATE issued_certificates 
       SET generation_status = 'failed',
           generation_error = $1
       WHERE id = $2`,
      [error.message || 'Unknown error', issuedCertificateId]
    );

    throw error;
  }
}

/**
 * Create and start certificate generation worker
 * @returns {Worker|null} Worker instance or null if Redis unavailable
 */
export function createCertificateWorker() {
  if (certificateWorker) {
    return certificateWorker;
  }

  const redis = getRedisClient();
  if (!redis) {
    console.warn('Redis not available. Worker cannot be created.');
    return null;
  }

  certificateWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      console.log(`Processing certificate generation job: ${job.id}`);
      return await processCertificateGeneration(job);
    },
    {
      connection: redis,
      concurrency: 2, // Process 2 jobs concurrently
      limiter: {
        max: 10, // Max 10 jobs
        duration: 1000, // Per second
      },
    }
  );

  certificateWorker.on('completed', (job) => {
    console.log(`Certificate generation job ${job.id} completed`);
  });

  certificateWorker.on('failed', (job, err) => {
    console.error(`Certificate generation job ${job.id} failed:`, err);
  });

  certificateWorker.on('error', (err) => {
    console.error('Certificate worker error:', err);
  });

  return certificateWorker;
}

/**
 * Close worker
 */
export async function closeCertificateWorker() {
  if (certificateWorker) {
    await certificateWorker.close();
    certificateWorker = null;
  }
}

export default {
  createCertificateWorker,
  closeCertificateWorker,
};

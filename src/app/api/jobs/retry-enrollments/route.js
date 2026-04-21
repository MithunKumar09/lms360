/**
 * Retry Enrollments Job API Route
 * 
 * POST /api/jobs/retry-enrollments - Trigger enrollment retry job
 * Protected with API key authentication
 */

import { NextResponse } from 'next/server';
import retryFailedEnrollments from '@/lib/jobs/enrollmentRetryJob.js';

/**
 * Verify API key for job endpoints
 */
function verifyApiKey(request) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.JOB_API_KEY || process.env.CRON_SECRET;
  
  if (!expectedKey) {
    console.warn('JOB_API_KEY or CRON_SECRET not set - allowing request (development mode)');
    return true;
  }
  
  return apiKey === expectedKey;
}

/**
 * POST /api/jobs/retry-enrollments
 * Retry failed enrollments/registrations
 */
export async function POST(request) {
  try {
    // Verify API key
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const batchSize = body.batchSize || 50;

    const result = await retryFailedEnrollments(batchSize);

    return NextResponse.json({
      success: true,
      message: `Enrollment retry completed: ${result.processed} orders processed, ${result.successful} successful, ${result.failed} failed`,
      result,
    });
  } catch (error) {
    console.error('Retry enrollments job error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retry enrollments' },
      { status: 500 }
    );
  }
}


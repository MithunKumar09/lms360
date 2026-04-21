/**
 * Webhook Retry Job API Route
 * 
 * POST /api/jobs/retry-webhooks - Trigger webhook retry job
 * Protected with API key authentication
 */

import { NextResponse } from 'next/server';
import retryFailedWebhooks from '@/lib/jobs/webhookRetryJob.js';

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
 * POST /api/jobs/retry-webhooks
 * Trigger webhook retry job
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
    const batchSize = body.batchSize || 10;

    const result = await retryFailedWebhooks(batchSize);

    return NextResponse.json({
      success: true,
      message: `Webhook retry completed: ${result.processed} webhooks processed, ${result.successful} successful, ${result.failed} failed`,
      result,
    });
  } catch (error) {
    console.error('Webhook retry job error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retry webhooks' },
      { status: 500 }
    );
  }
}


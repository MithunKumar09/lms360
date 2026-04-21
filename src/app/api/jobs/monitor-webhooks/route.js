/**
 * Monitor Webhooks Job API Route
 * 
 * POST /api/jobs/monitor-webhooks - Trigger webhook monitoring job
 * Protected with API key authentication
 */

import { NextResponse } from 'next/server';
import monitorWebhooks from '@/lib/jobs/webhookMonitoringJob.js';

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
 * POST /api/jobs/monitor-webhooks
 * Monitor webhook processing status
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

    const result = await monitorWebhooks();

    return NextResponse.json({
      success: true,
      message: `Webhook monitoring completed. Found ${result.failedWebhooksCount} failed and ${result.stuckWebhooksCount} stuck webhooks.`,
      result,
    });
  } catch (error) {
    console.error('Monitor webhooks job error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to monitor webhooks' },
      { status: 500 }
    );
  }
}


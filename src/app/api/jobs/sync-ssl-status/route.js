/**
 * SSL Status Sync Cron Job Endpoint
 *
 * POST /api/jobs/sync-ssl-status
 *   — Protected by JOB_API_KEY / CRON_SECRET.
 *   — Run every 5 minutes via cron.
 *   — Polls Cloudflare Custom Hostnames API for provisioning→active transitions.
 */

import { NextResponse } from 'next/server';
import { runSslStatusSyncJob } from '@/lib/jobs/sslProvisioningJob.js';

function verifyApiKey(request) {
  const apiKey =
    request.headers.get('x-api-key') ??
    request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.JOB_API_KEY ?? process.env.CRON_SECRET;

  if (!expectedKey) {
    console.warn('JOB_API_KEY or CRON_SECRET not set — allowing (development mode)');
    return true;
  }

  return apiKey === expectedKey;
}

export async function POST(request) {
  if (!verifyApiKey(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runSslStatusSyncJob();
    return NextResponse.json({
      success: true,
      message: `SSL sync: ${result.checked} checked, ${result.activated} activated, ${result.failed} failed`,
      result,
    });
  } catch (error) {
    console.error('SSL status sync job error:', error);
    return NextResponse.json(
      { success: false, error: error.message ?? 'SSL sync job failed' },
      { status: 500 }
    );
  }
}

export const GET = POST;

/**
 * Custom Domain Verification Cron Job Endpoint
 *
 * POST /api/jobs/verify-custom-domains
 *   — Protected by JOB_API_KEY / CRON_SECRET.
 *   — Run every 5 minutes via cron.
 *   — Checks DNS TXT records for all orgs with pending custom domain verification.
 */

import { NextResponse } from 'next/server';
import { runDomainVerificationJob } from '@/lib/jobs/domainVerificationJob.js';

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
    const result = await runDomainVerificationJob();
    return NextResponse.json({
      success: true,
      message: `Domain verification: ${result.checked} checked, ${result.verified} verified, ${result.failed} failed`,
      result,
    });
  } catch (error) {
    console.error('Domain verification job error:', error);
    return NextResponse.json(
      { success: false, error: error.message ?? 'Domain verification job failed' },
      { status: 500 }
    );
  }
}

export const GET = POST; // Allow GET for simple cron pings

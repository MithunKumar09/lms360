/**
 * Generate Finance Reports Job API Route
 * 
 * POST /api/jobs/generate-finance-reports - Generate finance reports
 * Protected with API key authentication
 */

import { NextResponse } from 'next/server';
import generateFinanceReports from '@/lib/jobs/generateFinanceReports.js';

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
 * POST /api/jobs/generate-finance-reports
 * Generate finance reports
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
    const { period = 'daily', startDate = null, endDate = null } = body;

    const report = await generateFinanceReports({
      period,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Generate finance reports job error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate finance reports' },
      { status: 500 }
    );
  }
}


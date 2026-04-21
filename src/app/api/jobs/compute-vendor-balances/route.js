/**
 * Compute Vendor Balances Job API Route
 * 
 * POST /api/jobs/compute-vendor-balances - Trigger vendor balance computation
 * Protected with API key authentication
 */

import { NextResponse } from 'next/server';
import { getReconciliationService } from '@/lib/services/razorpay/ReconciliationService.js';

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
 * POST /api/jobs/compute-vendor-balances
 * Trigger vendor balance computation
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
    const holdPeriodDays = body.holdPeriodDays || 7;

    const reconciliationService = getReconciliationService();
    const result = await reconciliationService.computeVendorBalances(holdPeriodDays);

    return NextResponse.json({
      success: true,
      message: `Vendor balance computation completed: ${result.processed} vendors updated`,
      result,
    });
  } catch (error) {
    console.error('Compute vendor balances job error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to compute vendor balances' },
      { status: 500 }
    );
  }
}


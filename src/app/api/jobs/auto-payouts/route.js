/**
 * Automatic Payouts Job API Route
 * 
 * POST /api/jobs/auto-payouts - Trigger automatic payout processing
 * Protected with API key authentication
 */

import { NextResponse } from 'next/server';
import { processAllAutoPayouts } from '@/lib/jobs/autoPayoutJob.js';
import { getOrgStatus } from '@/lib/tenant/orgStatus.js';

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
 * POST /api/jobs/auto-payouts
 * Trigger automatic payout processing
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
    const { entityType, orgId } = body; // Optional: restrict to a specific org

    // If an explicit orgId is provided, verify the org is active before processing
    if (orgId) {
      const orgStatus = await getOrgStatus(orgId);
      if (!orgStatus.active) {
        return NextResponse.json(
          { success: true, skipped: true, reason: `org_${orgStatus.status}` },
          { status: 200 }
        );
      }
    }

    let result;

    if (entityType) {
      const { processAutoVendorPayouts, processAutoOrganizationPayouts, processAutoSuperadminPayouts } = await import('@/lib/jobs/autoPayoutJob.js');
      
      switch (entityType) {
        case 'vendor':
          result = await processAutoVendorPayouts();
          break;
        case 'organization':
          result = await processAutoOrganizationPayouts();
          break;
        case 'superadmin':
          result = await processAutoSuperadminPayouts();
          break;
        default:
          return NextResponse.json(
            { success: false, error: `Invalid entityType: ${entityType}. Must be 'vendor', 'organization', or 'superadmin'` },
            { status: 400 }
          );
      }
    } else {
      // Process all entity types
      result = await processAllAutoPayouts();
    }

    return NextResponse.json({
      success: true,
      message: `Automatic payout processing completed: ${result.processed} created, ${result.skipped} skipped, ${result.failed} failed`,
      result,
    });
  } catch (error) {
    console.error('Automatic payout job error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process automatic payouts' },
      { status: 500 }
    );
  }
}

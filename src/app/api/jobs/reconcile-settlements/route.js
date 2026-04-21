/**
 * Reconciliation Job API Route
 * 
 * POST /api/jobs/reconcile-settlements - Trigger settlement reconciliation
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
 * POST /api/jobs/reconcile-settlements
 * Trigger settlement reconciliation
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
    const { settlementId, dateFrom, dateTo } = body;

    const reconciliationService = getReconciliationService();
    const results = [];

    if (settlementId) {
      // Reconcile specific settlement
      const result = await reconciliationService.flagMismatches(settlementId);
      results.push(result);
    } else if (dateFrom && dateTo) {
      // Reconcile settlements in date range
      const settlements = await reconciliationService.fetchSettlements({
        from: new Date(dateFrom).getTime() / 1000,
        to: new Date(dateTo).getTime() / 1000,
      });

      for (const settlement of settlements) {
        try {
          const result = await reconciliationService.flagMismatches(settlement.id);
          results.push(result);
        } catch (error) {
          console.error(`Error reconciling settlement ${settlement.id}:`, error);
          results.push({
            settlementId: settlement.id,
            hasMismatch: false,
            error: error.message,
          });
        }
      }
    } else {
      // Reconcile latest settlements (default)
      const settlements = await reconciliationService.fetchSettlements({ count: 10 });
      
      for (const settlement of settlements) {
        try {
          const result = await reconciliationService.flagMismatches(settlement.id);
          results.push(result);
        } catch (error) {
          console.error(`Error reconciling settlement ${settlement.id}:`, error);
          results.push({
            settlementId: settlement.id,
            hasMismatch: false,
            error: error.message,
          });
        }
      }
    }

    const totalMismatches = results.filter(r => r.hasMismatch).length;

    return NextResponse.json({
      success: true,
      message: `Reconciliation completed: ${results.length} settlements processed, ${totalMismatches} mismatches found`,
      results,
      summary: {
        total: results.length,
        matched: results.filter(r => !r.hasMismatch).length,
        mismatches: totalMismatches,
      },
    });
  } catch (error) {
    console.error('Reconciliation job error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to run reconciliation' },
      { status: 500 }
    );
  }
}


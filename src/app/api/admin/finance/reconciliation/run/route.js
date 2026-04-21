/**
 * Reconciliation Run API Route
 * 
 * POST /api/admin/finance/reconciliation/run - Manually trigger reconciliation
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getReconciliationService } from '@/lib/services/razorpay/ReconciliationService.js';
import { getPaymentAuditService } from '@/lib/services/payment/PaymentAuditService.js';

/**
 * POST /api/admin/finance/reconciliation/run
 * Manually trigger reconciliation
 * 
 * Request Body:
 * {
 *   "settlementId": "setl_xxx" (optional - Razorpay settlement ID)
 *   "dateFrom": "2025-01-01" (optional - date range start)
 *   "dateTo": "2025-01-31" (optional - date range end)
 * }
 */
export async function POST(request) {
  try {
    const session = await requireSuperadmin(request);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userEmail = session.user.email;
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const body = await request.json();
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
      // Reconcile latest settlements
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

    // Log audit
    const auditService = getPaymentAuditService();
    await auditService.logAction({
      action: 'settlement_reconciled',
      actorId: userId,
      actorRole: userRole,
      actorEmail: userEmail,
      description: `Manual reconciliation triggered: ${results.length} settlements processed`,
      metadata: { results },
      ipAddress,
      userAgent,
    });

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
    console.error('Reconciliation run error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to run reconciliation' },
      { status: 500 }
    );
  }
}


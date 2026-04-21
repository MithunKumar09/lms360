/**
 * Payment Audit Logs API Route
 * 
 * GET /api/admin/finance/audit-logs - List payment audit logs
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getPaymentAuditService } from '@/lib/services/payment/PaymentAuditService.js';

/**
 * GET /api/admin/finance/audit-logs
 * List payment audit logs with filters
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const { searchParams } = new URL(request.url);

    const action = searchParams.get('action');
    const actorId = searchParams.get('actorId');
    const targetType = searchParams.get('targetType');
    const targetId = searchParams.get('targetId');
    const orderId = searchParams.get('orderId');
    const paymentId = searchParams.get('paymentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const auditService = getPaymentAuditService();
    const logs = await auditService.queryLogs({
      action,
      actorId,
      targetType,
      targetId,
      orderId,
      paymentId,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        // Note: Total count would require separate query for accurate count
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get audit logs' },
      { status: 500 }
    );
  }
}


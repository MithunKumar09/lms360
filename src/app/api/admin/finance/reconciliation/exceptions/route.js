/**
 * Reconciliation Exceptions API Route
 * 
 * GET /api/admin/finance/reconciliation/exceptions - List reconciliation exceptions
 * PATCH /api/admin/finance/reconciliation/exceptions - Resolve exception
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { getPaymentAuditService } from '@/lib/services/payment/PaymentAuditService.js';

/**
 * GET /api/admin/finance/reconciliation/exceptions
 * List reconciliation exceptions with filters
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const settlementId = searchParams.get('settlementId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND re.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (settlementId) {
      whereClause += ` AND re.settlement_id = $${paramIndex}`;
      queryParams.push(settlementId);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM reconciliation_exceptions re
       ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get exceptions with settlement info
    queryParams.push(limit, offset);
    const exceptionsResult = await query(
      `SELECT 
         re.*,
         s.razorpay_settlement_id,
         s.amount as settlement_amount,
         s.settled_at,
         s.settled_on,
         u.email as resolved_by_email
       FROM reconciliation_exceptions re
       JOIN settlements s ON re.settlement_id = s.id
       LEFT JOIN users u ON re.resolved_by = u.id
       ${whereClause}
       ORDER BY re.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    const exceptions = exceptionsResult.rows.map(row => ({
      id: row.id,
      settlementId: row.settlement_id,
      razorpaySettlementId: row.razorpay_settlement_id,
      expectedAmount: parseFloat(row.expected_amount),
      actualAmount: parseFloat(row.actual_amount),
      difference: parseFloat(row.difference),
      status: row.status,
      exceptionType: row.exception_type,
      description: row.description,
      notes: row.notes,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
      resolvedByEmail: row.resolved_by_email,
      resolutionNotes: row.resolution_notes,
      settlementAmount: parseFloat(row.settlement_amount),
      settledAt: row.settled_at,
      settledOn: row.settled_on,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      exceptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get reconciliation exceptions error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get reconciliation exceptions' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/finance/reconciliation/exceptions
 * Resolve reconciliation exception
 * 
 * Request Body:
 * {
 *   "exceptionId": "uuid",
 *   "action": "resolve" | "ignore",
 *   "notes": "Resolution notes"
 * }
 */
export async function PATCH(request) {
  try {
    const session = await requireSuperadmin(request);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userEmail = session.user.email;
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const body = await request.json();
    const { exceptionId, action, notes } = body;

    if (!exceptionId || !action) {
      return NextResponse.json(
        { success: false, error: 'exceptionId and action are required' },
        { status: 400 }
      );
    }

    if (!['resolve', 'ignore'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'action must be resolve or ignore' },
        { status: 400 }
      );
    }

    // Get exception
    const exceptionResult = await query(
      `SELECT * FROM reconciliation_exceptions WHERE id = $1`,
      [exceptionId]
    );

    if (exceptionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Exception not found' },
        { status: 404 }
      );
    }

    const exception = exceptionResult.rows[0];

    // Update exception
    const newStatus = action === 'resolve' ? 'resolved' : 'ignored';
    await query(
      `UPDATE reconciliation_exceptions
       SET status = $1,
           resolved_at = CURRENT_TIMESTAMP,
           resolved_by = $2,
           resolution_notes = $3,
           notes = COALESCE($4, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [newStatus, userId, notes || null, notes || null, exceptionId]
    );

    // Log audit
    const auditService = getPaymentAuditService();
    await auditService.logAction({
      action: 'reconciliation_exception_resolved',
      actorId: userId,
      actorRole: userRole,
      actorEmail: userEmail,
      targetType: 'reconciliation_exception',
      targetId: exceptionId,
      description: `Reconciliation exception ${action}: ${exceptionId}`,
      metadata: { exceptionId, action, notes, settlementId: exception.settlement_id },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: `Exception ${action}d successfully`,
    });
  } catch (error) {
    console.error('Resolve reconciliation exception error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to resolve exception' },
      { status: 500 }
    );
  }
}


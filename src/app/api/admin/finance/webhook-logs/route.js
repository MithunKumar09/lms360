/**
 * Admin Finance Webhook Logs API Route
 * 
 * GET /api/admin/finance/webhook-logs - List webhook logs (superadmin only)
 * POST /api/admin/finance/webhook-logs - Replay webhook (superadmin only)
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import * as webhookHandlers from '@/lib/services/razorpay/webhookHandlers.js';

/**
 * GET /api/admin/finance/webhook-logs
 * List webhook logs with filters and pagination
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status');
    const eventType = searchParams.get('eventType');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (eventType) {
      whereClause += ` AND event_type = $${paramIndex}`;
      queryParams.push(eventType);
      paramIndex++;
    }

    if (search) {
      // Search in event_id or payload (for order_id, payment_id)
      whereClause += ` AND (
        event_id ILIKE $${paramIndex} OR
        payload::text ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      // Add one day to include the entire end date
      const endDateObj = new Date(endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      whereClause += ` AND created_at < $${paramIndex}`;
      queryParams.push(endDateObj.toISOString());
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM webhook_logs ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get webhook logs
    const logsResult = await query(
      `SELECT *
       FROM webhook_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const logs = logsResult.rows.map(row => ({
      id: row.id,
      eventId: row.event_id,
      eventType: row.event_type,
      status: row.status,
      signatureValid: row.signature_valid,
      processedAt: row.processed_at,
      errorMessage: row.error_message,
      retryCount: row.retry_count,
      payload: row.payload,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get webhook logs error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get webhook logs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/finance/webhook-logs
 * Replay a webhook event
 * 
 * Request Body:
 * {
 *   "webhookLogId": "uuid"
 * }
 */
export async function POST(request) {
  try {
    const session = await requireSuperadmin(request);
    const body = await request.json();
    const { webhookLogId } = body;

    if (!webhookLogId) {
      return NextResponse.json(
        { success: false, error: 'webhookLogId is required' },
        { status: 400 }
      );
    }

    // Get webhook log
    const logResult = await query(
      `SELECT * FROM webhook_logs WHERE id = $1`,
      [webhookLogId]
    );

    if (logResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Webhook log not found' },
        { status: 404 }
      );
    }

    const log = logResult.rows[0];

    // Parse payload
    const event = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;

    // Route to appropriate handler
    const eventType = event.event || log.event_type;
    let handlerResult;

    try {
      switch (eventType) {
        case 'payment.captured':
          await webhookHandlers.handlePaymentCaptured(event);
          break;
        case 'payment.failed':
          await webhookHandlers.handlePaymentFailed(event);
          break;
        case 'order.paid':
          await webhookHandlers.handleOrderPaid(event);
          break;
        case 'refund.processed':
          await webhookHandlers.handleRefundSucceeded(event);
          break;
        default:
          return NextResponse.json(
            { success: false, error: `No handler for event type: ${eventType}` },
            { status: 400 }
          );
      }

      // Update log status
      await query(
        `UPDATE webhook_logs
         SET status = 'processed', processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [webhookLogId]
      );

      return NextResponse.json({
        success: true,
        message: 'Webhook replayed successfully',
      });
    } catch (error) {
      console.error('Webhook replay error:', error);
      
      // Update log with error
      await query(
        `UPDATE webhook_logs
         SET status = 'failed', error_message = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [error.message, webhookLogId]
      );

      return NextResponse.json(
        { success: false, error: `Failed to replay webhook: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Replay webhook error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to replay webhook' },
      { status: 500 }
    );
  }
}


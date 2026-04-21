/**
 * Superadmin Finance Payouts API Route
 * 
 * GET /api/admin/finance/superadmin/payouts - List superadmin payouts
 * POST /api/admin/finance/superadmin/payouts - Request superadmin payout
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { getSuperadminAccountByUserId } from '@/lib/db/superadminAccounts.js';
import { getCurrentSuperadminBalance } from '@/lib/db/superadminBalances.js';

/**
 * GET /api/admin/finance/superadmin/payouts
 * List superadmin payouts with filters and pagination
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - status: Filter by payout status (optional)
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;

    // Build filters
    let whereClause = `WHERE p.superadmin_account_id IN (
      SELECT id FROM superadmin_accounts WHERE user_id = $1
    )`;
    const queryParams = [userId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM payouts p
       ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get payouts
    const payoutsResult = await query(
      `SELECT 
         p.*,
         sa.user_id
       FROM payouts p
       JOIN superadmin_accounts sa ON p.superadmin_account_id = sa.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const payouts = payoutsResult.rows.map(row => ({
      id: row.id,
      razorpayPayoutId: row.razorpay_payout_id,
      userId: row.user_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status,
      mode: row.mode,
      referenceId: row.reference_id,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
      processedAt: row.processed_at,
      failedAt: row.failed_at,
    }));

    return NextResponse.json({
      success: true,
      payouts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get superadmin payouts error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get superadmin payouts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/finance/superadmin/payouts
 * Request superadmin payout
 * 
 * Request Body:
 * {
 *   "amount": 1000.00,
 *   "currency": "INR",
 *   "mode": "NEFT",
 *   "referenceId": "optional-reference-id"
 * }
 */
export async function POST(request) {
  try {
    const session = await requireSuperadmin(request);
    const userId = session.user.id;
    const body = await request.json();

    const { amount, currency = 'INR', mode = 'NEFT', referenceId } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount is required and must be greater than 0' },
        { status: 400 }
      );
    }

    // Get superadmin account
    const superadminAccount = await getSuperadminAccountByUserId(userId);
    
    if (!superadminAccount) {
      return NextResponse.json(
        { success: false, error: 'Superadmin account not found' },
        { status: 404 }
      );
    }

    // Check KYC status
    if (superadminAccount.kyc_status !== 'verified') {
      return NextResponse.json(
        { success: false, error: 'Superadmin KYC must be verified before requesting payout' },
        { status: 400 }
      );
    }

    // Check fund account
    if (!superadminAccount.fund_account_id) {
      return NextResponse.json(
        { success: false, error: 'Fund account not configured for superadmin' },
        { status: 400 }
      );
    }

    // Get current balance
    const balance = await getCurrentSuperadminBalance(superadminAccount.id);
    const withdrawableAmount = parseFloat(balance.withdrawable_amount) || 0;

    if (amount > withdrawableAmount) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient balance. Available: ${withdrawableAmount}, Requested: ${amount}` 
        },
        { status: 400 }
      );
    }

    // Create payout record
    const payoutResult = await query(
      `INSERT INTO payouts (
        superadmin_account_id, amount, currency, mode, reference_id, status
      ) VALUES ($1, $2, $3, $4, $5, 'queued')
      RETURNING *`,
      [
        superadminAccount.id,
        amount,
        currency,
        mode,
        referenceId || `superadmin_payout_${userId}_${Date.now()}`,
      ]
    );

    const payout = payoutResult.rows[0];

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.id,
        amount: parseFloat(payout.amount),
        currency: payout.currency,
        status: payout.status,
        mode: payout.mode,
        referenceId: payout.reference_id,
        createdAt: payout.created_at,
      },
      message: 'Payout request created successfully. It will be processed automatically.',
    });
  } catch (error) {
    console.error('Create superadmin payout error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create payout request' },
      { status: 500 }
    );
  }
}


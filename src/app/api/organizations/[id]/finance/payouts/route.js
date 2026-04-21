/**
 * Organization Finance Payouts API Route
 * 
 * GET /api/organizations/[id]/finance/payouts - List organization payouts
 * POST /api/organizations/[id]/finance/payouts - Request organization payout
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { getOrganizationAccountByOrgId } from '@/lib/db/organizationAccounts.js';
import { getCurrentOrganizationBalance } from '@/lib/db/organizationBalances.js';
import { getRazorpayService } from '@/lib/services/razorpay/RazorpayService.js';

/**
 * GET /api/organizations/[id]/finance/payouts
 * List organization payouts with filters and pagination
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - status: Filter by payout status (optional)
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const { id: orgId } = params;
    const { searchParams } = new URL(request.url);
    
    // Verify organization access
    if (session.user.role !== 'superadmin' && session.user.orgId !== orgId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this organization' },
        { status: 403 }
      );
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;

    // Build filters
    let whereClause = `WHERE p.organization_account_id IN (
      SELECT id FROM organization_accounts WHERE org_id = $1
    )`;
    const queryParams = [orgId];
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
         oa.org_id
       FROM payouts p
       JOIN organization_accounts oa ON p.organization_account_id = oa.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const payouts = payoutsResult.rows.map(row => ({
      id: row.id,
      razorpayPayoutId: row.razorpay_payout_id,
      orgId: row.org_id,
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
    console.error('Get organization payouts error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get organization payouts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/[id]/finance/payouts
 * Request organization payout
 * 
 * Request Body:
 * {
 *   "amount": 1000.00,
 *   "currency": "INR",
 *   "mode": "NEFT",
 *   "referenceId": "optional-reference-id"
 * }
 */
export async function POST(request, { params }) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const { id: orgId } = params;
    const body = await request.json();
    
    // Verify organization access (only admin of that org can request payout)
    if (session.user.role !== 'superadmin' && session.user.orgId !== orgId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this organization' },
        { status: 403 }
      );
    }

    // Only admin can request payout (not superadmin viewing)
    if (session.user.role === 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Only organization admin can request payouts' },
        { status: 403 }
      );
    }

    const { amount, currency = 'INR', mode = 'NEFT', referenceId } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount is required and must be greater than 0' },
        { status: 400 }
      );
    }

    // Get organization account
    const organizationAccount = await getOrganizationAccountByOrgId(orgId);
    
    if (!organizationAccount) {
      return NextResponse.json(
        { success: false, error: 'Organization account not found' },
        { status: 404 }
      );
    }

    // Check KYC status
    if (organizationAccount.kyc_status !== 'verified') {
      return NextResponse.json(
        { success: false, error: 'Organization KYC must be verified before requesting payout' },
        { status: 400 }
      );
    }

    // Check fund account
    if (!organizationAccount.fund_account_id) {
      return NextResponse.json(
        { success: false, error: 'Fund account not configured for organization' },
        { status: 400 }
      );
    }

    // Get current balance
    const balance = await getCurrentOrganizationBalance(organizationAccount.id);
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
        organization_account_id, amount, currency, mode, reference_id, status
      ) VALUES ($1, $2, $3, $4, $5, 'queued')
      RETURNING *`,
      [
        organizationAccount.id,
        amount,
        currency,
        mode,
        referenceId || `org_payout_${orgId}_${Date.now()}`,
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
    console.error('Create organization payout error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create payout request' },
      { status: 500 }
    );
  }
}


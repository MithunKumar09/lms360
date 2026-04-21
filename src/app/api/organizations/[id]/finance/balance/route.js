/**
 * Organization Finance Balance API Route
 * 
 * GET /api/organizations/[id]/finance/balance - Get organization balance
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { getOrganizationAccountByOrgId } from '@/lib/db/organizationAccounts.js';
import { getCurrentOrganizationBalance } from '@/lib/db/organizationBalances.js';

/**
 * GET /api/organizations/[id]/finance/balance
 * Get current organization balance
 * 
 * Query Parameters:
 * - includeHistory: Include balance history (default: false)
 * - historyLimit: Limit for history records (default: 10)
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const { id: orgId } = params;
    const { searchParams } = new URL(request.url);
    
    // Verify organization access
    // Superadmin can access any organization, admin can only access their own
    if (session.user.role !== 'superadmin' && session.user.orgId !== orgId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this organization' },
        { status: 403 }
      );
    }

    // Get organization account
    const organizationAccount = await getOrganizationAccountByOrgId(orgId);
    
    if (!organizationAccount) {
      // Return zero balance if account doesn't exist
      return NextResponse.json({
        success: true,
        balance: {
          withdrawable: 0,
          pending: 0,
          onHold: 0,
          currency: 'INR',
          lastUpdated: null,
        },
        kycStatus: 'not_submitted',
      });
    }

    // Get current balance
    const balance = await getCurrentOrganizationBalance(organizationAccount.id);
    
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const historyLimit = parseInt(searchParams.get('historyLimit') || '10', 10);
    
    let history = [];
    if (includeHistory) {
      const historyResult = await query(
        `SELECT withdrawable_amount, pending_amount, on_hold_amount, snapshot_at
         FROM organization_balances
         WHERE organization_account_id = $1
         ORDER BY snapshot_at DESC
         LIMIT $2`,
        [organizationAccount.id, historyLimit]
      );
      
      history = historyResult.rows.map(row => ({
        withdrawable: parseFloat(row.withdrawable_amount) || 0,
        pending: parseFloat(row.pending_amount) || 0,
        onHold: parseFloat(row.on_hold_amount) || 0,
        snapshotAt: row.snapshot_at,
      }));
    }

    return NextResponse.json({
      success: true,
      balance: {
        withdrawable: parseFloat(balance.withdrawable_amount) || 0,
        pending: parseFloat(balance.pending_amount) || 0,
        onHold: parseFloat(balance.on_hold_amount) || 0,
        currency: balance.currency || 'INR',
        lastUpdated: balance.snapshot_at,
      },
      kycStatus: organizationAccount.kyc_status || 'not_submitted',
      history: includeHistory ? history : undefined,
    });
  } catch (error) {
    console.error('Get organization balance error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get organization balance' },
      { status: 500 }
    );
  }
}


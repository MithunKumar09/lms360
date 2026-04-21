/**
 * Superadmin Finance Balance API Route
 * 
 * GET /api/admin/finance/superadmin/balance - Get superadmin balance
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { getSuperadminAccountByUserId } from '@/lib/db/superadminAccounts.js';
import { getCurrentSuperadminBalance } from '@/lib/db/superadminBalances.js';

/**
 * GET /api/admin/finance/superadmin/balance
 * Get current superadmin balance
 * 
 * Query Parameters:
 * - includeHistory: Include balance history (default: false)
 * - historyLimit: Limit for history records (default: 10)
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    // Get superadmin account
    const superadminAccount = await getSuperadminAccountByUserId(userId);
    
    if (!superadminAccount) {
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
    const balance = await getCurrentSuperadminBalance(superadminAccount.id);
    
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const historyLimit = parseInt(searchParams.get('historyLimit') || '10', 10);
    
    let history = [];
    if (includeHistory) {
      const historyResult = await query(
        `SELECT withdrawable_amount, pending_amount, on_hold_amount, snapshot_at
         FROM superadmin_balances
         WHERE superadmin_account_id = $1
         ORDER BY snapshot_at DESC
         LIMIT $2`,
        [superadminAccount.id, historyLimit]
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
      kycStatus: superadminAccount.kyc_status || 'not_submitted',
      history: includeHistory ? history : undefined,
    });
  } catch (error) {
    console.error('Get superadmin balance error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get superadmin balance' },
      { status: 500 }
    );
  }
}


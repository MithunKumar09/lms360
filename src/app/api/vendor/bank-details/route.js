/**
 * Vendor Bank Details API Route
 * 
 * GET /api/vendor/bank-details - Get vendor bank details
 * POST /api/vendor/bank-details - Create/update vendor bank details and fund account
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { getRazorpayService } from '@/lib/services/razorpay/RazorpayService.js';

/**
 * GET /api/vendor/bank-details
 * Get vendor bank details and fund account
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['vendor']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;

    // Get vendor account
    const vendorAccountResult = await query(
      `SELECT * FROM vendor_accounts WHERE user_id = $1`,
      [userId]
    );

    if (!Array.isArray(vendorAccountResult?.rows) || vendorAccountResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        bankDetails: null,
        fundAccountId: null,
        kycStatus: 'not_submitted',
      });
    }

    const vendorAccount = vendorAccountResult.rows[0];
    if (!vendorAccount || typeof vendorAccount !== 'object') {
      return NextResponse.json({
        success: true,
        bankDetails: null,
        fundAccountId: null,
        kycStatus: 'not_submitted',
      });
    }

    // Don't return sensitive data - only return what's needed for UI
    return NextResponse.json({
      success: true,
      bankDetails: {
        accountHolderName: vendorAccount.account_holder_name,
        bankName: vendorAccount.bank_name,
        ifsc: vendorAccount.bank_ifsc,
        // Don't return account number - only last 4 digits if needed
        accountNumberLast4: vendorAccount.bank_account_number_hash
          ? '****' + vendorAccount.bank_account_number_hash.slice(-4)
          : null,
      },
      fundAccountId: vendorAccount.fund_account_id,
      linkedAccountId: vendorAccount.linked_account_id,
      kycStatus: vendorAccount.kyc_status,
      kycSubmittedAt: vendorAccount.kyc_submitted_at,
      kycVerifiedAt: vendorAccount.kyc_verified_at,
      kycRejectionReason: vendorAccount.kyc_rejection_reason,
    });
  } catch (error) {
    console.error('Get bank details error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get bank details' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vendor/bank-details
 * Create/update vendor bank details and fund account
 * 
 * Request Body:
 * {
 *   "accountHolderName": "John Doe",
 *   "accountNumber": "1234567890",
 *   "ifsc": "HDFC0001234",
 *   "bankName": "HDFC Bank"
 * }
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['vendor']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const orgId = session.user.orgId || session.user.org_id;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }
    const { accountHolderName, accountNumber, ifsc, accountType, bankName } = body;

    // Validate input
    if (!accountHolderName || !accountNumber || !ifsc || !bankName) {
      return NextResponse.json(
        { success: false, error: 'All bank details are required' },
        { status: 400 }
      );
    }

    // Validate IFSC format (11 characters)
    if (ifsc.length !== 11) {
      return NextResponse.json(
        { success: false, error: 'IFSC code must be 11 characters' },
        { status: 400 }
      );
    }

    // Get or create vendor account
    let vendorAccountResult = await query(
      `SELECT * FROM vendor_accounts WHERE user_id = $1`,
      [userId]
    );

    let vendorAccountId;
    if (!Array.isArray(vendorAccountResult?.rows) || vendorAccountResult.rows.length === 0) {
      // Create vendor account
      const createResult = await query(
        `INSERT INTO vendor_accounts (user_id, org_id, kyc_status)
         VALUES ($1, $2, 'pending')
         RETURNING id`,
        [userId, orgId]
      );
      if (!Array.isArray(createResult?.rows) || createResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Failed to create vendor account' },
          { status: 500 }
        );
      }
      vendorAccountId = createResult.rows[0]?.id;
      if (!vendorAccountId) {
        return NextResponse.json(
          { success: false, error: 'Failed to create vendor account' },
          { status: 500 }
        );
      }
    } else {
      vendorAccountId = vendorAccountResult.rows[0]?.id;
      if (!vendorAccountId) {
        return NextResponse.json(
          { success: false, error: 'Invalid vendor account data' },
          { status: 500 }
        );
      }
    }

    // Get user details for Razorpay contact
    const userResult = await query(
      `SELECT email, first_name, last_name, phone FROM users WHERE id = $1`,
      [userId]
    );

    if (!Array.isArray(userResult?.rows) || userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];
    if (!user || typeof user !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid user data' },
        { status: 500 }
      );
    }
    const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || accountHolderName;

    // Create Razorpay contact
    const razorpayService = getRazorpayService();
    let contactId;
    let linkedAccountId;

    try {
      // Check if contact already exists
      const existingAccount = vendorAccountResult.rows[0];
      if (existingAccount?.linked_account_id) {
        linkedAccountId = existingAccount.linked_account_id;
        // Try to get contact from existing linked account
        // For now, create new contact
      }

      const contact = await razorpayService.createContact({
        name: userName,
        email: user.email,
        contact: user.phone || '',
        type: 'vendor',
        referenceId: userId,
      });
      contactId = contact.id;
      linkedAccountId = contact.id; // Contact ID can be used as linked account reference
    } catch (error) {
      console.error('Create contact error:', error);
      // Continue without Razorpay contact for now
    }

    // Create fund account in RazorpayX
    let fundAccountId;
    if (contactId) {
      try {
        const fundAccount = await razorpayService.createFundAccount({
          contactId,
          accountType: 'bank_account',
          accountDetails: {
            name: accountHolderName,
            ifsc,
            account_number: accountNumber,
            account_type: accountType || 'savings',
          },
        });
        fundAccountId = fundAccount.id;
      } catch (error) {
        console.error('Create fund account error:', error);
        // Store bank details even if fund account creation fails
        // Admin can retry later
      }
    }

    // Hash account number (don't store plain text)
    const crypto = await import('crypto');
    const accountNumberHash = crypto.createHash('sha256').update(accountNumber).digest('hex');

    // Update vendor account with bank details
    await query(
      `UPDATE vendor_accounts
       SET account_holder_name = $1,
           bank_account_number_hash = $2,
           bank_ifsc = $3,
           bank_name = $4,
           linked_account_id = COALESCE($5, linked_account_id),
           fund_account_id = COALESCE($6, fund_account_id),
           kyc_status = CASE WHEN kyc_status = 'not_submitted' THEN 'pending' ELSE kyc_status END,
           kyc_submitted_at = CASE WHEN kyc_status = 'not_submitted' THEN CURRENT_TIMESTAMP ELSE kyc_submitted_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        accountHolderName,
        accountNumberHash,
        ifsc,
        bankName,
        linkedAccountId,
        fundAccountId,
        vendorAccountId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Bank details saved successfully. KYC verification will be processed.',
      fundAccountId,
      kycStatus: 'pending',
    });
  } catch (error) {
    console.error('Save bank details error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save bank details' },
      { status: 500 }
    );
  }
}


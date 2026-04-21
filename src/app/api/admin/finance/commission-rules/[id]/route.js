/**
 * Commission Rule Detail API Route
 * 
 * GET /api/admin/finance/commission-rules/[id] - Get rule details
 * PATCH /api/admin/finance/commission-rules/[id] - Update rule
 * DELETE /api/admin/finance/commission-rules/[id] - Delete rule
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getCommissionRulesService } from '@/lib/services/razorpay/CommissionRulesService.js';
import { getPaymentAuditService } from '@/lib/services/payment/PaymentAuditService.js';

/**
 * GET /api/admin/finance/commission-rules/[id]
 * Get commission rule details
 */
export async function GET(request, { params }) {
  try {
    const session = await requireSuperadmin(request);
    
    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Commission rule ID is required',
        },
        { status: 400 }
      );
    }
    const ruleId = params.id;

    const commissionRulesService = getCommissionRulesService();
    const rules = await commissionRulesService.listRules({ limit: 1000 });
    const rule = rules.find(r => r.id === ruleId);

    if (!rule) {
      return NextResponse.json(
        { success: false, error: 'Commission rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      rule,
    });
  } catch (error) {
    console.error('Get commission rule error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get commission rule' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/finance/commission-rules/[id]
 * Update commission rule
 */
export async function PATCH(request, { params }) {
  try {
    const session = await requireSuperadmin(request);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userEmail = session.user.email;
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Commission rule ID is required',
        },
        { status: 400 }
      );
    }
    const ruleId = params.id;
    
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

    const commissionRulesService = getCommissionRulesService();
    const rule = await commissionRulesService.updateRule(ruleId, body);

    // Log audit
    const auditService = getPaymentAuditService();
    await auditService.logCommissionRuleChange({
      action: 'updated',
      ruleId: rule.id,
      userId,
      userRole,
      userEmail,
      ruleData: rule,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      rule,
    });
  } catch (error) {
    console.error('Update commission rule error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update commission rule' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/finance/commission-rules/[id]
 * Delete commission rule (soft delete)
 */
export async function DELETE(request, { params }) {
  try {
    const session = await requireSuperadmin(request);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userEmail = session.user.email;
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Commission rule ID is required',
        },
        { status: 400 }
      );
    }
    const ruleId = params.id;

    const commissionRulesService = getCommissionRulesService();
    const deleted = await commissionRulesService.deleteRule(ruleId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Commission rule not found' },
        { status: 404 }
      );
    }

    // Log audit
    const auditService = getPaymentAuditService();
    await auditService.logCommissionRuleChange({
      action: 'deleted',
      ruleId,
      userId,
      userRole,
      userEmail,
      ruleData: { id: ruleId },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: 'Commission rule deleted successfully',
    });
  } catch (error) {
    console.error('Delete commission rule error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete commission rule' },
      { status: 500 }
    );
  }
}


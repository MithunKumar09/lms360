/**
 * Tax Rule Detail API Route
 * 
 * GET /api/admin/finance/tax-rules/[id] - Get rule details
 * PATCH /api/admin/finance/tax-rules/[id] - Update rule
 * DELETE /api/admin/finance/tax-rules/[id] - Delete rule
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getTaxRulesService } from '@/lib/services/razorpay/TaxRulesService.js';
import { getPaymentAuditService } from '@/lib/services/payment/PaymentAuditService.js';

/**
 * GET /api/admin/finance/tax-rules/[id]
 * Get tax rule details
 */
export async function GET(request, { params }) {
  try {
    const session = await requireSuperadmin(request);
    
    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tax rule ID is required',
        },
        { status: 400 }
      );
    }
    const ruleId = params.id;

    const taxRulesService = getTaxRulesService();
    const rules = await taxRulesService.listRules({ limit: 1000 });
    const rule = rules.find(r => r.id === ruleId);

    if (!rule) {
      return NextResponse.json(
        { success: false, error: 'Tax rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      rule,
    });
  } catch (error) {
    console.error('Get tax rule error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get tax rule' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/finance/tax-rules/[id]
 * Update tax rule
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
          error: 'Tax rule ID is required',
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

    const taxRulesService = getTaxRulesService();
    const rule = await taxRulesService.updateRule(ruleId, body);

    // Log audit
    const auditService = getPaymentAuditService();
    await auditService.logTaxRuleChange({
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
    console.error('Update tax rule error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update tax rule' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/finance/tax-rules/[id]
 * Delete tax rule (soft delete)
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
          error: 'Tax rule ID is required',
        },
        { status: 400 }
      );
    }
    const ruleId = params.id;

    const taxRulesService = getTaxRulesService();
    const deleted = await taxRulesService.deleteRule(ruleId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Tax rule not found' },
        { status: 404 }
      );
    }

    // Log audit
    const auditService = getPaymentAuditService();
    await auditService.logTaxRuleChange({
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
      message: 'Tax rule deleted successfully',
    });
  } catch (error) {
    console.error('Delete tax rule error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete tax rule' },
      { status: 500 }
    );
  }
}


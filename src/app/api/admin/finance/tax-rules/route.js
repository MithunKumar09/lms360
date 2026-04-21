/**
 * Admin Finance Tax Rules API Route
 * 
 * GET /api/admin/finance/tax-rules - List tax rules
 * POST /api/admin/finance/tax-rules - Create tax rule
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getTaxRulesService } from '@/lib/services/razorpay/TaxRulesService.js';
import { getPaymentAuditService } from '@/lib/services/payment/PaymentAuditService.js';

/**
 * GET /api/admin/finance/tax-rules
 * List tax rules with filters
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type');
    const country = searchParams.get('country');
    const state = searchParams.get('state');
    const isActive = searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : null;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const taxRulesService = getTaxRulesService();
    const rules = await taxRulesService.listRules({
      type,
      country,
      state,
      isActive,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      rules,
    });
  } catch (error) {
    console.error('Get tax rules error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get tax rules' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/finance/tax-rules
 * Create tax rule
 * 
 * Request Body:
 * {
 *   "type": "gst" | "vat" | "sales_tax" | "custom",
 *   "name": "GST 18%",
 *   "description": "18% GST for India",
 *   "rate": 18,
 *   "country": "IN" (optional),
 *   "state": "Maharashtra" (optional),
 *   "applicableItemTypes": ["course", "event"] (optional),
 *   "priority": 0,
 *   "validFrom": "2025-01-01T00:00:00Z" (optional),
 *   "validUntil": "2025-12-31T23:59:59Z" (optional)
 * }
 */
export async function POST(request) {
  try {
    const session = await requireSuperadmin(request);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userEmail = session.user.email;
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

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
    const {
      type,
      name,
      description,
      rate,
      country,
      state,
      applicableItemTypes,
      priority,
      validFrom,
      validUntil,
      metadata = {},
    } = body;

    // Validate input
    if (!type || !name || !rate) {
      return NextResponse.json(
        { success: false, error: 'type, name, and rate are required' },
        { status: 400 }
      );
    }

    if (!['gst', 'vat', 'sales_tax', 'custom'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'type must be gst, vat, sales_tax, or custom' },
        { status: 400 }
      );
    }

    if (rate < 0 || rate > 100) {
      return NextResponse.json(
        { success: false, error: 'rate must be between 0 and 100' },
        { status: 400 }
      );
    }

    const taxRulesService = getTaxRulesService();
    const rule = await taxRulesService.createRule({
      type,
      name,
      description,
      rate,
      country,
      state,
      applicableItemTypes,
      priority: priority || 0,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      createdBy: userId,
      metadata,
    });

    // Log audit
    const auditService = getPaymentAuditService();
    await auditService.logTaxRuleChange({
      action: 'created',
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
    }, { status: 201 });
  } catch (error) {
    console.error('Create tax rule error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create tax rule' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/finance/tax-rules
 * Update tax rule
 */
export async function PATCH(request) {
  try {
    const session = await requireSuperadmin(request);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userEmail = session.user.email;
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

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
    const { ruleId, ...updates } = body;

    if (!ruleId) {
      return NextResponse.json(
        { success: false, error: 'ruleId is required' },
        { status: 400 }
      );
    }

    const taxRulesService = getTaxRulesService();
    const rule = await taxRulesService.updateRule(ruleId, updates);

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
 * DELETE /api/admin/finance/tax-rules
 * Delete tax rule (soft delete)
 */
export async function DELETE(request) {
  try {
    const session = await requireSuperadmin(request);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userEmail = session.user.email;
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('ruleId');

    if (!ruleId) {
      return NextResponse.json(
        { success: false, error: 'ruleId is required' },
        { status: 400 }
      );
    }

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


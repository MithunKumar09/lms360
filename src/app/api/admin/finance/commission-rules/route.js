/**
 * Admin Finance Commission Rules API Route
 * 
 * GET /api/admin/finance/commission-rules - List commission rules
 * POST /api/admin/finance/commission-rules - Create commission rule
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getCommissionRulesService } from '@/lib/services/razorpay/CommissionRulesService.js';
import { getPaymentAuditService } from '@/lib/services/payment/PaymentAuditService.js';

/**
 * GET /api/admin/finance/commission-rules
 * List commission rules with filters
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const { searchParams } = new URL(request.url);

    const scope = searchParams.get('scope');
    const orgId = searchParams.get('orgId');
    const courseId = searchParams.get('courseId');
    const isActive = searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : null;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const commissionRulesService = getCommissionRulesService();
    const rules = await commissionRulesService.listRules({
      scope,
      orgId,
      courseId,
      isActive,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      rules,
    });
  } catch (error) {
    console.error('Get commission rules error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get commission rules' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/finance/commission-rules
 * Create commission rule
 * 
 * Request Body:
 * {
 *   "scope": "global" | "organization" | "course",
 *   "orgId": "uuid" (required if scope is organization),
 *   "courseId": "uuid" (required if scope is course),
 *   "platformPercentage": 10,
 *   "platformFixedFeePercentage": 2,
 *   "platformFixedFeeAmount": null,
 *   "name": "Default Commission",
 *   "description": "Default commission rule",
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
      scope,
      orgId,
      courseId,
      platformPercentage,
      platformFixedFeePercentage,
      platformFixedFeeAmount,
      name,
      description,
      priority,
      validFrom,
      validUntil,
      metadata = {},
    } = body;

    // Validate input
    if (!scope || !platformPercentage) {
      return NextResponse.json(
        { success: false, error: 'scope and platformPercentage are required' },
        { status: 400 }
      );
    }

    if (!['global', 'organization', 'course'].includes(scope)) {
      return NextResponse.json(
        { success: false, error: 'scope must be global, organization, or course' },
        { status: 400 }
      );
    }

    if (platformPercentage < 0 || platformPercentage > 100) {
      return NextResponse.json(
        { success: false, error: 'platformPercentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    const commissionRulesService = getCommissionRulesService();
    const rule = await commissionRulesService.createRule({
      scope,
      orgId,
      courseId,
      platformPercentage,
      platformFixedFeePercentage: platformFixedFeePercentage || 0,
      platformFixedFeeAmount,
      name,
      description,
      priority: priority || 0,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      createdBy: userId,
      metadata,
    });

    // Log audit
    const auditService = getPaymentAuditService();
    await auditService.logCommissionRuleChange({
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
    console.error('Create commission rule error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create commission rule' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/finance/commission-rules
 * Update commission rule
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

    const commissionRulesService = getCommissionRulesService();
    const rule = await commissionRulesService.updateRule(ruleId, updates);

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
 * DELETE /api/admin/finance/commission-rules
 * Delete commission rule (soft delete)
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


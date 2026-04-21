/**
 * Role Promotion History API Route
 * 
 * GET /api/role-promotion-history
 * Get promotion history (Admin only)
 * 
 * Query params:
 * - user_id?: string (filter by user)
 * - request_id?: string (filter by request)
 * - page?: number (default: 1)
 * - limit?: number (default: 20, max: 50)
 * - start_date?: string (ISO date)
 * - end_date?: string (ISO date)
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

export async function GET(request) {
  try {
    console.log('📜 [PROMOTION HISTORY] ===== GET HISTORY STARTED =====');
    
    // Check authentication and require admin role
    const session = await requireRole(request, ['admin', 'superadmin']);
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || null;
    const requestId = searchParams.get('request_id') || null;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    const startDate = searchParams.get('start_date') || null;
    const endDate = searchParams.get('end_date') || null;

    // Build WHERE clause
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Admin can only see history from their organization
    if (userRole === 'admin' && userOrgId) {
      // Join with instructor_requests to filter by org_id
      whereConditions.push(`ir.org_id = $${paramIndex}`);
      queryParams.push(userOrgId);
      paramIndex++;
    }

    if (userId) {
      whereConditions.push(`rph.user_id = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    }

    if (requestId) {
      whereConditions.push(`rph.request_id = $${paramIndex}`);
      queryParams.push(requestId);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`rph.created_at >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`rph.created_at <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Build JOIN clause for admin org filtering
    const joinClause = userRole === 'admin' && userOrgId
      ? `INNER JOIN instructor_requests ir ON rph.request_id = ir.id`
      : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM role_promotion_history rph
      ${joinClause}
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get history records
    const historyQuery = `
      SELECT 
        rph.id,
        rph.user_id,
        rph.from_role,
        rph.to_role,
        rph.promotion_type,
        rph.request_id,
        rph.promoted_by,
        rph.user_data_backup,
        rph.mfa_method,
        rph.notes,
        rph.created_at,
        u.email as user_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.display_name as user_display_name,
        promoter.email as promoter_email,
        promoter.first_name as promoter_first_name,
        promoter.last_name as promoter_last_name,
        ir.org_id,
        o.name as org_name
      FROM role_promotion_history rph
      INNER JOIN users u ON rph.user_id = u.id
      LEFT JOIN users promoter ON rph.promoted_by = promoter.id
      LEFT JOIN instructor_requests ir ON rph.request_id = ir.id
      LEFT JOIN organizations o ON ir.org_id = o.id
      ${joinClause}
      ${whereClause}
      ORDER BY rph.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const historyResult = await query(historyQuery, queryParams);

    const history = historyResult.rows.map(row => ({
      id: row.id,
      user: {
        id: row.user_id,
        email: row.user_email,
        first_name: row.user_first_name,
        last_name: row.user_last_name,
        display_name: row.user_display_name
      },
      from_role: row.from_role,
      to_role: row.to_role,
      promotion_type: row.promotion_type,
      request_id: row.request_id,
      promoted_by: row.promoted_by ? {
        id: row.promoted_by,
        email: row.promoter_email,
        first_name: row.promoter_first_name,
        last_name: row.promoter_last_name
      } : null,
      user_data_backup: row.user_data_backup,
      mfa_method: row.mfa_method,
      notes: row.notes,
      organization: row.org_id ? {
        id: row.org_id,
        name: row.org_name
      } : null,
      created_at: row.created_at
    }));

    const totalPages = Math.ceil(total / limit);

    console.log('📜 [PROMOTION HISTORY] ✅ History fetched:', history.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          history,
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📜 [PROMOTION HISTORY] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch promotion history' 
      },
      { status: 500 }
    );
  }
}


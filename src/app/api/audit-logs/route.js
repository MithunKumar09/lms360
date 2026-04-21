/**
 * Audit Logs API Route
 * 
 * Handles fetching audit logs with filtering and pagination.
 * 
 * Access control:
 * - Superadmin: Can view all audit logs, grouped by organization
 * - Admin: Can only view audit logs for users in their organization
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { requireAuth } from '@/lib/auth/guards.js';

/**
 * Query login/logout events from user_sessions and login_attempts tables
 * This is used as a fallback when the login/logout audit_logs table doesn't exist
 */
async function queryFromSessionsAndLoginAttempts({
  userRole,
  userOrgId,
  page,
  pageSize,
  eventType,
  userId,
  orgIdParam,
  dateFrom,
  dateTo,
  role,
  search,
  sortParam,
}) {
  try {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Build conditions for user filtering
    if (userRole === 'admin' && userOrgId) {
      conditions.push(`u.org_id = $${paramIndex}`);
      params.push(userOrgId);
      paramIndex++;
    } else if (userRole === 'superadmin' && orgIdParam) {
      conditions.push(`u.org_id = $${paramIndex}`);
      params.push(orgIdParam);
      paramIndex++;
    }

    if (userId) {
      conditions.push(`us.user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    if (role) {
      conditions.push(`u.role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (search) {
      conditions.push(`u.email ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (dateFrom) {
      conditions.push(`us.created_at >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      conditions.push(`us.created_at <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    // Filter by event type if specified
    if (eventType === 'login') {
      // Only show login events (from user_sessions)
      // We'll query only user_sessions
    } else if (eventType === 'logout') {
      // Logout events are harder to track from sessions alone
      // For now, we'll return empty for logout-only filter
      // In a real system, you'd need a separate logout tracking mechanism
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          pagination: {
            page: 1,
            pageSize,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query login events from user_sessions (treat session creation as login)
    const countQuery = `
      SELECT COUNT(DISTINCT us.id) as total
      FROM user_sessions us
      INNER JOIN users u ON us.user_id = u.id
      ${whereClause}
    `;

    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    const offset = (page - 1) * pageSize;

    // Parse sort
    const [sortField, sortOrder] = (sortParam || 'event_time:desc').split(':');
    const finalSortOrder = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sortColumn = sortField === 'user_email' ? 'u.email' : 
                      sortField === 'user_role' ? 'u.role' : 
                      sortField === 'event_type' ? "'login'" :
                      'us.created_at';

    const dataQuery = `
      SELECT DISTINCT
        us.id,
        us.user_id,
        u.email as user_email,
        u.role as user_role,
        u.org_id,
        o.name as org_name,
        'login' as event_type,
        us.created_at as event_time,
        us.ip_address,
        us.user_agent,
        us.id as session_id,
        NULL as metadata,
        us.created_at
      FROM user_sessions us
      INNER JOIN users u ON us.user_id = u.id
      LEFT JOIN organizations o ON u.org_id = o.id
      ${whereClause}
      ORDER BY ${sortColumn} ${finalSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(pageSize, offset);

    const dataResult = await query(dataQuery, params);
    
    const items = dataResult.rows.map((row) => ({
      id: row.id,
      userId: row.user_id || null,
      userEmail: row.user_email || null,
      userRole: row.user_role || null,
      orgId: row.org_id || null,
      orgName: row.org_name || null,
      eventType: row.event_type || 'login',
      eventTime: row.event_time || row.created_at || null,
      ipAddress: row.ip_address || null,
      userAgent: row.user_agent || null,
      sessionId: row.session_id || null,
      metadata: row.metadata || null,
      createdAt: row.created_at || null,
    }));

    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    console.log('[AUDIT LOGS API] Query from sessions returned', items.length, 'items');

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      },
    });
  } catch (error) {
    console.error('Error querying from sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch audit logs from sessions',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audit-logs
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * - eventType: Filter by event type (login, logout, etc.)
 * - userId: Filter by user ID
 * - orgId: Filter by organization ID (superadmin only)
 * - dateFrom: Filter by date from (ISO 8601)
 * - dateTo: Filter by date to (ISO 8601)
 * - role: Filter by user role
 * - search: Search by user email
 * - sort: Sort order (default: event_time:desc)
 */
export async function GET(request) {
  try {
    // Authenticate user
    const session = await requireAuth(request);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user;
    const userRole = user.role;
    const userOrgId = user.orgId || null;

    // Access control: Only superadmin and admin can access audit logs
    if (userRole !== 'superadmin' && userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const eventType = searchParams.get('eventType');
    const userId = searchParams.get('userId');
    const orgIdParam = searchParams.get('orgId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const sortParam = searchParams.get('sort') || 'event_time:desc';

    // Parse sort parameter
    const [sortField, sortOrder] = sortParam.split(':');
    const validSortFields = ['event_time', 'user_email', 'user_role', 'event_type'];
    const validSortOrders = ['asc', 'desc'];
    const finalSortField = validSortFields.includes(sortField) ? sortField : 'event_time';
    const finalSortOrder = validSortOrders.includes(sortOrder?.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Check what columns exist in audit_logs table
    const columnCheckQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs'
      AND column_name IN ('user_id', 'user_email', 'user_role', 'org_id', 'event_type', 'event_time', 'actor_id', 'target_user_id', 'action', 'created_at')
    `;
    const columnCheck = await query(columnCheckQuery);
    const existingColumns = new Set(columnCheck.rows.map(row => row.column_name));
    
    // Log found columns for debugging
    console.log('[AUDIT LOGS API] Found columns:', Array.from(existingColumns));
    
    // Check if this is the login/logout audit_logs table
    // We need at least event_type to identify login/logout events
    // user_email and user_id are also needed for proper display
    const hasEventType = existingColumns.has('event_type');
    const hasUserEmail = existingColumns.has('user_email');
    const hasUserId = existingColumns.has('user_id');
    const isUserManagementTable = existingColumns.has('actor_id') && existingColumns.has('action');
    
    // If it's clearly the user management table (has actor_id/action but no event_type),
    // we need to query from user_sessions and login_attempts instead
    if (isUserManagementTable && !hasEventType) {
      console.log('[AUDIT LOGS API] Detected user management table, querying from user_sessions and login_attempts');
      return await queryFromSessionsAndLoginAttempts({
        userRole,
        userOrgId,
        page,
        pageSize,
        eventType,
        userId,
        orgIdParam,
        dateFrom,
        dateTo,
        role,
        search,
        sortParam,
      });
    }
    
    // If we have event_type, assume it's login/logout table (even if missing some columns)
    // We'll handle missing columns gracefully in the query
    if (!hasEventType) {
      console.log('[AUDIT LOGS API] No event_type column found, querying from user_sessions and login_attempts');
      return await queryFromSessionsAndLoginAttempts({
        userRole,
        userOrgId,
        page,
        pageSize,
        eventType,
        userId,
        orgIdParam,
        dateFrom,
        dateTo,
        role,
        search,
        sortParam,
      });
    }
    
    // Test query: Check if there's any data in the table at all and get sample row structure
    try {
      const testQuery = `SELECT COUNT(*) as total FROM audit_logs`;
      const testResult = await query(testQuery);
      const totalRows = parseInt(testResult.rows[0]?.total || '0', 10);
      console.log('[AUDIT LOGS API] Test query - table exists, total rows (unfiltered):', totalRows);
      
      // Get a sample row to see actual structure
      if (totalRows > 0) {
        const sampleQuery = `SELECT * FROM audit_logs LIMIT 1`;
        const sampleResult = await query(sampleQuery);
        if (sampleResult.rows.length > 0) {
          console.log('[AUDIT LOGS API] Sample row keys:', Object.keys(sampleResult.rows[0]));
          console.log('[AUDIT LOGS API] Sample row:', JSON.stringify(sampleResult.rows[0], null, 2));
        }
      }
    } catch (testError) {
      console.error('[AUDIT LOGS API] Test query failed:', testError.message);
    }

    const hasOrgIdColumn = existingColumns.has('org_id');
    const hasEventTimeColumn = existingColumns.has('event_time');
    const hasUserRoleColumn = existingColumns.has('user_role');
    const hasUserEmailColumn = existingColumns.has('user_email');
    const hasUserIdColumn = existingColumns.has('user_id');
    const hasEventTypeColumn = existingColumns.has('event_type');

    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Organization filter: Admin can only see their org, superadmin can see all or filter by org
    // Only apply if org_id column exists
    if (hasOrgIdColumn) {
      if (userRole === 'admin') {
        // Admin: Only their organization
        if (userOrgId) {
          conditions.push(`al.org_id = $${paramIndex}`);
          params.push(userOrgId);
          paramIndex++;
        } else {
          // Admin without org should see nothing
          conditions.push(`1 = 0`);
        }
      } else if (userRole === 'superadmin') {
        // Superadmin: Can see all, but can filter by orgId if provided
        if (orgIdParam) {
          conditions.push(`al.org_id = $${paramIndex}`);
          params.push(orgIdParam);
          paramIndex++;
        }
      }
    }

    // Event type filter - only if column exists
    if (hasEventTypeColumn && eventType) {
      conditions.push(`al.event_type = $${paramIndex}`);
      params.push(eventType);
      paramIndex++;
    }

    // User ID filter - only if column exists
    if (hasUserIdColumn && userId) {
      conditions.push(`al.user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    // Date range filters - only if event_time column exists
    if (hasEventTimeColumn) {
      if (dateFrom) {
        conditions.push(`al.event_time >= $${paramIndex}`);
        params.push(dateFrom);
        paramIndex++;
      }
      if (dateTo) {
        conditions.push(`al.event_time <= $${paramIndex}`);
        params.push(dateTo);
        paramIndex++;
      }
    }

    // Role filter - only if column exists
    if (hasUserRoleColumn && role) {
      conditions.push(`al.user_role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    // Search filter (user email) - only if column exists
    if (hasUserEmailColumn && search) {
      conditions.push(`al.user_email ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Debug: Log the WHERE clause and params
    console.log('[AUDIT LOGS API] WHERE clause:', whereClause);
    console.log('[AUDIT LOGS API] Params:', params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs al
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);
    
    console.log('[AUDIT LOGS API] Total count:', total);

    // Get paginated results with organization info
    const offset = (page - 1) * pageSize;
    
    // Build SELECT fields based on what exists
    const selectFields = ['al.id'];
    if (hasUserIdColumn) selectFields.push('al.user_id');
    if (hasUserEmailColumn) selectFields.push('al.user_email');
    if (hasUserRoleColumn) selectFields.push('al.user_role');
    if (hasOrgIdColumn) {
      selectFields.push('al.org_id');
      selectFields.push('o.name as org_name');
    }
    if (hasEventTypeColumn) selectFields.push('al.event_type');
    if (hasEventTimeColumn) selectFields.push('al.event_time');
    if (existingColumns.has('ip_address')) selectFields.push('al.ip_address');
    if (existingColumns.has('user_agent')) selectFields.push('al.user_agent');
    if (existingColumns.has('session_id')) selectFields.push('al.session_id');
    if (existingColumns.has('metadata')) selectFields.push('al.metadata');
    if (existingColumns.has('created_at')) selectFields.push('al.created_at');
    
    // Determine sort field - use event_time if available, otherwise created_at
    const dbSortField = hasEventTimeColumn && finalSortField === 'event_time' ? 'event_time' : 
                        existingColumns.has('created_at') ? 'created_at' : 'id';

    const dataQuery = `
      SELECT 
        ${selectFields.join(',\n        ')}
      FROM audit_logs al
      ${hasOrgIdColumn ? 'LEFT JOIN organizations o ON al.org_id = o.id' : ''}
      ${whereClause}
      ORDER BY al.${dbSortField} ${finalSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(pageSize, offset);

    console.log('[AUDIT LOGS API] Final SQL Query:', dataQuery.replace(/\s+/g, ' ').trim());
    console.log('[AUDIT LOGS API] Query params:', params);

    const dataResult = await query(dataQuery, params);
    console.log('[AUDIT LOGS API] Query returned', dataResult.rows.length, 'rows');
    
    if (dataResult.rows.length > 0) {
      console.log('[AUDIT LOGS API] First row sample:', JSON.stringify(dataResult.rows[0], null, 2));
    }
    
    const items = dataResult.rows.map((row) => ({
      id: row.id,
      userId: row.user_id || null,
      userEmail: row.user_email || null,
      userRole: row.user_role || null,
      orgId: row.org_id || null,
      orgName: row.org_name || null,
      eventType: row.event_type || null,
      eventTime: row.event_time || row.created_at || null,
      ipAddress: row.ip_address || null,
      userAgent: row.user_agent || null,
      sessionId: row.session_id || null,
      metadata: row.metadata || null,
      createdAt: row.created_at || null,
    }));
    
    console.log('[AUDIT LOGS API] Mapped items:', items.length);

    // Calculate pagination info
    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch audit logs',
      },
      { status: 500 }
    );
  }
}


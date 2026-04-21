/**
 * Role Promotion History Export API Route
 * 
 * GET /api/role-promotion-history/export
 * Export promotion history (Admin only)
 * 
 * Query params:
 * - format?: 'csv' | 'xlsx' | 'json' (default: 'csv')
 * - start_date?: string (ISO date)
 * - end_date?: string (ISO date)
 * - user_id?: string (filter by user)
 * - request_id?: string (filter by request)
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

export async function GET(request) {
  try {
    console.log('📥 [EXPORT HISTORY] ===== EXPORT STARTED =====');
    
    // Check authentication and require admin role
    const session = await requireRole(request, ['admin', 'superadmin']);
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const userId = searchParams.get('user_id') || null;
    const requestId = searchParams.get('request_id') || null;
    const startDate = searchParams.get('start_date') || null;
    const endDate = searchParams.get('end_date') || null;

    // Validate format
    if (!['csv', 'xlsx', 'json'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid format. Must be: csv, xlsx, or json' },
        { status: 400 }
      );
    }

    // Build WHERE clause (same as GET route)
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Admin can only see history from their organization
    if (userRole === 'admin' && userOrgId) {
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

    // Fetch all history records (no pagination for export)
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
    `;

    const historyResult = await query(historyQuery, queryParams);
    const history = historyResult.rows;

    // JSON format
    if (format === 'json') {
      const exportData = history.map(row => ({
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
        mfa_method: row.mfa_method,
        notes: row.notes,
        organization: row.org_id ? {
          id: row.org_id,
          name: row.org_name
        } : null,
        created_at: row.created_at,
        user_data_backup: row.user_data_backup // Include full backup in JSON
      }));

      return NextResponse.json(
        {
          success: true,
          history: exportData,
          total: history.length,
          exported_at: new Date().toISOString()
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="promotion-history-export-${Date.now()}.json"`
          }
        }
      );
    }

    // XLSX format
    if (format === 'xlsx') {
      try {
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Promotion History');

        // Define columns
        worksheet.columns = [
          { header: 'ID', key: 'id', width: 36 },
          { header: 'User Email', key: 'user_email', width: 30 },
          { header: 'User Name', key: 'user_name', width: 25 },
          { header: 'From Role', key: 'from_role', width: 15 },
          { header: 'To Role', key: 'to_role', width: 15 },
          { header: 'Promotion Type', key: 'promotion_type', width: 20 },
          { header: 'Request ID', key: 'request_id', width: 36 },
          { header: 'Promoted By', key: 'promoted_by', width: 30 },
          { header: 'MFA Method', key: 'mfa_method', width: 15 },
          { header: 'Organization', key: 'organization', width: 25 },
          { header: 'Notes', key: 'notes', width: 30 },
          { header: 'Created At', key: 'created_at', width: 20 }
        ];

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data rows
        history.forEach(row => {
          worksheet.addRow({
            id: row.id || '',
            user_email: row.user_email || '',
            user_name: row.user_display_name || `${row.user_first_name || ''} ${row.user_last_name || ''}`.trim() || '',
            from_role: row.from_role || '',
            to_role: row.to_role || '',
            promotion_type: row.promotion_type || '',
            request_id: row.request_id || '',
            promoted_by: row.promoter_email || '',
            mfa_method: row.mfa_method || '',
            organization: row.org_name || '',
            notes: row.notes || '',
            created_at: row.created_at ? new Date(row.created_at).toISOString() : ''
          });
        });

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="promotion-history-export-${Date.now()}.xlsx"`
          }
        });
      } catch (excelError) {
        console.warn('Excel export failed, falling back to CSV:', excelError);
        // Fallback to CSV
      }
    }

    // CSV format (default or fallback)
    const headers = [
      'ID',
      'User Email',
      'User Name',
      'From Role',
      'To Role',
      'Promotion Type',
      'Request ID',
      'Promoted By',
      'MFA Method',
      'Organization',
      'Notes',
      'Created At'
    ];

    const escapeCsv = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = history.map(row => [
      row.id || '',
      row.user_email || '',
      row.user_display_name || `${row.user_first_name || ''} ${row.user_last_name || ''}`.trim() || '',
      row.from_role || '',
      row.to_role || '',
      row.promotion_type || '',
      row.request_id || '',
      row.promoter_email || '',
      row.mfa_method || '',
      row.org_name || '',
      row.notes || '',
      row.created_at ? new Date(row.created_at).toISOString() : ''
    ]);

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="promotion-history-export-${Date.now()}.csv"`
      }
    });
  } catch (error) {
    console.error('📥 [EXPORT HISTORY] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to export promotion history' 
      },
      { status: 500 }
    );
  }
}


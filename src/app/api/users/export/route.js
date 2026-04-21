import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";
import { listUsers } from "@/lib/db/users.js";
import { handleApiError } from "@/lib/errors/apiErrorHandler.js";
import { rateLimit, getClientIdentifier } from "@/lib/security/rateLimiter.js";

/**
 * GET /api/users/export
 * 
 * Export users to CSV format with current filters applied
 */
export async function GET(request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization (superadmin or admin only)
    const userRole = session.user.role;
    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limiting
    const rateLimitResult = rateLimit(request, 'api', session.user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: "RATE_LIMIT_EXCEEDED", 
          message: "Too many requests. Please try again later.",
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          }
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv"; // csv, json, or xlsx

    // Parse filters (same as GET /api/users)
    let roles = undefined;
    const rolesParam = searchParams.get("roles");
    if (rolesParam) {
      roles = rolesParam.split(',').map(r => r.trim()).filter(r => r);
    }

    // Enforce organization for admin
    let enforcedOrgId = null;
    if (userRole === "admin" && session.user.orgId) {
      enforcedOrgId = session.user.orgId;
    }

    const filters = {
      q: searchParams.get("q") || undefined,
      role: searchParams.get("role") || undefined,
      roles: roles,
      status: searchParams.get("status") || undefined,
      verified: searchParams.get("verified") === "true" ? true : searchParams.get("verified") === "false" ? false : undefined,
      orgId: enforcedOrgId || searchParams.get("orgId") || undefined,
      cohortId: searchParams.get("cohortId") || undefined,
      vendor_category: searchParams.get("vendor_category") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      page: 1,
      pageSize: 10000, // Large page size for export
      sort: searchParams.get("sort") || "created_at:desc",
    };

    // Fetch all users matching filters
    const data = await listUsers(filters);
    const users = data.items || [];

    if (format === "json") {
      return NextResponse.json({
        success: true,
        users,
        total: data.total,
        exported_at: new Date().toISOString(),
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="users-export-${Date.now()}.json"`,
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(rateLimitResult.resetAt),
        },
      });
    }

    if (format === "xlsx") {
      // Excel export using ExcelJS
      try {
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Users');

        // Define columns
        worksheet.columns = [
          { header: 'ID', key: 'id', width: 36 },
          { header: 'Email', key: 'email', width: 30 },
          { header: 'First Name', key: 'first_name', width: 15 },
          { header: 'Last Name', key: 'last_name', width: 15 },
          { header: 'Role', key: 'role', width: 15 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Email Verified', key: 'email_verified', width: 15 },
          { header: 'Organization', key: 'organization', width: 25 },
          { header: 'Last Login', key: 'last_login', width: 20 },
          { header: 'Active Sessions', key: 'active_sessions', width: 15 },
          { header: 'Created At', key: 'created_at', width: 20 },
        ];

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };

        // Add data rows
        users.forEach(user => {
          worksheet.addRow({
            id: user.id || '',
            email: user.email || '',
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            role: user.role || '',
            status: user.status || '',
            email_verified: user.email_verified_at ? 'Yes' : 'No',
            organization: user.org_label || '',
            last_login: user.last_login_at ? new Date(user.last_login_at).toISOString() : '',
            active_sessions: user.active_sessions || 0,
            created_at: user.created_at ? new Date(user.created_at).toISOString() : '',
          });
        });

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="users-export-${Date.now()}.xlsx"`,
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          },
        });
      } catch (excelError) {
        // Fallback to CSV if ExcelJS is not available
        console.warn('Excel export failed, falling back to CSV:', excelError);
        // Continue to CSV export below
      }
    }

    // CSV format
    const headers = [
      'ID',
      'Email',
      'First Name',
      'Last Name',
      'Role',
      'Status',
      'Email Verified',
      'Organization',
      'Last Login',
      'Active Sessions',
      'Created At',
    ];

    const rows = users.map(user => [
      user.id || '',
      user.email || '',
      user.first_name || '',
      user.last_name || '',
      user.role || '',
      user.status || '',
      user.email_verified_at ? 'Yes' : 'No',
      user.org_label || '',
      user.last_login_at ? new Date(user.last_login_at).toISOString() : '',
      user.active_sessions || 0,
      user.created_at ? new Date(user.created_at).toISOString() : '',
    ]);

    // Escape CSV values
    const escapeCsv = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="users-export-${Date.now()}.csv"`,
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': String(rateLimitResult.resetAt),
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(
      errorResponse.body,
      { status: errorResponse.status }
    );
  }
}


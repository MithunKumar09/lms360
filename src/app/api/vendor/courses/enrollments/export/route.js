/**
 * Vendor Course Enrollments Export API Route
 * 
 * GET /api/vendor/courses/enrollments/export - Export enrolled courses with statistics
 * 
 * Query Parameters:
 * - format: csv or xlsx (default: csv)
 * - All filter parameters from the list endpoint
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getVendorCourseEnrollments } from '@/lib/db/vendor/enrollments.js';
import { generateCSV, generateXLSX } from '@/lib/utils/fileParser.js';
import {
  formatDateForExport,
  formatPercentageForExport,
  sanitizeForExport,
} from '@/lib/export/exportHelpers.js';

export async function GET(request) {
  try {
    // Authentication: Only vendors
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
    
    const vendorId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const page = 1;
    const limit = 10000; // Large limit for export

    // Get all enrollments (with pagination to handle large datasets)
    const allCourses = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await getVendorCourseEnrollments(vendorId, {
        page: currentPage,
        limit,
        status: searchParams.get('status') || null,
        search: searchParams.get('search') || null,
      });

      if (Array.isArray(result?.courses)) {
        allCourses.push(...result.courses);
      }
      hasMore = result?.pagination?.hasNext || false;
      currentPage++;

      // Safety limit: prevent infinite loops
      if (currentPage > 100) {
        break;
      }
    }

    // Prepare export data
    const headers = [
      'Course Title',
      'Status',
      'Total Enrollments',
      'Active Enrollments',
      'Completed Enrollments',
      'Average Progress %',
      'Created Date',
    ];

    const exportData = Array.isArray(allCourses)
      ? allCourses
          .filter(course => course && typeof course === 'object')
          .map((course) => ({
      'Course Title': sanitizeForExport(course.title),
      'Status': sanitizeForExport(course.status),
      'Total Enrollments': course.totalEnrollments || 0,
      'Active Enrollments': course.activeEnrollments || 0,
      'Completed Enrollments': course.completedEnrollments || 0,
      'Average Progress %': formatPercentageForExport(course.averageProgress || 0),
      'Created Date': formatDateForExport(course.createdAt, 'YYYY-MM-DD HH:mm:ss'),
    }))
      : [];

    // Generate file content
    let content;
    let contentType;
    let filename;

    if (format === 'xlsx') {
      try {
        content = await generateXLSX(exportData, headers, {
          sheetName: 'Course Enrollments',
        });
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `course-enrollments-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      } catch (error) {
        // Fallback to CSV if XLSX fails
        console.warn('XLSX generation failed, falling back to CSV:', error);
        content = generateCSV(exportData, headers);
        contentType = 'text/csv';
        filename = `course-enrollments-export-${new Date().toISOString().split('T')[0]}.csv`;
      }
    } else {
      content = generateCSV(exportData, headers);
      contentType = 'text/csv';
      filename = `course-enrollments-export-${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📋 [EXPORT] Exported course enrollments:', {
        count: exportData.length,
        format,
      });
    }

    // Create response with file download
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Error exporting course enrollments:', error);

    // Handle authentication errors
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Vendor access required.',
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to export course enrollments',
      },
      { status: error.status || 500 }
    );
  }
}

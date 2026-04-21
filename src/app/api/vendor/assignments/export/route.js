/**
 * Vendor Assignments Export API Route
 * 
 * GET /api/vendor/assignments/export - Export assignments list
 * 
 * Query Parameters:
 * - format: csv or xlsx (default: csv)
 * - All filter parameters from the list endpoint
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getVendorAssignments } from '@/lib/db/vendor/assignments.js';
import { generateCSV, generateXLSX } from '@/lib/utils/fileParser.js';
import {
  formatDateForExport,
  sanitizeForExport,
} from '@/lib/export/exportHelpers.js';

export async function GET(request) {
  try {
    // Authentication: Only vendors
    const session = await requireRole(request, ['vendor']);
    const vendorId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const limit = 10000; // Large limit for export

    // Get all assignments (with pagination to handle large datasets)
    const allAssignments = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await getVendorAssignments(vendorId, {
        page: currentPage,
        limit,
        courseId: searchParams.get('courseId') || null,
        status: searchParams.get('status') || null,
        search: searchParams.get('search') || null,
      });

      if (Array.isArray(result?.assignments)) {
        allAssignments.push(...result.assignments);
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
      'Title',
      'Course',
      'Max Marks',
      'Passing Marks',
      'Due Date',
      'Submissions Count',
      'Status',
      'Created Date',
    ];

    const exportData = Array.isArray(allAssignments)
      ? allAssignments
          .filter(assignment => assignment && typeof assignment === 'object')
          .map((assignment) => ({
      'Title': sanitizeForExport(assignment.title),
      'Course': sanitizeForExport(assignment.courseTitle || 'N/A'),
      'Max Marks': assignment.maxMarks || 0,
      'Passing Marks': assignment.passingMarks || 0,
      'Due Date': assignment.dueDate
        ? formatDateForExport(assignment.dueDate, 'YYYY-MM-DD HH:mm:ss')
        : 'N/A',
      'Submissions Count': assignment.submissionCount || 0,
      'Status': sanitizeForExport(assignment.status),
      'Created Date': formatDateForExport(
        assignment.createdAt,
        'YYYY-MM-DD HH:mm:ss'
      ),
    }))
      : [];

    // Generate file content
    let content;
    let contentType;
    let filename;

    if (format === 'xlsx') {
      try {
        content = await generateXLSX(exportData, headers, {
          sheetName: 'Assignments',
        });
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `assignments-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      } catch (error) {
        console.warn('XLSX generation failed, falling back to CSV:', error);
        content = generateCSV(exportData, headers);
        contentType = 'text/csv';
        filename = `assignments-export-${new Date().toISOString().split('T')[0]}.csv`;
      }
    } else {
      content = generateCSV(exportData, headers);
      contentType = 'text/csv';
      filename = `assignments-export-${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📋 [EXPORT] Exported assignments:', {
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
    console.error('Error exporting assignments:', error);

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
        error: error.message || 'Failed to export assignments',
      },
      { status: error.status || 500 }
    );
  }
}

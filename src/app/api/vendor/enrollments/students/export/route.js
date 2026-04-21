/**
 * Vendor Enrolled Students Export API Route
 * 
 * GET /api/vendor/enrollments/students/export - Export enrolled students list
 * 
 * Query Parameters:
 * - format: csv or xlsx (default: csv)
 * - All filter parameters from the list endpoint
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getVendorEnrolledStudents } from '@/lib/db/vendor/enrollments.js';
import { generateCSV, generateXLSX } from '@/lib/utils/fileParser.js';
import {
  formatDateForExport,
  formatPercentageForExport,
  formatEnrollmentStatusForExport,
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
    const limit = 10000; // Large limit for export

    // Get all enrolled students (with pagination to handle large datasets)
    const allStudents = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await getVendorEnrolledStudents(vendorId, {
        page: currentPage,
        limit,
        courseId: searchParams.get('courseId') || null,
        status: searchParams.get('status') || null,
        search: searchParams.get('search') || null,
        minProgress: searchParams.get('min_progress')
          ? parseFloat(searchParams.get('min_progress'))
          : null,
        maxProgress: searchParams.get('max_progress')
          ? parseFloat(searchParams.get('max_progress'))
          : null,
      });

      if (Array.isArray(result?.students)) {
        allStudents.push(...result.students);
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
      'Student Name',
      'Email',
      'Course Title',
      'Enrollment Date',
      'Status',
      'Progress %',
      'Last Accessed',
    ];

    const exportData = Array.isArray(allStudents)
      ? allStudents
          .filter(student => student && typeof student === 'object')
          .map((student) => ({
      'Student Name': sanitizeForExport(
        `${student.firstName || ''} ${student.lastName || ''}`.trim() ||
          student.email || 'N/A'
      ),
      'Email': sanitizeForExport(student.email || 'N/A'),
      'Course Title': sanitizeForExport(student.courseTitle || 'N/A'),
      'Enrollment Date': formatDateForExport(
        student.enrolledAt,
        'YYYY-MM-DD HH:mm:ss'
      ),
      'Status': formatEnrollmentStatusForExport(student.enrollmentStatus),
      'Progress %': formatPercentageForExport(student.progressPercentage || 0),
      'Last Accessed': student.lastAccessedAt
        ? formatDateForExport(student.lastAccessedAt, 'YYYY-MM-DD HH:mm:ss')
        : 'Never',
    }))
      : [];

    // Generate file content
    let content;
    let contentType;
    let filename;

    if (format === 'xlsx') {
      try {
        content = await generateXLSX(exportData, headers, {
          sheetName: 'Enrolled Students',
        });
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `enrolled-students-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      } catch (error) {
        console.warn('XLSX generation failed, falling back to CSV:', error);
        content = generateCSV(exportData, headers);
        contentType = 'text/csv';
        filename = `enrolled-students-export-${new Date().toISOString().split('T')[0]}.csv`;
      }
    } else {
      content = generateCSV(exportData, headers);
      contentType = 'text/csv';
      filename = `enrolled-students-export-${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📋 [EXPORT] Exported enrolled students:', {
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
    console.error('Error exporting enrolled students:', error);

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
        error: error.message || 'Failed to export enrolled students',
      },
      { status: error.status || 500 }
    );
  }
}

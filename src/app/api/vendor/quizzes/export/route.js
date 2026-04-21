/**
 * Vendor Quizzes Export API Route
 * 
 * GET /api/vendor/quizzes/export - Export quizzes list
 * 
 * Query Parameters:
 * - format: csv or xlsx (default: csv)
 * - All filter parameters from the list endpoint
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getVendorQuizzes } from '@/lib/db/vendor/quizzes.js';
import { generateCSV, generateXLSX } from '@/lib/utils/fileParser.js';
import {
  formatDateForExport,
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

    // Get all quizzes (with pagination to handle large datasets)
    const allQuizzes = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await getVendorQuizzes(vendorId, {
        page: currentPage,
        limit,
        courseId: searchParams.get('courseId') || null,
        status: searchParams.get('status') || null,
        search: searchParams.get('search') || null,
      });

      if (Array.isArray(result?.quizzes)) {
        allQuizzes.push(...result.quizzes);
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
      'Total Marks',
      'Passing Marks',
      'Time Limit (minutes)',
      'Max Attempts',
      'Attempts Count',
      'Status',
      'Created Date',
    ];

    const exportData = Array.isArray(allQuizzes)
      ? allQuizzes
          .filter(quiz => quiz && typeof quiz === 'object')
          .map((quiz) => ({
      'Title': sanitizeForExport(quiz.title),
      'Course': sanitizeForExport(quiz.courseTitle || 'Standalone'),
      'Total Marks': quiz.totalMarks || 0,
      'Passing Marks': quiz.passingMarks || 0,
      'Time Limit (minutes)': quiz.timeLimitMinutes || 'N/A',
      'Max Attempts': quiz.maxAttempts || 'Unlimited',
      'Attempts Count': quiz.attemptCount || 0,
      'Status': sanitizeForExport(quiz.status),
      'Created Date': formatDateForExport(
        quiz.createdAt,
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
          sheetName: 'Quizzes',
        });
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `quizzes-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      } catch (error) {
        console.warn('XLSX generation failed, falling back to CSV:', error);
        content = generateCSV(exportData, headers);
        contentType = 'text/csv';
        filename = `quizzes-export-${new Date().toISOString().split('T')[0]}.csv`;
      }
    } else {
      content = generateCSV(exportData, headers);
      contentType = 'text/csv';
      filename = `quizzes-export-${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📋 [EXPORT] Exported quizzes:', {
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
    console.error('Error exporting quizzes:', error);

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
        error: error.message || 'Failed to export quizzes',
      },
      { status: error.status || 500 }
    );
  }
}

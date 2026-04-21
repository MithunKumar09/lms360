/**
 * Cohorts Export API Route
 * 
 * Exports cohorts (classes) to CSV or XLSX format.
 * Streams response for large datasets.
 * 
 * GET /api/cohorts/export.csv
 * GET /api/cohorts/export.xlsx
 * 
 * Query params:
 * - ?orgId=...&format=csv|xlsx&status=...&level=...&q=...
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { listCohorts } from '@/lib/db/classesSubjects.js';
import { generateCSV, generateXLSX } from '@/lib/utils/fileParser.js';
import crypto from 'crypto';

/**
 * Transform cohort to export format
 */
function transformCohortForExport(cohort) {
  return {
    code: cohort.code || '',
    level: cohort.level || '',
    program_node_code: cohort.program_node?.code || '',
    program_node_title: cohort.program_node?.title || '',
    term_label: cohort.term?.label || '',
    section_label: cohort.section?.label || '',
    session_code: cohort.session?.code || '',
    session_start: cohort.session?.start_date ? new Date(cohort.session.start_date).toISOString().split('T')[0] : '',
    session_end: cohort.session?.end_date ? new Date(cohort.session.end_date).toISOString().split('T')[0] : '',
    total_subjects: cohort.total_subjects || 0,
    status: cohort.status || 'draft',
    locked_fields: Array.isArray(cohort.locked_fields) ? cohort.locked_fields.join(',') : '',
    created_at: cohort.created_at ? new Date(cohort.created_at).toISOString() : '',
    updated_at: cohort.updated_at ? new Date(cohort.updated_at).toISOString() : '',
  };
}

/**
 * GET /api/cohorts/export.csv or .xlsx
 */
export async function GET(request) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);

    // Parse format from query parameter (default: csv)
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format')?.toLowerCase() || 'csv';
    const orgId = searchParams.get('orgId');
    const from = searchParams.get('from'); // ISO date
    const to = searchParams.get('to'); // ISO date

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: 'orgId is required',
        },
        { status: 400 }
      );
    }

    // Parse query parameters
    const filters = {
      orgId,
      status: searchParams.get('status'),
      level: searchParams.get('level'),
      node_type: searchParams.get('node_type'),
      term_id: searchParams.get('term_id'),
      section_id: searchParams.get('section_id'),
      session_id: searchParams.get('session_id'),
      q: searchParams.get('q'),
      page: 1,
      limit: 10000, // Large limit for export
      sort: 'created_at',
      order: 'DESC',
      from,
      to,
    };

    // Fetch all cohorts (with pagination)
    const allCohorts = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await listCohorts({ ...filters, page: currentPage, limit: 1000 });
      
      if (result.cohorts.length === 0) {
        hasMore = false;
        break;
      }

      // Transform cohorts for export
      for (const cohort of result.cohorts) {
        const exportRow = transformCohortForExport(cohort);
        allCohorts.push(exportRow);
      }

      hasMore = result.pagination?.hasNext || false;
      currentPage++;

      // Safety limit: max 10,000 cohorts per export
      if (allCohorts.length >= 10000) {
        break;
      }
    }

    // Define headers
    const headerNames = [
      'Code',
      'Level',
      'Program Node Code',
      'Program Node Title',
      'Term',
      'Section',
      'Session Code',
      'Session Start',
      'Session End',
      'Total Subjects',
      'Status',
      'Locked Fields',
      'Created At',
      'Updated At',
    ];

    // Generate file content
    let content;
    let contentType;
    let filename;

    if (format === 'xlsx') {
      try {
        content = await generateXLSX(allCohorts, headerNames, { sheetName: 'Classes' });
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `classes-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      } catch (error) {
        // If xlsx library not available, return CSV instead
        console.warn('XLSX library not available, falling back to CSV:', error.message);
        content = generateCSV(allCohorts, headerNames);
        contentType = 'text/csv';
        filename = `classes-export-${new Date().toISOString().split('T')[0]}.csv`;
      }
    } else {
      content = generateCSV(allCohorts, headerNames);
      contentType = 'text/csv';
      filename = `classes-export-${new Date().toISOString().split('T')[0]}.csv`;
    }

    // ETag support
    const etag = crypto.createHash('sha1').update(typeof content === 'string' ? content : Buffer.from(content)).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      });
    }

    // Log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📋 [EXPORT] Exported cohorts:', {
        count: allCohorts.length,
        format,
        orgId,
      });
    }

    // Create response with file download
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        ETag: etag,
      },
    });
  } catch (error) {
    console.error('Error exporting cohorts:', error);

    // Handle authentication errors
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Superadmin access required.',
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to export classes',
      },
      { status: 500 }
    );
  }
}


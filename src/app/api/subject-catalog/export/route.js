/**
 * Subject Catalog Export API Route
 *
 * Exports subjects to CSV or XLSX format with ETag and caching.
 *
 * GET /api/subject-catalog/export?orgId=...&format=csv|xlsx&q=&page=&pageSize=
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { listSubjectCatalog } from '@/lib/db/classesSubjects.js';
import { generateCSV, generateXLSX } from '@/lib/utils/fileParser.js';
import crypto from 'crypto';

function transformSubjectForExport(subject) {
  return {
    org_code: subject.org_code || '',
    level: subject.level || '',
    department_code: subject.department_code || '',
    subject_code: subject.code || '',
    title: subject.title || '',
    category: subject.category || '',
    credits: subject.credits ?? '',
    hours_per_week: subject.hours_per_week ?? '',
    syllabus_url: subject.syllabus_url || '',
    status: subject.status || 'active',
    created_at: subject.created_at ? new Date(subject.created_at).toISOString() : '',
  };
}

export async function GET(request) {
  try {
    await requireSuperadmin(request);

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const format = searchParams.get('format')?.toLowerCase() || 'csv';
    const q = searchParams.get('q') || '';
    const level = searchParams.get('level') || '';
    const category = searchParams.get('category') || '';

    if (!orgId) {
      return NextResponse.json({ success: false, error: 'orgId is required' }, { status: 400 });
    }

    const filters = {
      orgId,
      q,
      level,
      category,
      page: 1,
      limit: 10000,
      sort: 'created_at',
      order: 'DESC',
    };

    const allSubjects = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await listSubjectCatalog({ ...filters, page: currentPage, limit: 1000 });
      if (result.subjects.length === 0) {
        hasMore = false;
        break;
      }
      result.subjects.forEach((s) => allSubjects.push(transformSubjectForExport(s)));
      hasMore = result.pagination?.hasNext || false;
      currentPage++;
      if (allSubjects.length >= 10000) break;
    }

    const headers = [
      'org_code',
      'level',
      'department_code',
      'subject_code',
      'title',
      'category',
      'credits',
      'hours_per_week',
      'syllabus_url',
      'status',
      'created_at',
    ];

    let content;
    let contentType;
    let filename;
    if (format === 'xlsx') {
      try {
        content = await generateXLSX(allSubjects, headers, { sheetName: 'Subjects' });
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `subjects-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      } catch (err) {
        console.warn('XLSX unavailable, fallback to CSV:', err.message);
        content = generateCSV(allSubjects, headers);
        contentType = 'text/csv';
        filename = `subjects-export-${new Date().toISOString().split('T')[0]}.csv`;
      }
    } else {
      content = generateCSV(allSubjects, headers);
      contentType = 'text/csv';
      filename = `subjects-export-${new Date().toISOString().split('T')[0]}.csv`;
    }

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
    console.error('Error exporting subjects:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Superadmin access required.' }, { status: error.status });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to export subjects' }, { status: 500 });
  }
}



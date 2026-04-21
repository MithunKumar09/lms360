/**
 * Subject Catalog Import API Route
 *
 * POST /api/subject-catalog/import?mode=parse
 * - Parses file and returns headers and first N rows with validation hints
 *
 * POST /api/subject-catalog/import
 * - Validates rows and performs batched insert/update with per-row results
 */

import { NextResponse } from 'next/server';
import { requireSuperadminOrAdmin } from '@/lib/auth/guards.js';
import { parseCSV, parseXLSX } from '@/lib/utils/fileParser.js';
import { bulkImportSubjectsSchema } from '@/lib/validation/classesSubjectsSchemas.js';
import { createSubjectCatalog, updateSubjectCatalog, checkSubjectCodeExists } from '@/lib/db/classesSubjects.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const BATCH_SIZE = 100;

async function readUploadedFile(request) {
  const form = await request.formData();
  const file = form.get('file');
  if (!file) throw new Error('Missing file');
  if (file.size > MAX_FILE_SIZE) throw new Error('File too large (max 10MB)');
  const arrayBuffer = await file.arrayBuffer();
  return { form, file, buffer: Buffer.from(arrayBuffer) };
}

function basicRowValidation(row) {
  const required = ['org_code', 'level', 'subject_code', 'title', 'category', 'credits', 'hours_per_week'];
  const errors = [];
  required.forEach((k) => {
    if (row[k] === undefined || row[k] === null || String(row[k]).trim() === '') errors.push(`${k} is required`);
  });
  // syllabus_url optional but if present should be <= 5MB and acceptable type; HEAD check should be via separate endpoint; here we just note presence
  return errors;
}

export async function POST(request) {
  try {
    const session = await requireSuperadminOrAdmin(request);
    const url = new URL(request.url);
    const isParseMode = url.searchParams.get('mode') === 'parse';

    const { form, file, buffer } = await readUploadedFile(request);
    const filename = file.name?.toLowerCase() || '';
    const isXlsx = filename.endsWith('.xlsx');

    let parsed;
    if (isXlsx) parsed = await parseXLSX(buffer, { sheetIndex: 0, header: true });
    else parsed = await parseCSV(buffer, { header: true });

    const rows = parsed.data || [];
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

    if (isParseMode) {
      const preview = rows.slice(0, 300).map((row, idx) => {
        const errs = basicRowValidation(row);
        return { ...row, _errors: errs, _rowNumber: idx + 1 };
      });
      return NextResponse.json({ success: true, headers, preview });
    }

    const role = session.user?.role;
    const orgIdFromSession = session.user?.orgId || null;
    const isSuperadmin = role === 'superadmin';
    const orgId = form.get('orgId') || (isSuperadmin ? null : orgIdFromSession);
    const org_code = form.get('org_code') || null;
    const dedupe = (form.get('dedupe') || 'skip').toLowerCase(); // 'skip' | 'update'

    if (isSuperadmin && !org_code && !orgId) {
      return NextResponse.json({ success: false, error: 'Provide org_code or orgId' }, { status: 400 });
    }
    if (!isSuperadmin && !orgIdFromSession) {
      return NextResponse.json({ success: false, error: 'Missing session orgId' }, { status: 400 });
    }

    // Validate with Zod
    const validRows = [];
    const errors = [];
    rows.forEach((row, idx) => {
      const res = bulkImportSubjectsSchema.safeParse(row);
      if (res.success) validRows.push({ row: res.data, rowNumber: idx + 1 });
      else errors.push({ rowNumber: idx + 1, status: 'skipped', reason: res.error.errors?.[0]?.message || 'Invalid row' });
    });

    const results = [...errors];
    let created = 0;
    let updated = 0;
    let skipped = errors.length;

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      /* eslint-disable no-await-in-loop */
      for (const item of batch) {
        try {
          const { row, rowNumber } = item;
          const effectiveOrgId = orgId || row.orgId || orgIdFromSession;
          const exists = await checkSubjectCodeExists(effectiveOrgId, row.subject_code);
          if (exists && dedupe === 'skip') {
            results.push({ rowNumber, status: 'skipped', reason: 'Duplicate code' });
            skipped++;
            continue;
          }
          if (exists && dedupe === 'update') {
            await updateSubjectCatalog(exists.id, {
              title: row.title,
              category: row.category,
              credits: row.credits,
              hours_per_week: row.hours_per_week,
              syllabus_url: row.syllabus_url || null,
            });
            results.push({ rowNumber, status: 'updated' });
            updated++;
            continue;
          }
          await createSubjectCatalog({
            org_id: effectiveOrgId,
            code: row.subject_code,
            title: row.title,
            level: row.level,
            category: row.category,
            credits: row.credits,
            hours_per_week: row.hours_per_week,
            syllabus_url: row.syllabus_url || null,
            status: 'active',
          });
          results.push({ rowNumber, status: 'created' });
          created++;
        } catch (e) {
          results.push({ rowNumber: item.rowNumber, status: 'skipped', reason: e.message || 'Failed' });
          skipped++;
        }
      }
      /* eslint-enable no-await-in-loop */
    }

    return NextResponse.json({
      success: true,
      summary: { created, updated, skipped, total: rows.length },
      rows: results,
    });
  } catch (error) {
    console.error('Subjects import failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Import failed' }, { status: 500 });
  }
}



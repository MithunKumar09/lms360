import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { checkRate } from '@/lib/api/rateLimiter.js';
import { announcementBulkRowSchema } from '@/lib/validation/announcementSchemas.js';
import { parseCSV, parseXLSX } from '@/lib/utils/fileParser.js';

export async function POST(request) {
	try {
		const session = await requireRole(request, ['superadmin','admin','orgadmin','vendor']);

		// Rate limit: 10/min per user
		const rl = checkRate(`ann:bulkpreview:${session.user.id}`, 10, 60_000);
		if (!rl.allowed) {
			return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
		}

		const form = await request.formData();
		const file = form.get('file');
		if (!file) {
			return NextResponse.json({ success: false, error: 'File is required' }, { status: 400 });
		}

		const filename = file.name || 'upload';
		const ext = (filename.split('.').pop() || '').toLowerCase();
		let rows = [];

		if (ext === 'csv') {
			const text = await file.text();
			rows = await parseCSV(text);
		} else if (ext === 'xlsx' || ext === 'xls') {
			const buf = await file.arrayBuffer();
			rows = await parseXLSX(buf);
		} else {
			return NextResponse.json({ success: false, error: 'Unsupported file type. Use CSV or XLSX.' }, { status: 400 });
		}

		const results = [];
		let valid = 0;
		let invalid = 0;

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const parsed = announcementBulkRowSchema.safeParse(row);
			if (parsed.success) {
				results.push({ index: i + 1, data: parsed.data, valid: true });
				valid++;
			} else {
				const errors = parsed.error.flatten();
				results.push({ index: i + 1, data: row, valid: false, errors });
				invalid++;
			}
		}

		return NextResponse.json({
			success: true,
			rows: results,
			summary: { total: rows.length, valid, invalid },
		}, { status: 200 });
	} catch (error) {
		const status = error.status || 500;
		return NextResponse.json({ success: false, error: error.message || 'Failed to preview bulk import' }, { status });
	}
}



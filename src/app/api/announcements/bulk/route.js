import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireRole } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkRate } from '@/lib/api/rateLimiter.js';
import { checkCsrf } from '@/lib/api/csrf.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';
import { createAnnouncement } from '@/lib/db/announcements.js';
import { announcementBulkRowSchema } from '@/lib/validation/announcementSchemas.js';

// Simple in-memory idempotency tracking for bulk imports
const idempotencyStore = new Map();

function getSessionOrgId(session) {
	return session?.user?.org_id || session?.user?.orgId || null;
}

export async function POST(request) {
	try {
		const session = await requireRole(request, ['superadmin','admin','orgadmin','vendor']);
		const ipAddress = getClientIp(request);

		// Idempotency key (optional header): prevents duplicate processing
		const idempotencyKey = request.headers.get('idempotency-key');
		if (idempotencyKey) {
			const prev = idempotencyStore.get(idempotencyKey);
			if (prev && Date.now() - prev < 60 * 60 * 1000) {
				return NextResponse.json({ success: false, error: 'Duplicate request (idempotency)' }, { status: 409 });
			}
			idempotencyStore.set(idempotencyKey, Date.now());
			// Best-effort cleanup after 1 hour
			setTimeout(() => { idempotencyStore.delete(idempotencyKey); }, 60 * 60 * 1000);
		}

		// Rate limit: 5/hour per user
		const rl = checkRate(`ann:bulk:${session.user.id}`, 5, 60 * 60_000);
		if (!rl.allowed) {
			return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
		}

		// CSRF
		const csrf = checkCsrf(request);
		if (!csrf.ok) {
			return NextResponse.json({ success: false, error: csrf.error }, { status: 403 });
		}

		const body = await request.json();
		const rows = Array.isArray(body.rows) ? body.rows : [];
		const options = body.options || { skipDuplicates: true, updateOnDuplicate: false };

		if (rows.length === 0) {
			return NextResponse.json({ success: false, error: 'No rows provided' }, { status: 400 });
		}

		const results = [];
		let created = 0, updated = 0, skipped = 0, errors = 0;

		// Note: For simplicity, treat duplicates based on (title,start_at,org_id,visibility)
		const seen = new Set();

		for (let i = 0; i < rows.length; i++) {
			const raw = rows[i];
			const parsed = announcementBulkRowSchema.safeParse(raw);
			if (!parsed.success) {
				results.push({ row: i + 1, status: 'error', errors: parsed.error.flatten() });
				errors++; continue;
			}

			const data = parsed.data;

			// Enforce org for admin/vendor
			if (session.user.role !== 'superadmin') {
				data.org_id = getSessionOrgId(session);
			}

			const dupKey = `${data.org_id || 'global'}|${data.visibility}|${data.title}|${new Date(data.start_at).toISOString()}`;
			if (seen.has(dupKey)) {
				if (options.skipDuplicates) {
					results.push({ row: i + 1, status: 'skipped', reason: 'duplicate_in_batch' });
					skipped++; continue;
				}
			} else {
				seen.add(dupKey);
			}

			// Create (updateOnDuplicate would need a lookup; omitted for brevity)
			const { attachments = [], targets = [], ...createData } = data;
			const res = await createAnnouncement(createData, attachments, targets);
			if (res.success) {
				results.push({ row: i + 1, status: 'created', orgId: res.announcement.org_id, id: res.announcement.id });
				created++;
			} else {
				results.push({ row: i + 1, status: 'error', errors: res.error });
				errors++;
			}
		}

		// Audit bulk import
		await createAuditEvent({
			actor_id: session.user.id,
			action: 'bulk_import',
			target_type: 'announcement',
			metadata: { total: rows.length, created, skipped, errors },
			ip_address: ipAddress,
			user_agent: request.headers.get('user-agent'),
		});

		revalidateTag('announcements');
		return NextResponse.json({
			success: true,
			results,
			summary: { created, updated, skipped, errors },
		}, { status: 200 });
	} catch (error) {
		const status = error.status || 500;
		return NextResponse.json({ success: false, error: error.message || 'Failed to process bulk import' }, { status });
	}
}



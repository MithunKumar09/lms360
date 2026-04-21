import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireRole } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkRate } from '@/lib/api/rateLimiter.js';
import { checkCsrf } from '@/lib/api/csrf.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';
import {
	getAnnouncementById,
	updateAnnouncement,
	deleteAnnouncement,
} from '@/lib/db/announcements.js';
import {
	internalAnnouncementUpdateSchema,
	publicAnnouncementUpdateSchema,
} from '@/lib/validation/announcementSchemas.js';
import { queueAnnouncementDeliveries } from '@/lib/notifications/announcementNotifier.js';

function getSessionOrgId(session) {
	return session?.user?.org_id || session?.user?.orgId || null;
}

export async function GET(_request, { params }) {
	try {
		await requireRole(_request, ['superadmin','admin','orgadmin','vendor']);
		const res = await getAnnouncementById(params.id);
		const status = res.success ? 200 : (res.error === 'Announcement not found' ? 404 : 400);
		return NextResponse.json(res, { status });
	} catch (error) {
		const status = error.status || 500;
		return NextResponse.json({ success: false, error: error.message || 'Failed to fetch announcement' }, { status });
	}
}

export async function PATCH(request, { params }) {
	try {
		const session = await requireRole(request, ['superadmin','admin','orgadmin','vendor']);
		const ipAddress = getClientIp(request);

		// Rate limit: 10/min per user
		const rl = checkRate(`ann:update:${session.user.id}`, 10, 60_000);
		if (!rl.allowed) {
			return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
		}

		// CSRF
		const csrf = checkCsrf(request);
		if (!csrf.ok) {
			return NextResponse.json({ success: false, error: csrf.error }, { status: 403 });
		}

		const body = await request.json();

		// Load current to enforce org scoping
		const current = await getAnnouncementById(params.id);
		if (!current.success) {
			return NextResponse.json(current, { status: 404 });
		}
		if (session.user.role !== 'superadmin') {
			const sessOrg = getSessionOrgId(session);
			if (current.announcement.org_id !== sessOrg) {
				return NextResponse.json({ success: false, error: 'Unauthorized org scope' }, { status: 403 });
			}
		}

		// Choose schema based on visibility (fall back to current)
		const visibility = body.visibility || current.announcement.visibility;
		const schema = visibility === 'public' ? publicAnnouncementUpdateSchema : internalAnnouncementUpdateSchema;
		const parsed = schema.safeParse({ ...current.announcement, ...body, visibility });
		if (!parsed.success) {
			return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
		}

		const { attachments = undefined, targets = undefined, ...data } = parsed.data;

		// Enforce org id for admin/vendor if provided
		if (session.user.role !== 'superadmin' && data.org_id && data.org_id !== getSessionOrgId(session)) {
			return NextResponse.json({ success: false, error: 'Unauthorized org scope' }, { status: 403 });
		}

		const res = await updateAnnouncement(params.id, data, attachments, targets);

		await createAuditEvent({
			actor_id: session.user.id,
			action: 'update',
			target_type: 'announcement',
			target_id: params.id,
			metadata: { visibility, org_id: res?.announcement?.org_id || current.announcement.org_id },
			ip_address: ipAddress,
			user_agent: request.headers.get('user-agent'),
		});

		// Queue notifications (non-blocking) if toggled on
		if (res.success && (data.send_notification === true)) {
			queueAnnouncementDeliveries(params.id);
		}

		if (!res.success) {
			return NextResponse.json(res, { status: 400 });
		}

		revalidateTag('announcements');
		return NextResponse.json(res, { status: 200 });
	} catch (error) {
		const status = error.status || 500;
		return NextResponse.json({ success: false, error: error.message || 'Failed to update announcement' }, { status });
	}
}

export async function DELETE(request, { params }) {
	try {
		const session = await requireRole(request, ['superadmin','admin','orgadmin','vendor']);
		const ipAddress = getClientIp(request);

		// CSRF
		const csrf = checkCsrf(request);
		if (!csrf.ok) {
			return NextResponse.json({ success: false, error: csrf.error }, { status: 403 });
		}

		// Load current to enforce org scoping
		const current = await getAnnouncementById(params.id);
		if (!current.success) {
			return NextResponse.json(current, { status: 404 });
		}
		if (session.user.role !== 'superadmin') {
			const sessOrg = getSessionOrgId(session);
			if (current.announcement.org_id !== sessOrg) {
				return NextResponse.json({ success: false, error: 'Unauthorized org scope' }, { status: 403 });
			}
		}

		const res = await deleteAnnouncement(params.id);

		await createAuditEvent({
			actor_id: session.user.id,
			action: 'delete',
			target_type: 'announcement',
			target_id: params.id,
			metadata: { org_id: current.announcement.org_id },
			ip_address: ipAddress,
			user_agent: request.headers.get('user-agent'),
		});

		if (!res.success) {
			return NextResponse.json(res, { status: 400 });
		}

		revalidateTag('announcements');
		return NextResponse.json(res, { status: 200 });
	} catch (error) {
		const status = error.status || 500;
		return NextResponse.json({ success: false, error: error.message || 'Failed to delete announcement' }, { status });
	}
}



import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkRate } from '@/lib/api/rateLimiter.js';
import { checkCsrf } from '@/lib/api/csrf.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';
import { listAnnouncements, createAnnouncement } from '@/lib/db/announcements.js';
import {
	internalAnnouncementCreateSchema,
	publicAnnouncementCreateSchema,
} from '@/lib/validation/announcementSchemas.js';
import { queueAnnouncementDeliveries } from '@/lib/notifications/announcementNotifier.js';

function getSessionOrgId(session) {
	return session?.user?.org_id || session?.user?.orgId || null;
}

export async function GET(request) {
	try {
		const session = await requireRole(request, ['admin','orgadmin','vendor','instructor','student','orgstudent','parent','orgparent','alumni']);
		
		// FIX #5: ORG GUARD - Validate org access for non-superadmin users
		const { requireOrgRole } = await import('@/lib/security/guards.js');
		const orgId = getSessionOrgId(session);
		const userRole = normalizeRole(session.user.role);
		
		if (userRole !== 'superadmin' && orgId) {
			try {
				requireOrgRole(session.user, [userRole], orgId);
				// console.log('🟡 [SERVER] [Announcements API] ✅ Org guard validation passed');
			} catch (orgError) {
				console.error('🟡 [SERVER] [Announcements API] ❌ Org guard validation failed:', orgError);
				return NextResponse.json(
					{ success: false, error: 'Organization access denied' },
					{ status: 403 }
				);
			}
		}
		
		const { searchParams } = new URL(request.url);

		const page = parseInt(searchParams.get('page') || '1', 10);
		const limit = parseInt(searchParams.get('limit') || '20', 10);
		const q = searchParams.get('q') || null;
		const visibility = searchParams.get('visibility') || null;
		const status = searchParams.get('status') || null;
		const category = searchParams.get('category') || null;
		const priority = searchParams.get('priority') || null;
		const sortBy = searchParams.get('sortBy') || 'created_at';
		const sortDir = searchParams.get('sortDir') || 'desc';
		const from = searchParams.get('from') || null;
		const to = searchParams.get('to') || null;

		// Determine user role and org_id for filtering
		// userRole already declared above for org guard check
		let org_id = null;
		
		// For all non-superadmin roles - use their org_id
		if (userRole !== 'superadmin') {
			org_id = orgId || getSessionOrgId(session); // Use orgId from org guard check if available
			// console.log('🟡 [SERVER] [Announcements API] User role:', userRole);
			// console.log('🟡 [SERVER] [Announcements API] Session org_id:', session.user.org_id || session.user.orgId);
			// console.log('🟡 [SERVER] [Announcements API] Computed org_id:', org_id);
		} else {
			// console.log('🟡 [SERVER] [Announcements API] Superadmin - special filtering logic');
		}

		// Check for activeWindow filter (for marquee)
		const activeWindow = searchParams.get('activeWindow') === 'true';

		const filters = {
			currentUserRole: userRole, // Pass user role for filtering logic
			org_id, // Pass org_id for admin users
			visibility: visibility || undefined,
			status: status || undefined,
			category: category || undefined,
			priority: priority || undefined,
			from: from || undefined,
			to: to || undefined,
			activeWindow: activeWindow || undefined, // Pass activeWindow filter
		};

		// console.log('🟡 [SERVER] [Announcements API] Filters object:', filters);
		// console.log('🟡 [SERVER] [Announcements API] Query params:', { page, limit, q, sortBy, sortDir });

		if (q) {
			try {
				const res = await (await import('@/lib/db/announcements.js')).searchAnnouncements(q, {
					limit, page, filters,
				});
				if (!res.success) {
					// Graceful fallback to avoid breaking UI
					return NextResponse.json({ success: true, announcements: [], pagination: { page, limit, total: 0, pages: 0 }, error: res.error }, { status: 200 });
				}
				return NextResponse.json(res, { status: 200 });
			} catch (e) {
				return NextResponse.json({ success: true, announcements: [], pagination: { page, limit, total: 0, pages: 0 }, error: e.message }, { status: 200 });
			}
		}

		try {
			// console.log('🟡 [SERVER] [Announcements API] Calling listAnnouncements with:', { filters, pagination: { page, limit }, sort: { by: sortBy, dir: sortDir } });
			const res = await listAnnouncements(filters, { page, limit }, { by: sortBy, dir: sortDir });
			// console.log('🟡 [SERVER] [Announcements API] listAnnouncements result:', {
			// 	success: res.success,
			// 	count: res.announcements?.length || 0,
			// 	total: res.pagination?.total || 0,
			// 	error: res.error,
			// });
			if (!res.success) {
				console.error('🔴 [SERVER] [Announcements API] listAnnouncements failed:', res.error);
				return NextResponse.json({ success: true, announcements: [], pagination: { page, limit, total: 0, pages: 0 }, error: res.error }, { status: 200 });
			}
			// console.log('🟢 [SERVER] [Announcements API] ===== GET REQUEST SUCCESSFUL =====');
			return NextResponse.json(res, { status: 200 });
		} catch (e) {
			console.error('🔴 [SERVER] [Announcements API] ===== GET REQUEST ERROR =====');
			console.error('🔴 [SERVER] [Announcements API] Error:', e);
			return NextResponse.json({ success: true, announcements: [], pagination: { page, limit, total: 0, pages: 0 }, error: e.message }, { status: 200 });
		}
	} catch (error) {
		const status = error.status || 500;
		return NextResponse.json({ success: false, error: error.message || 'Failed to fetch announcements' }, { status });
	}
}

export async function POST(request) {
	try {
		// console.log('🟡 [SERVER] [Announcements API] ===== POST REQUEST STARTED =====');
		const session = await requireRole(request, ['superadmin','admin','orgadmin','vendor']);
		// console.log('🟡 [SERVER] [Announcements API] Session:', {
		// 	userId: session.user?.id,
		// 	role: session.user?.role,
		// 	orgId: session.user?.orgId || session.user?.org_id,
		// });
		
		// FIX #5: ORG GUARD - Validate org access for non-superadmin users
		const { requireOrgRole } = await import('@/lib/security/guards.js');
		const orgId = getSessionOrgId(session);
		const userRole = normalizeRole(session.user.role);
		
		if (userRole !== 'superadmin' && orgId) {
			try {
				requireOrgRole(session.user, [userRole], orgId);
				// console.log('🟡 [SERVER] [Announcements API] ✅ Org guard validation passed');
			} catch (orgError) {
				console.error('🟡 [SERVER] [Announcements API] ❌ Org guard validation failed:', orgError);
				return NextResponse.json(
					{ success: false, error: 'Organization access denied' },
					{ status: 403 }
				);
			}
		}
		const ipAddress = getClientIp(request);

		// Rate limit: 10/min per user
		const rl = checkRate(`ann:create:${session.user.id}`, 10, 60_000);
		if (!rl.allowed) {
			console.warn('🟡 [SERVER] [Announcements API] Rate limit exceeded for user:', session.user.id);
			return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
		}

		// CSRF
		const csrf = checkCsrf(request);
		if (!csrf.ok) {
			console.warn('🟡 [SERVER] [Announcements API] CSRF check failed');
			return NextResponse.json({ success: false, error: csrf.error }, { status: 403 });
		}

		const body = await request.json();
		// console.log('🟡 [SERVER] [Announcements API] Request body:', body);

		// Enforce org scoping for admin/vendor
		if (userRole !== 'superadmin') {
			// Use orgId from org guard check (already validated)
			const sessOrg = orgId || getSessionOrgId(session);
			// console.log('🟡 [SERVER] [Announcements API] Setting org_id from session:', sessOrg);
			if (body.org_id && body.org_id !== sessOrg) {
				console.warn('🟡 [SERVER] [Announcements API] Unauthorized org scope attempt');
				return NextResponse.json({ success: false, error: 'Unauthorized org scope' }, { status: 403 });
			}
			body.org_id = sessOrg;
		}

		// Set created_by_user_id from session
		body.created_by_user_id = session.user.id;
		// console.log('🟡 [SERVER] [Announcements API] Set created_by_user_id:', body.created_by_user_id);

		// Choose schema based on visibility
		const visibility = body.visibility;
		// console.log('🟡 [SERVER] [Announcements API] Visibility:', visibility);
		const schema = visibility === 'public' ? publicAnnouncementCreateSchema : internalAnnouncementCreateSchema;
		// console.log('🟡 [SERVER] [Announcements API] Using schema:', visibility === 'public' ? 'public' : 'internal');
		
		const parsed = schema.safeParse(body);
		if (!parsed.success) {
			console.error('🔴 [SERVER] [Announcements API] ===== VALIDATION ERROR =====');
			console.error('🔴 [SERVER] [Announcements API] Validation errors:', parsed.error.flatten());
			console.error('🔴 [SERVER] [Announcements API] Error details:', parsed.error.errors);
			return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
		}

		// console.log('🟢 [SERVER] [Announcements API] Validation passed');
		// console.log('🟡 [SERVER] [Announcements API] Parsed data:', parsed.data);

		const { attachments = [], targets = [], ...data } = parsed.data;
		// console.log('🟡 [SERVER] [Announcements API] Creating announcement with data:', data);
		// console.log('🟡 [SERVER] [Announcements API] Attachments:', attachments);
		// console.log('🟡 [SERVER] [Announcements API] Targets:', targets);
		
		const createRes = await createAnnouncement(data, attachments, targets);
		// console.log('🟡 [SERVER] [Announcements API] Create result:', createRes);

		// Audit (best-effort)
		await createAuditEvent({
			actor_id: session.user.id,
			action: 'create',
			target_type: 'announcement',
			target_id: createRes?.announcement?.id || null,
			metadata: { visibility: data.visibility, org_id: data.org_id },
			ip_address: ipAddress,
			user_agent: request.headers.get('user-agent'),
		});

		// Queue notifications (non-blocking)
		if (createRes.success && data.send_notification === true) {
			queueAnnouncementDeliveries(createRes.announcement.id);
		}

		if (!createRes.success) {
			console.error('🔴 [SERVER] [Announcements API] ===== CREATE FAILED =====');
			console.error('🔴 [SERVER] [Announcements API] Error:', createRes.error);
			return NextResponse.json(createRes, { status: 400 });
		}

		// console.log('🟢 [SERVER] [Announcements API] ===== POST REQUEST SUCCESSFUL =====');
		revalidateTag('announcements');
		return NextResponse.json(createRes, { status: 201 });
	} catch (error) {
		console.error('🔴 [SERVER] [Announcements API] ===== POST REQUEST ERROR =====');
		console.error('🔴 [SERVER] [Announcements API] Error:', error);
		console.error('🔴 [SERVER] [Announcements API] Error message:', error.message);
		console.error('🔴 [SERVER] [Announcements API] Error stack:', error.stack);
		const status = error.status || 500;
		return NextResponse.json({ success: false, error: error.message || 'Failed to create announcement' }, { status });
	}
}



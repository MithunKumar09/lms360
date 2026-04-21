import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkRate } from '@/lib/api/rateLimiter.js';
import { checkCsrf } from '@/lib/api/csrf.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';
import { listFeedbacks, createFeedback } from '@/lib/db/feedbacks.js';
import { feedbackCreateSchema } from '@/lib/validation/feedbackSchemas.js';

/**
 * GET /api/feedback
 * 
 * List all feedbacks (superadmin only)
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - status: Filter by status (pending, reviewed, resolved, archived)
 * - category: Filter by category
 * - role: Filter by user role
 * - from: Start date (ISO format)
 * - to: End date (ISO format)
 * - q: Search query (searches message)
 * - sortBy: Sort field (default: created_at)
 * - sortDir: Sort direction (asc/desc, default: desc)
 */
export async function GET(request) {
	try {
		// Only superadmin can view all feedbacks
		const session = await requireRole(request, ['superadmin']);

		const { searchParams } = new URL(request.url);

		const page = parseInt(searchParams.get('page') || '1', 10);
		const limit = parseInt(searchParams.get('limit') || '20', 10);
		const q = searchParams.get('q') || null;
		const status = searchParams.get('status') || null;
		const category = searchParams.get('category') || null;
		const role = searchParams.get('role') || null;
		const from = searchParams.get('from') || null;
		const to = searchParams.get('to') || null;
		const sortBy = searchParams.get('sortBy') || 'created_at';
		const sortDir = searchParams.get('sortDir') || 'desc';

		const filters = {
			status: status || undefined,
			category: category || undefined,
			role: role || undefined,
			from: from || undefined,
			to: to || undefined,
			q: q || undefined,
		};

		const res = await listFeedbacks(filters, { page, limit }, { by: sortBy, dir: sortDir });

		if (!res.success) {
			return NextResponse.json(
				{ success: false, error: res.error || 'Failed to fetch feedbacks' },
				{ status: 400 }
			);
		}

		return NextResponse.json(res, { status: 200 });
	} catch (error) {
		const status = error.status || 500;
		return NextResponse.json(
			{ success: false, error: error.message || 'Failed to fetch feedbacks' },
			{ status }
		);
	}
}

/**
 * POST /api/feedback
 * 
 * Submit new feedback
 * 
 * Request Body:
 * {
 *   "subject": "Website Feedback",
 *   "message": "Feedback message here...",
 *   "rating": 5,
 *   "category": "general",
 *   "email": "user@example.com" // optional
 * }
 * 
 * Authentication: Required (all roles except superadmin)
 * Rate Limiting: 5 submissions per hour per user
 */
export async function POST(request) {
	try {
		// All roles except superadmin can submit feedback
		const session = await requireRole(request, [
			'admin',
			'orgadmin',
			'instructor',
			'student',
			'orgstudent',
			'vendor',
			'parent',
			'orgparent',
			'alumni',
		]);

		const userRole = normalizeRole(session.user.role);

		// Superadmin cannot submit feedback (read-only)
		if (userRole === 'superadmin') {
			return NextResponse.json(
				{ success: false, error: 'Superadmin cannot submit feedback' },
				{ status: 403 }
			);
		}

		const ipAddress = getClientIp(request);

		// Rate limit: 5 submissions per hour per user
		const rl = checkRate(`feedback:create:${session.user.id}`, 5, 60 * 60 * 1000);
		if (!rl.allowed) {
			return NextResponse.json(
				{ success: false, error: 'Rate limit exceeded. Please try again later.' },
				{ status: 429 }
			);
		}

		// CSRF protection
		const csrf = checkCsrf(request);
		if (!csrf.ok) {
			return NextResponse.json(
				{ success: false, error: csrf.error || 'CSRF validation failed' },
				{ status: 403 }
			);
		}

		const body = await request.json();

		// Validate request body
		const parsed = feedbackCreateSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, errors: parsed.error.flatten() },
				{ status: 400 }
			);
		}

		// Prepare feedback data
		const feedbackData = {
			user_id: session.user.id,
			user_role: userRole,
			message: parsed.data.message || null,
			rating: parsed.data.emotion ?? null, // emotion stored as rating
			category: parsed.data.category ?? null,
			status: 'pending',
		};

		// Create feedback
		const createRes = await createFeedback(feedbackData);

		if (!createRes.success) {
			return NextResponse.json(
				{ success: false, error: createRes.error || 'Failed to create feedback' },
				{ status: 400 }
			);
		}

		// Audit log (best-effort)
		try {
			await createAuditEvent({
				actor_id: session.user.id,
				action: 'create',
				target_type: 'feedback',
				target_id: createRes.feedback?.id || null,
				metadata: {
					category: feedbackData.category,
					emotion: feedbackData.rating,
				},
				ip_address: ipAddress,
				user_agent: request.headers.get('user-agent'),
			});
		} catch (auditError) {
			// Don't fail feedback creation if audit logging fails
			console.error('Failed to log feedback creation to audit:', auditError);
		}

		return NextResponse.json(createRes, { status: 201 });
	} catch (error) {
		const status = error.status || 500;
		return NextResponse.json(
			{ success: false, error: error.message || 'Failed to create feedback' },
			{ status }
		);
	}
}


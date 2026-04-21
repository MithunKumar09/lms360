import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkCsrf } from '@/lib/api/csrf.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';
import { getFeedbackById, updateFeedback } from '@/lib/db/feedbacks.js';
import { feedbackUpdateSchema } from '@/lib/validation/feedbackSchemas.js';

/**
 * GET /api/feedback/[id]
 * 
 * Get single feedback details
 * 
 * Authentication: Required (superadmin only)
 */
export async function GET(request, { params }) {
	try {
		// Only superadmin can view feedback details
		const session = await requireRole(request, ['superadmin']);

		const { id } = params;

		// Validate UUID format
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(id)) {
			return NextResponse.json(
				{ success: false, error: 'Invalid feedback ID format' },
				{ status: 400 }
			);
		}

		const res = await getFeedbackById(id);

		if (!res.success) {
			return NextResponse.json(
				{ success: false, error: res.error || 'Feedback not found' },
				{ status: res.error === 'Feedback not found' ? 404 : 400 }
			);
		}

		return NextResponse.json(res, { status: 200 });
	} catch (error) {
		const status = error.status || 500;
		return NextResponse.json(
			{ success: false, error: error.message || 'Failed to fetch feedback' },
			{ status }
		);
	}
}

/**
 * PATCH /api/feedback/[id]
 * 
 * Update feedback (status, admin_notes) - superadmin only
 * 
 * Request Body:
 * {
 *   "status": "reviewed",
 *   "admin_notes": "Admin notes here..."
 * }
 * 
 * Authentication: Required (superadmin only)
 */
export async function PATCH(request, { params }) {
	try {
		// Only superadmin can update feedback
		const session = await requireRole(request, ['superadmin']);

		const { id } = params;

		// Validate UUID format
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(id)) {
			return NextResponse.json(
				{ success: false, error: 'Invalid feedback ID format' },
				{ status: 400 }
			);
		}

		const ipAddress = getClientIp(request);

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
		const parsed = feedbackUpdateSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, errors: parsed.error.flatten() },
				{ status: 400 }
			);
		}

		// Prepare update data
		const updateData = {
			status: parsed.data.status,
			admin_notes: parsed.data.admin_notes,
		};

		// If status is being updated to reviewed/resolved, set reviewed_by and reviewed_at
		if (parsed.data.status && (parsed.data.status === 'reviewed' || parsed.data.status === 'resolved')) {
			updateData.reviewed_by = session.user.id;
		}

		// Update feedback
		const updateRes = await updateFeedback(id, updateData);

		if (!updateRes.success) {
			return NextResponse.json(
				{ success: false, error: updateRes.error || 'Failed to update feedback' },
				{ status: 400 }
			);
		}

		// Audit log (best-effort)
		try {
			await createAuditEvent({
				actor_id: session.user.id,
				action: 'update',
				target_type: 'feedback',
				target_id: id,
				metadata: {
					status: updateData.status,
					has_admin_notes: !!updateData.admin_notes,
				},
				ip_address: ipAddress,
				user_agent: request.headers.get('user-agent'),
			});
		} catch (auditError) {
			// Don't fail update if audit logging fails
			console.error('Failed to log feedback update to audit:', auditError);
		}

		return NextResponse.json(updateRes, { status: 200 });
	} catch (error) {
		const status = error.status || 500;
		return NextResponse.json(
			{ success: false, error: error.message || 'Failed to update feedback' },
			{ status }
		);
	}
}


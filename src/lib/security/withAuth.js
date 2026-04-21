/**
 * withAuth middleware wrapper for Next.js App Router routes/actions.
 * Attaches req.actor, req.rateLimitIdentity, and enforces CSRF (if helper exists).
 * Integrates with existing session system (do not duplicate).
 */

import { getSession } from '../auth/session.js'; // adjust if different path
import { requireCSRF } from './csrf.js';
import { rateLimitByUser, rateLimitByIp } from './ratelimit.js';

export function withAuth(handler) {
	return async function wrapped(request, context) {
		// Resolve session/user from existing system
		const session = await getSession(request);
		if (!session?.user) {
			return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 });
		}

		// Attach actor and identities
		request.actor = {
			id: session.user.id,
			email: session.user.email,
			role: session.user.role,
			roles: session.user.roles || [session.user.role].filter(Boolean),
			orgId: session.user.orgId || null,
			assignedCohorts: session.user.assignedCohorts || [],
			assignedOfferings: session.user.assignedOfferings || [],
		};
		const ip = request.headers.get('x-forwarded-for') || request.ip || 'ip';
		request.rateLimitIdentity = `${request.actor.id}:${ip}`;

		// CSRF check for mutating requests
		try {
			requireCSRF(request);
		} catch (e) {
			return new Response(JSON.stringify({ error: e.code || 'CSRF_INVALID' }), { status: 403 });
		}

		// Basic rate limits for mutations
		const method = (request.method || 'GET').toUpperCase();
		if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
			const byUser = rateLimitByUser(request.actor.id, 10, 60_000);
			const byIp = rateLimitByIp(ip, 30, 60_000);
			if (!byUser.ok || !byIp.ok) {
				return new Response(JSON.stringify({ error: 'RATE_LIMITED' }), { status: 429 });
			}
		}

		// Call downstream handler
		return handler(request, context);
	};
}



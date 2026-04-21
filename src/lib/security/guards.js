/**
 * Role guards and scope resolvers.
 * Assumes an existing session/auth system that provides req.user with:
 * - id, role(s), orgId (for admin/instructor), isSuperadmin, assignedCohorts/Offerings (for instructor)
 */

function assert(condition, message, code) {
	if (!condition) {
		const err = new Error(message);
		if (code) err.code = code;
		throw err;
	}
}

export function requireRole(user, role) {
	assert(user, 'Unauthorized', 'UNAUTHORIZED');
	if (Array.isArray(role)) {
		assert(role.some((r) => user.roles?.includes(r) || user.role === r), 'Forbidden', 'FORBIDDEN');
	} else {
		assert(user.roles?.includes(role) || user.role === role, 'Forbidden', 'FORBIDDEN');
	}
	return true;
}

export function requireOrgRole(user, roles, orgId) {
	assert(user, 'Unauthorized', 'UNAUTHORIZED');
	const allowed = roles.some((r) => user.roles?.includes(r) || user.role === r);
	assert(allowed, 'Forbidden', 'FORBIDDEN');
	// Superadmin can pick any org; admin/instructor must match session org
	if (!(user.roles?.includes('superadmin') || user.role === 'superadmin')) {
		assert(user.orgId && orgId && user.orgId === orgId, 'Org mismatch', 'ORG_MISMATCH');
	}
	return true;
}

export function resolveOrgScope(user, requestedOrgId) {
	if (user.role === 'superadmin' || user.roles?.includes('superadmin')) {
		return requestedOrgId || null;
	}
	return user.orgId || null;
}

export function instructorScopeCheck(user, { cohortIds = [], offeringIds = [] }) {
	// Ensure instructor can only act within assigned cohorts/offerings
	if (!(user.role === 'instructor' || user.roles?.includes('instructor'))) return true;
	const assignedCohorts = new Set(user.assignedCohorts || []);
	const assignedOfferings = new Set(user.assignedOfferings || []);
	const okCohorts = cohortIds.every((id) => assignedCohorts.has(id));
	const okOfferings = offeringIds.every((id) => assignedOfferings.has(id));
	if (!okCohorts || !okOfferings) {
		const err = new Error('Scope violation');
		err.code = 'SCOPE_VIOLATION';
		throw err;
	}
	return true;
}



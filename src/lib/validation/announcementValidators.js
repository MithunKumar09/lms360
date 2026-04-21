import { z } from 'zod';

export const INTERNAL_CATEGORIES = ['general','exam','assignment','notice','holiday','event','others'];
export const PUBLIC_CATEGORIES = ['admission','event','job_vacancy','circular','public_notice','holiday'];
export const PRIORITIES = ['normal','important','urgent','highlight','top_banner'];
export const STATUSES = ['active','inactive'];
export const TARGET_ROLES = ['students','parents','teachers','vendor','admin','alumni','all'];

export function validateCategoryForVisibility(visibility, category) {
	if (visibility === 'internal') {
		return INTERNAL_CATEGORIES.includes(category);
	}
	if (visibility === 'public') {
		return PUBLIC_CATEGORIES.includes(category);
	}
	return false;
}

export function validateTargetsForInternal(roles = [], classes = []) {
	// roles must be subset of TARGET_ROLES
	const allValid = Array.isArray(roles) && roles.every((r) => TARGET_ROLES.includes(r));
	if (!allValid) return false;
	// classes can be empty or list of ids/labels - schema ensures structure
	return true;
}

export function isWithinWindow(now, startAt, endAt) {
	const nowMs = new Date(now).getTime();
	const startMs = new Date(startAt).getTime();
	if (Number.isNaN(startMs)) return false;
	if (endAt) {
		const endMs = new Date(endAt).getTime();
		if (Number.isNaN(endMs)) return false;
		return nowMs >= startMs && nowMs <= endMs;
	}
	return nowMs >= startMs;
}

export const idSchema = z.string().uuid('Invalid ID');
export const roleArraySchema = z.array(z.enum(TARGET_ROLES)).nonempty().or(z.array(z.enum(TARGET_ROLES)).length(0));

export default {
	validateCategoryForVisibility,
	validateTargetsForInternal,
	isWithinWindow,
	INTERNAL_CATEGORIES,
	PUBLIC_CATEGORIES,
	PRIORITIES,
	STATUSES,
	TARGET_ROLES,
	idSchema,
	roleArraySchema,
};



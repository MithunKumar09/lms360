/**
 * Zod schemas for Users feature (create/invite) with role-aware scopes.
 * Shared on server and client. Uses zxcvbn via passwords util for strength.
 */

import { z } from 'zod';
import { passwordStrength } from '../security/passwords.js';

// Enums
// Note: 'alumni' kept for backward compatibility, maps to 'mentor' in validation
export const roleEnum = z.enum(['superadmin','admin','instructor','student','vendor','parent','alumni','mentor','brand','company']);
export const mfaMethodEnum = z.enum(['none','totp','email_otp']);
export const statusEnum = z.enum(['active','suspended']);
export const inviteDeliveryEnum = z.enum(['invite_link','temp_password_email']);

// Fields
export const emailSchema = z.string().trim().toLowerCase().email();
export const nameSchema = z.string().trim().min(1).max(100);
export const optionalNameSchema = z.string().trim().min(1).max(100).optional().or(z.literal('').transform(() => undefined));
export const uuidSchema = z.string().uuid();
export const optionalUuidSchema = z.string().uuid().optional().nullable();
export const expiryHoursSchema = z.number().int().min(1).max(168).default(72);

export const tempPasswordSchema = z.string().min(8).max(128).superRefine((val, ctx) => {
	const { score, feedback } = passwordStrength(val);
	if (score < 3) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: feedback?.warning || 'Password is too weak (zxcvbn score < 3)',
			path: [],
		});
	}
});

// Base identity/security
export const baseIdentitySchema = z.object({
	email: emailSchema,
	first_name: optionalNameSchema.optional(),
	last_name: optionalNameSchema.optional(),
	avatar_url: z.union([
		z.string().url().max(2048),
		z.literal(''),
		z.null(),
		z.undefined(),
	])
		.optional()
		.nullable()
		.transform((val) => {
			// Transform empty string to undefined
			if (val === '' || val === null) return undefined;
			return val;
		}),
});

export const baseSecuritySchema = z.object({
	mfa_required: z.boolean().optional(),
	mfa_method: mfaMethodEnum.optional(),
	must_reset_password: z.boolean().optional().default(true),
	status: statusEnum.optional().default('active'),
});

export const orgScopeSchema = z.object({
	org_id: optionalUuidSchema, // superadmin may set; others must match session
});

// Role scopes
export const studentScopeSchema = z.object({
	role: z.literal('student'),
	cohort_id: uuidSchema,
	subject_offering_ids: z.array(uuidSchema).min(1, 'At least one subject is required').optional(),
	roll_no: z.string().trim().max(50).optional(),
	program_node_id: optionalUuidSchema,
}).superRefine((val, ctx) => {
	// If cohort_id is provided, subject_offering_ids should be provided and not empty
	// NOTE: This validation can be bypassed in API if cohort has no offerings (handled in API route)
	if (val.cohort_id && (!val.subject_offering_ids || val.subject_offering_ids.length === 0)) {
		// Only add error if subject_offering_ids is explicitly provided as empty array
		// If it's undefined, it means cohort has no offerings (handled in API)
		if (val.subject_offering_ids !== undefined && val.subject_offering_ids.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'At least one subject is required when a cohort is selected. If the cohort has no subjects, please add subjects to the cohort first or contact your administrator.',
				path: ['subject_offering_ids'],
			});
		}
	}
});

export const instructorScopeSchema = z.object({
	role: z.literal('instructor'),
	cohort_ids: z.array(uuidSchema).optional(),
	offering_ids: z.array(uuidSchema).optional(),
}).superRefine((val, ctx) => {
	if ((!val.cohort_ids || val.cohort_ids.length === 0) && (!val.offering_ids || val.offering_ids.length === 0)) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide at least one cohort_id or offering_id' });
	}
});

export const parentScopeSchema = z.object({
	role: z.literal('parent'),
	linked_student_ids: z.array(uuidSchema).min(1),
});

export const adminScopeSchema = z.object({
	role: z.literal('admin'),
});

export const vendorScopeSchema = z.object({
	role: z.literal('vendor'),
	vendor_category: z.string().trim().min(2).max(100),
	company_name: z.string().trim().min(2).max(255).optional(),
	gstin: z.string().trim().min(8).max(20).optional(),
});

// Alumni schema kept for backward compatibility
export const alumniScopeSchema = z.object({
	role: z.literal('alumni'),
	graduation_year: z.number().int().min(1900).max(3000),
	program_node_id: optionalUuidSchema,
});

// Mentor schema (replaces alumni)
export const mentorScopeSchema = z.object({
	role: z.literal('mentor'),
	graduation_year: z.number().int().min(1900).max(3000),
	program_node_id: optionalUuidSchema,
});

// Brand schema - global role, no org_id, no cohorts
export const brandScopeSchema = z.object({
	role: z.literal('brand'),
}).superRefine((val, ctx) => {
	// Brand users are global and should not have org_id or cohorts
	// This is enforced at validation level
});

// Company schema - organization-scoped role, like vendor
export const companyScopeSchema = z.object({
	role: z.literal('company'),
});

export const roleScopeUnion = z.discriminatedUnion('role', [
	studentScopeSchema,
	instructorScopeSchema,
	parentScopeSchema,
	adminScopeSchema,
	vendorScopeSchema,
	alumniScopeSchema,
	mentorScopeSchema,
	brandScopeSchema,
	companyScopeSchema,
]);

// Create mode
export const userCreateSchema = z
	.intersection(
		z.intersection(baseIdentitySchema, baseSecuritySchema),
		z.intersection(
			orgScopeSchema,
			z.object({
				role: roleEnum,
				temp_password: tempPasswordSchema,
			})
		)
	)
	.and(
		z.union([
			studentScopeSchema.partial(),
			instructorScopeSchema.partial(),
			parentScopeSchema.partial(),
			adminScopeSchema.partial(),
			vendorScopeSchema.partial(),
			alumniScopeSchema.partial(),
			mentorScopeSchema.partial(),
			brandScopeSchema.partial(),
			companyScopeSchema.partial(),
		])
	)
	.superRefine((val, ctx) => {
		// If role is not superadmin, prevent setting superadmin-only fields (org_id must match session handled externally)
		// This check stays minimal here; full scope checks in service layer using actor context.
	});

// Invite mode
export const userInviteSchema = z
	.intersection(
		z.intersection(baseIdentitySchema, baseSecuritySchema),
		z.intersection(
			orgScopeSchema,
			z.object({
				role: roleEnum,
				delivery: inviteDeliveryEnum,
				expiry_hours: expiryHoursSchema,
			})
		)
	)
	.and(
		z.union([
			studentScopeSchema.partial(),
			instructorScopeSchema.partial(),
			parentScopeSchema.partial(),
			adminScopeSchema.partial(),
			vendorScopeSchema.partial(),
			alumniScopeSchema.partial(),
			mentorScopeSchema.partial(),
			brandScopeSchema.partial(),
			companyScopeSchema.partial(),
		])
	);

// Helpers to validate with actor context (org and instructor scope)
export function validateCreateWithActor(input, actor) {
	// Map 'alumni' to 'mentor' for backward compatibility
	const normalizedInput = { ...input };
	if (normalizedInput.role === 'alumni') {
		normalizedInput.role = 'mentor';
	}
	
	const parsed = userCreateSchema.parse(normalizedInput);
	
	// Brand role validation - only superadmin can create, must have org_id = null
	if (parsed.role === 'brand') {
		if (actor.role !== 'superadmin' && !actor.roles?.includes('superadmin')) {
			throw Object.assign(new Error('Only superadmin can create brand users'), { code: 'FORBIDDEN' });
		}
		if (parsed.org_id !== null && parsed.org_id !== undefined) {
			throw Object.assign(new Error('Brand users must be global (org_id must be null)'), { code: 'INVALID_ORG' });
		}
		// Force org_id to null for brand users
		parsed.org_id = null;
	}
	
	// actor-based org scope enforcement
	if (!(actor.role === 'superadmin' || actor.roles?.includes('superadmin'))) {
		if (parsed.org_id && actor.orgId && parsed.org_id !== actor.orgId) {
			throw Object.assign(new Error('Org mismatch'), { code: 'ORG_MISMATCH' });
		}
	}
	
	// Instructor scope validation for creating instructors
	// Skip scope check for superadmin - they can assign any cohorts/offerings
	if (parsed.role === 'instructor' && !(actor.role === 'superadmin' || actor.roles?.includes('superadmin'))) {
		const cohortIds = parsed.cohort_ids || [];
		const offeringIds = parsed.offering_ids || [];
		const assignedCohorts = new Set(actor.assignedCohorts || []);
		const assignedOfferings = new Set(actor.assignedOfferings || []);
		// Only validate if we have assigned cohorts/offerings to check against
		// If actor doesn't have assigned cohorts/offerings, skip validation (for admin creating instructor)
		if (assignedCohorts.size > 0 && cohortIds.length > 0 && !cohortIds.every((id) => assignedCohorts.has(id))) {
			throw Object.assign(new Error('Scope violation: Cannot assign cohorts outside your scope'), { code: 'SCOPE_VIOLATION' });
		}
		if (assignedOfferings.size > 0 && offeringIds.length > 0 && !offeringIds.every((id) => assignedOfferings.has(id))) {
			throw Object.assign(new Error('Scope violation: Cannot assign offerings outside your scope'), { code: 'SCOPE_VIOLATION' });
		}
	}
	
	// Instructor scope validation for creating students
	// Instructor can only create students in cohorts/offerings they are assigned to
	if (parsed.role === 'student' && actor.role === 'instructor') {
		const assignedCohorts = new Set(actor.assignedCohorts || []);
		const assignedOfferings = new Set(actor.assignedOfferings || []);
		
		// Validate cohort_id is in instructor's assigned cohorts
		if (parsed.cohort_id && assignedCohorts.size > 0 && !assignedCohorts.has(parsed.cohort_id)) {
			throw Object.assign(new Error('Scope violation: Cannot assign students to cohorts outside your scope'), { code: 'SCOPE_VIOLATION' });
		}
		
		// Validate subject_offering_ids are in instructor's assigned offerings or belong to assigned cohorts
		if (parsed.subject_offering_ids && parsed.subject_offering_ids.length > 0) {
			if (assignedOfferings.size > 0) {
				// If instructor has specific offerings assigned, all selected offerings must be in that list
				const invalidOfferings = parsed.subject_offering_ids.filter(id => !assignedOfferings.has(id));
				if (invalidOfferings.length > 0) {
					throw Object.assign(new Error('Scope violation: Cannot assign students to subject offerings outside your scope'), { code: 'SCOPE_VIOLATION' });
				}
			} else if (assignedCohorts.size > 0 && parsed.cohort_id) {
				// If no specific offerings assigned but has cohorts, offerings must belong to the selected cohort
				// This validation will be done in the backend when attaching student links
				// For now, just ensure cohort is in assigned list
				if (!assignedCohorts.has(parsed.cohort_id)) {
					throw Object.assign(new Error('Scope violation: Cannot assign students to cohorts outside your scope'), { code: 'SCOPE_VIOLATION' });
				}
			}
		}
	}
	
	return parsed;
}

export function validateInviteWithActor(input, actor) {
	// Map 'alumni' to 'mentor' for backward compatibility
	const normalizedInput = { ...input };
	if (normalizedInput.role === 'alumni') {
		normalizedInput.role = 'mentor';
	}
	
	const parsed = userInviteSchema.parse(normalizedInput);
	
	// Brand role validation - only superadmin can invite, must have org_id = null
	if (parsed.role === 'brand') {
		if (actor.role !== 'superadmin' && !actor.roles?.includes('superadmin')) {
			throw Object.assign(new Error('Only superadmin can invite brand users'), { code: 'FORBIDDEN' });
		}
		if (parsed.org_id !== null && parsed.org_id !== undefined) {
			throw Object.assign(new Error('Brand users must be global (org_id must be null)'), { code: 'INVALID_ORG' });
		}
		// Force org_id to null for brand users
		parsed.org_id = null;
	}
	
	if (!(actor.role === 'superadmin' || actor.roles?.includes('superadmin'))) {
		if (parsed.org_id && actor.orgId && parsed.org_id !== actor.orgId) {
			throw Object.assign(new Error('Org mismatch'), { code: 'ORG_MISMATCH' });
		}
	}
	// Skip scope check for superadmin - they can assign any cohorts/offerings
	if (parsed.role === 'instructor' && !(actor.role === 'superadmin' || actor.roles?.includes('superadmin'))) {
		const cohortIds = parsed.cohort_ids || [];
		const offeringIds = parsed.offering_ids || [];
		const assignedCohorts = new Set(actor.assignedCohorts || []);
		const assignedOfferings = new Set(actor.assignedOfferings || []);
		// Only validate if we have assigned cohorts/offerings to check against
		// If actor doesn't have assigned cohorts/offerings, skip validation (for admin creating instructor)
		if (assignedCohorts.size > 0 && cohortIds.length > 0 && !cohortIds.every((id) => assignedCohorts.has(id))) {
			throw Object.assign(new Error('Scope violation: Cannot assign cohorts outside your scope'), { code: 'SCOPE_VIOLATION' });
		}
		if (assignedOfferings.size > 0 && offeringIds.length > 0 && !offeringIds.every((id) => assignedOfferings.has(id))) {
			throw Object.assign(new Error('Scope violation: Cannot assign offerings outside your scope'), { code: 'SCOPE_VIOLATION' });
		}
	}
	
	// Instructor scope validation for inviting students
	// Instructor can only invite students to cohorts/offerings they are assigned to
	if (parsed.role === 'student' && actor.role === 'instructor') {
		const assignedCohorts = new Set(actor.assignedCohorts || []);
		const assignedOfferings = new Set(actor.assignedOfferings || []);
		
		// Validate cohort_id is in instructor's assigned cohorts
		if (parsed.cohort_id && assignedCohorts.size > 0 && !assignedCohorts.has(parsed.cohort_id)) {
			throw Object.assign(new Error('Scope violation: Cannot invite students to cohorts outside your scope'), { code: 'SCOPE_VIOLATION' });
		}
		
		// Validate subject_offering_ids are in instructor's assigned offerings or belong to assigned cohorts
		if (parsed.subject_offering_ids && parsed.subject_offering_ids.length > 0) {
			if (assignedOfferings.size > 0) {
				// If instructor has specific offerings assigned, all selected offerings must be in that list
				const invalidOfferings = parsed.subject_offering_ids.filter(id => !assignedOfferings.has(id));
				if (invalidOfferings.length > 0) {
					throw Object.assign(new Error('Scope violation: Cannot invite students to subject offerings outside your scope'), { code: 'SCOPE_VIOLATION' });
				}
			} else if (assignedCohorts.size > 0 && parsed.cohort_id) {
				// If no specific offerings assigned but has cohorts, offerings must belong to the selected cohort
				// This validation will be done in the backend when attaching student links
				// For now, just ensure cohort is in assigned list
				if (!assignedCohorts.has(parsed.cohort_id)) {
					throw Object.assign(new Error('Scope violation: Cannot invite students to cohorts outside your scope'), { code: 'SCOPE_VIOLATION' });
				}
			}
		}
	}
	
	return parsed;
}

export default {
	roleEnum,
	mfaMethodEnum,
	statusEnum,
	inviteDeliveryEnum,
	userCreateSchema,
	userInviteSchema,
	validateCreateWithActor,
	validateInviteWithActor,
};



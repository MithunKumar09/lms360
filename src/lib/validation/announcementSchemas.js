import { z } from 'zod';
import {
	INTERNAL_CATEGORIES,
	PUBLIC_CATEGORIES,
	PRIORITIES,
	STATUSES,
	TARGET_ROLES,
	validateCategoryForVisibility,
} from './announcementValidators.js';

// Shared fields
export const titleSchema = z.preprocess((val) => {
	// Handle empty string during initial form load - don't trim/validate until user interacts
	if (val === '' || val === null || val === undefined) {
		return '';
	}
	return typeof val === 'string' ? val.trim() : val;
}, z.string().min(1, 'Title is required').max(180, 'Title must be at most 180 characters'));

export const messageSchema = z.preprocess((val) => {
	// Handle empty string during initial form load - don't trim/validate until user interacts
	if (val === '' || val === null || val === undefined) {
		return '';
	}
	return typeof val === 'string' ? val.trim() : val;
}, z.string().min(1, 'Message is required'));
export const prioritySchema = z.enum(PRIORITIES, { message: 'Invalid priority' });
export const statusSchema = z.enum(STATUSES, { message: 'Invalid status' });
export const startAtSchema = z.preprocess((val) => {
	// Handle empty string, null, undefined during initial form load
	if (!val || val === '' || val === null || val === undefined) {
		return undefined; // Return undefined for empty values (will trigger required error on submit)
	}
	// Try to coerce to date
	try {
		const date = new Date(val);
		// Check if date is valid
		if (isNaN(date.getTime())) {
			return undefined; // Invalid date becomes undefined
		}
		return date;
	} catch {
		return undefined; // Error in parsing becomes undefined
	}
}, z.date({ required_error: 'Start date is required', invalid_type_error: 'Invalid date format' }));
export const endAtSchema = z.preprocess((val) => {
	// Handle empty string, null, undefined
	if (!val || val === '' || val === null || val === undefined) {
		return null;
	}
	// Try to coerce to date
	try {
		const date = new Date(val);
		// Check if date is valid
		if (isNaN(date.getTime())) {
			return null;
		}
		return date;
	} catch {
		return null;
	}
}, z.date().nullable().optional());

export const categorySchemaInternal = z.enum(INTERNAL_CATEGORIES, { message: 'Invalid internal category' });
export const categorySchemaPublic = z.enum(PUBLIC_CATEGORIES, { message: 'Invalid public category' });

const attachmentItemSchema = z.object({
	key: z.string().min(1),
	url: z.string().url('Invalid attachment URL'),
	content_type: z.enum([
		'image/png','image/jpeg','image/jpg','image/webp','image/svg+xml',
		'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	], { message: 'Invalid attachment type' }),
	bytes: z.number().int().positive().max(5 * 1024 * 1024).nullable().optional(),
	checksum: z.string().min(8).max(64).nullable().optional(),
});

export const attachmentsSchema = z.array(attachmentItemSchema).max(10, 'Maximum 10 attachments allowed').optional();

const targetItemSchema = z.object({
	target_role: z.enum(TARGET_ROLES).nullable().optional(),
	target_class_id: z.string().uuid().nullable().optional(),
	target_class_label: z.string().max(120).nullable().optional(),
});
export const targetsSchema = z.array(targetItemSchema).optional();

// Internal announcement create
export const internalAnnouncementCreateSchema = z.object({
	org_id: z.string().uuid('Invalid organization').optional(), // Set by server from session
	created_by_user_id: z.string().uuid('Invalid user').optional(), // Set by server from session
	visibility: z.literal('internal'),
	title: titleSchema,
	message: messageSchema,
	category: categorySchemaInternal,
	priority: z.enum(['normal','important','urgent']),
	pin_to_dashboard: z.boolean().optional().default(false),
	send_notification: z.boolean().optional().default(false),
	status: statusSchema.default('active'),
	start_at: startAtSchema,
	end_at: endAtSchema,
	attachments: attachmentsSchema,
	targets: targetsSchema,
}).superRefine((data, ctx) => {
	// Validate category for visibility
	if (!validateCategoryForVisibility('internal', data.category)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Invalid category for internal visibility',
			path: ['category'],
		});
	}
	// Validate end_at is after start_at
	if (data.end_at) {
		try {
			const endDate = new Date(data.end_at);
			const startDate = new Date(data.start_at);
			if (isNaN(endDate.getTime()) || isNaN(startDate.getTime())) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid date format',
					path: ['end_at'],
				});
			} else if (endDate < startDate) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'End date must be after start date',
					path: ['end_at'],
				});
			}
		} catch (error) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid date format',
				path: ['end_at'],
			});
		}
	}
});

// Public announcement create
export const publicAnnouncementCreateSchema = z.object({
	org_id: z.string().uuid('Invalid organization').nullable().optional(), // Set by server from session
	created_by_user_id: z.string().uuid('Invalid user').optional(), // Set by server from session
	visibility: z.literal('public'),
	title: titleSchema,
	message: messageSchema,
	category: categorySchemaPublic,
	priority: z.enum(['normal','highlight','top_banner']),
	show_on_homepage: z.boolean().optional().default(false),
	status: statusSchema.default('active'),
	start_at: startAtSchema,
	end_at: endAtSchema,
	attachments: attachmentsSchema,
}).superRefine((data, ctx) => {
	// Validate category for visibility
	if (!validateCategoryForVisibility('public', data.category)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Invalid category for public visibility',
			path: ['category'],
		});
	}
	// Validate end_at is after start_at
	if (data.end_at) {
		try {
			const endDate = new Date(data.end_at);
			const startDate = new Date(data.start_at);
			if (isNaN(endDate.getTime()) || isNaN(startDate.getTime())) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid date format',
					path: ['end_at'],
				});
			} else if (endDate < startDate) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'End date must be after start date',
					path: ['end_at'],
				});
			}
		} catch (error) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid date format',
				path: ['end_at'],
			});
		}
	}
});

// Update (partial) schemas
export const internalAnnouncementUpdateSchema = internalAnnouncementCreateSchema.partial().extend({
	visibility: z.literal('internal').optional(),
});

export const publicAnnouncementUpdateSchema = publicAnnouncementCreateSchema.partial().extend({
	visibility: z.literal('public').optional(),
});

// Bulk row schema (union of minimal required fields for internal/public)
export const announcementBulkRowSchema = z.object({
	visibility: z.enum(['internal','public']),
	title: titleSchema,
	message: messageSchema,
	category: z.string(),
	priority: z.string(),
	org_id: z.string().uuid().nullable().optional(),
	start_at: startAtSchema,
	end_at: endAtSchema,
	show_on_homepage: z.boolean().optional(),
	pin_to_dashboard: z.boolean().optional(),
	send_notification: z.boolean().optional(),
	targets: targetsSchema,
	attachments: attachmentsSchema,
}).superRefine((data, ctx) => {
	if (!validateCategoryForVisibility(data.visibility, data.category)) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid category for visibility', path: ['category'] });
	}
	if (data.visibility === 'internal') {
		// Internal priorities only
		if (!['normal','important','urgent'].includes(data.priority)) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid priority for internal', path: ['priority'] });
		}
	} else {
		if (!['normal','highlight','top_banner'].includes(data.priority)) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid priority for public', path: ['priority'] });
		}
	}
	if (data.end_at && new Date(data.end_at) < new Date(data.start_at)) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End date must be after start date', path: ['end_at'] });
	}
});

export default {
	titleSchema,
	messageSchema,
	categorySchemaInternal,
	categorySchemaPublic,
	prioritySchema,
	statusSchema,
	startAtSchema,
	endAtSchema,
	attachmentsSchema,
	targetsSchema,
	internalAnnouncementCreateSchema,
	publicAnnouncementCreateSchema,
	internalAnnouncementUpdateSchema,
	publicAnnouncementUpdateSchema,
	announcementBulkRowSchema,
};



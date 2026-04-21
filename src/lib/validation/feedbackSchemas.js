/**
 * Feedback Validation Schemas
 * 
 * Zod validation schemas for feedback submissions.
 */

import { z } from 'zod';

/**
 * Feedback categories
 */
export const FEEDBACK_CATEGORIES = ['general', 'bug', 'feature', 'performance', 'ui/ux', 'other'];

/**
 * Feedback statuses
 */
export const FEEDBACK_STATUSES = ['pending', 'reviewed', 'resolved', 'archived'];

/**
 * Message schema
 */
export const messageSchema = z
	.string()
	.min(10, 'Message must be at least 10 characters')
	.max(5000, 'Message must be at most 5000 characters')
	.trim()
	.optional();

/**
 * Rating schema (1-5 stars)
 */
export const ratingSchema = z
	.number()
	.int('Rating must be an integer')
	.min(1, 'Rating must be at least 1')
	.max(5, 'Rating must be at most 5')
	.nullable()
	.optional();

/**
 * Category schema
 */
export const categorySchema = z
	.enum(FEEDBACK_CATEGORIES, { message: 'Invalid category' })
	.nullable()
	.optional();

/**
 * Emotion schema (1-5, mapped from emoji selection)
 */
export const emotionSchema = z
	.number()
	.int('Emotion must be an integer')
	.min(1, 'Emotion must be at least 1')
	.max(5, 'Emotion must be at most 5')
	.nullable()
	.optional();

/**
 * Status schema (for updates)
 */
export const statusSchema = z.enum(FEEDBACK_STATUSES, { message: 'Invalid status' });

/**
 * Admin notes schema
 */
export const adminNotesSchema = z
	.string()
	.max(5000, 'Admin notes must be at most 5000 characters')
	.nullable()
	.optional();

/**
 * Feedback create schema
 */
export const feedbackCreateSchema = z.object({
	message: messageSchema,
	emotion: emotionSchema, // 1-5 based on emoji selection
	category: categorySchema,
});

/**
 * Feedback update schema (superadmin only)
 */
export const feedbackUpdateSchema = z.object({
	status: statusSchema.optional(),
	admin_notes: adminNotesSchema,
});

export default {
	messageSchema,
	ratingSchema,
	emotionSchema,
	categorySchema,
	statusSchema,
	adminNotesSchema,
	feedbackCreateSchema,
	feedbackUpdateSchema,
	FEEDBACK_CATEGORIES,
	FEEDBACK_STATUSES,
};


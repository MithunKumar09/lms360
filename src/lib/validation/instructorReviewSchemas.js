/**
 * Instructor Review Validation Schemas
 * 
 * Zod validation schemas for instructor review submissions.
 */

import { z } from 'zod';

/**
 * Rating schema (1-5 stars)
 */
export const instructorReviewRatingSchema = z
  .number({
    required_error: 'Rating is required',
    invalid_type_error: 'Rating must be a number'
  })
  .int('Rating must be an integer')
  .min(1, 'Rating must be at least 1')
  .max(5, 'Rating must be at most 5');

/**
 * Feedback text schema
 */
export const instructorReviewFeedbackTextSchema = z
  .string()
  .min(1, 'Feedback text must be at least 1 character')
  .max(5000, 'Feedback text must be at most 5000 characters')
  .trim()
  .nullable()
  .optional();

/**
 * Instructor review create/update schema
 */
export const instructorReviewCreateSchema = z.object({
  rating: instructorReviewRatingSchema,
  feedbackText: instructorReviewFeedbackTextSchema,
});

/**
 * Instructor review update schema (for API)
 * Same as create but allows partial updates
 */
export const instructorReviewUpdateSchema = z.object({
  rating: instructorReviewRatingSchema.optional(),
  feedbackText: instructorReviewFeedbackTextSchema,
}).refine(
  (data) => data.rating !== undefined || data.feedbackText !== undefined,
  {
    message: 'At least one field (rating or feedbackText) must be provided for update'
  }
);

export default {
  instructorReviewRatingSchema,
  instructorReviewFeedbackTextSchema,
  instructorReviewCreateSchema,
  instructorReviewUpdateSchema,
};

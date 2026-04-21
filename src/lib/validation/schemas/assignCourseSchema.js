/**
 * Assign Course Validation Schema
 * 
 * Zod validation schema for course assignment form.
 */

import { z } from 'zod';

/**
 * Assignment target schema
 */
const assignmentTargetSchema = z.object({
  cohortIds: z.array(z.string().uuid()).default([]),
  programNodeIds: z.array(z.string().uuid()).default([]),
  classIds: z.array(z.string().uuid()).default([]),
  subjectIds: z.array(z.string().uuid()).default([]),
  years: z.array(z.number().int().min(1).max(10)).default([]),
  semesters: z.array(z.number().int().min(1).max(10)).default([]),
});

/**
 * Assign course schema
 * At least one assignment target must be selected
 */
export const assignCourseSchema = z
  .object({
    assignments: assignmentTargetSchema,
  })
  .refine(
    (data) => {
      const { assignments } = data;
      return (
        assignments.cohortIds.length > 0 ||
        assignments.programNodeIds.length > 0 ||
        assignments.classIds.length > 0 ||
        assignments.subjectIds.length > 0 ||
        assignments.years.length > 0 ||
        assignments.semesters.length > 0
      );
    },
    {
      message: 'Please select at least one assignment target (cohort, class, subject, year, or semester)',
      path: ['assignments'],
    }
  );

/**
 * Validate assignment data
 * @param {Object} data - Assignment data
 * @returns {Object} Validation result
 */
export const validateAssignCourse = (data) => {
  try {
    const result = assignCourseSchema.parse(data);
    return {
      success: true,
      data: result,
      errors: {},
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return {
        success: false,
        data: null,
        errors,
      };
    }
    return {
      success: false,
      data: null,
      errors: { _form: 'Validation failed' },
    };
  }
};

export default assignCourseSchema;


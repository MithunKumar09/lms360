/**
 * Classes & Subjects Validation Schemas
 * 
 * Zod validation schemas for Classes & Subjects feature (create, update, bulk import).
 * Provides type-safe validation with user-friendly error messages.
 * 
 * @module validation/classesSubjectsSchemas
 */

import { z } from 'zod';
import { urlSchema, validateForm } from './schemas.js';

/**
 * Valid academic level values
 */
export const VALID_ACADEMIC_LEVELS = [
  'primary',
  'high_school',
  'puc',
  'diploma',
  'degree',
  'engineering',
  'post_graduation',
];

/**
 * Valid term types
 */
export const VALID_TERM_TYPES = ['year', 'semester'];

/**
 * Valid node types
 */
export const VALID_NODE_TYPES = [
  'stream',
  'faculty',
  'programme',
  'branch',
  'combination',
  'grade',
  'department',
];

/**
 * Valid subject categories
 */
export const VALID_SUBJECT_CATEGORIES = [
  'core',
  'elective',
  'lab',
  'mandatory',
  'project',
  'internship',
  'aecc',
  'sec',
  'open_elective',
  'prof_elective',
];

/**
 * Valid status values
 */
export const VALID_STATUSES = ['draft', 'published', 'archived'];

// ============================================================================
// FIELD SCHEMAS
// ============================================================================

/**
 * Academic session code schema (VARCHAR(20), format validation)
 * Format: YYYY-YY (e.g., 2025-26)
 */
export const academicSessionCodeSchema = z
  .string()
  .min(1, 'Session code is required')
  .max(20, 'Session code must be at most 20 characters')
  .regex(/^[0-9]{4}-[0-9]{2,4}$/, 'Session code must be in format YYYY-YY (e.g., 2025-26)')
  .trim();

/**
 * Term type schema (enum)
 */
export const termTypeSchema = z.enum(VALID_TERM_TYPES, {
  errorMap: () => ({ message: 'Term type must be either "year" or "semester"' }),
});

/**
 * Section label schema (VARCHAR(10), uppercase)
 */
export const sectionLabelSchema = z
  .string()
  .min(1, 'Section label is required')
  .max(10, 'Section label must be at most 10 characters')
  .regex(/^[A-Z0-9]+$/, 'Section label must contain only uppercase letters and numbers')
  .trim()
  .transform((val) => val.toUpperCase());

/**
 * Program node code schema (VARCHAR(50), alphanumeric)
 */
export const programNodeCodeSchema = z
  .string()
  .min(1, 'Code is required')
  .max(50, 'Code must be at most 50 characters')
  .regex(/^[A-Za-z0-9\-_]+$/, 'Code must contain only letters, numbers, hyphens, and underscores')
  .trim();

/**
 * Cohort code schema (VARCHAR(100), format validation)
 * Format: flexible, e.g., "I-PUC-ECBA-A-2025-27"
 */
export const cohortCodeSchema = z
  .string()
  .min(1, 'Cohort code is required')
  .max(100, 'Cohort code must be at most 100 characters')
  .trim();

/**
 * Subject code schema (VARCHAR(50), alphanumeric)
 */
export const subjectCodeSchema = z
  .string()
  .min(1, 'Subject code is required')
  .max(50, 'Subject code must be at most 50 characters')
  .regex(/^[A-Za-z0-9\-_]+$/, 'Subject code must contain only letters, numbers, hyphens, and underscores')
  .trim();

/**
 * Subject category schema (enum)
 */
export const subjectCategorySchema = z.enum(VALID_SUBJECT_CATEGORIES, {
  errorMap: () => ({ message: 'Please select a valid subject category' }),
});

/**
 * Academic level schema (enum)
 */
export const academicLevelSchema = z.enum(VALID_ACADEMIC_LEVELS, {
  errorMap: () => ({ message: 'Please select a valid academic level' }),
});

/**
 * Node type schema (enum)
 */
export const nodeTypeSchema = z.enum(VALID_NODE_TYPES, {
  errorMap: () => ({ message: 'Please select a valid node type' }),
});

/**
 * Status schema (enum)
 */
export const statusSchema = z.enum(VALID_STATUSES, {
  errorMap: () => ({ message: 'Please select a valid status' }),
});

/**
 * Credits schema (NUMERIC(4,1), >= 0)
 */
export const creditsSchema = z
  .number()
  .nonnegative('Credits must be greater than or equal to 0')
  .max(999.9, 'Credits must be at most 999.9')
  .refine((val) => {
    // Check decimal places (max 1)
    const decimalPlaces = (val.toString().split('.')[1] || '').length;
    return decimalPlaces <= 1;
  }, 'Credits can have at most 1 decimal place')
  .or(z.string().regex(/^\d+(\.\d{1})?$/, 'Invalid credits format').transform(Number));

/**
 * Hours per week schema (INTEGER, > 0)
 */
export const hoursPerWeekSchema = z
  .number()
  .int('Hours per week must be a whole number')
  .positive('Hours per week must be greater than 0')
  .max(40, 'Hours per week must be at most 40')
  .or(z.string().regex(/^\d+$/, 'Invalid hours format').transform(Number));

/**
 * UUID schema
 */
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

/**
 * Date schema
 */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in format YYYY-MM-DD')
  .or(z.date())
  .transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  });

/**
 * JSONB schema (for metadata, rules, etc.)
 */
export const jsonbSchema = z.record(z.any()).optional().default({});

// ============================================================================
// MAIN SCHEMAS
// ============================================================================

/**
 * Academic session create schema
 */
export const academicSessionCreateSchema = z
  .object({
    org_id: uuidSchema,
    code: academicSessionCodeSchema,
    start_date: dateSchema,
    end_date: dateSchema,
    is_current: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      const start = typeof data.start_date === 'string' ? new Date(data.start_date) : data.start_date;
      const end = typeof data.end_date === 'string' ? new Date(data.end_date) : data.end_date;
      return end > start;
    },
    {
      message: 'End date must be after start date',
      path: ['end_date'],
    }
  );

/**
 * Academic session update schema
 */
export const academicSessionUpdateSchema = z
  .object({
    code: academicSessionCodeSchema.optional(),
    start_date: dateSchema.optional(),
    end_date: dateSchema.optional(),
    is_current: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        const start = typeof data.start_date === 'string' ? new Date(data.start_date) : data.start_date;
        const end = typeof data.end_date === 'string' ? new Date(data.end_date) : data.end_date;
        return end > start;
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['end_date'],
    }
  );

/**
 * Term create schema
 */
export const termCreateSchema = z.object({
  org_id: uuidSchema,
  term_type: termTypeSchema,
  number: z.number().int().positive('Term number must be a positive integer'),
  label: z.string().min(1, 'Label is required').max(50, 'Label must be at most 50 characters').trim(),
  scheme_year: z.number().int().positive().optional().nullable(),
});

/**
 * Term update schema
 */
export const termUpdateSchema = z.object({
  term_type: termTypeSchema.optional(),
  number: z.number().int().positive().optional(),
  label: z.string().min(1).max(50).trim().optional(),
  scheme_year: z.number().int().positive().optional().nullable(),
});

/**
 * Section create schema
 */
export const sectionCreateSchema = z.object({
  org_id: uuidSchema,
  label: sectionLabelSchema,
  capacity: z.number().int().positive().optional().nullable(),
  room: z.string().max(50, 'Room must be at most 50 characters').trim().optional().nullable(),
});

/**
 * Section update schema
 */
export const sectionUpdateSchema = z.object({
  label: sectionLabelSchema.optional(),
  capacity: z.number().int().positive().optional().nullable(),
  room: z.string().max(50).trim().optional().nullable(),
});

/**
 * Program node create schema (with parent_id validation)
 */
export const programNodeCreateSchema = z
  .object({
    org_id: uuidSchema,
    level: academicLevelSchema,
    node_type: nodeTypeSchema,
    code: programNodeCodeSchema,
    title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters').trim(),
    parent_id: uuidSchema.optional().nullable(),
    metadata: jsonbSchema,
    status: z.enum(['active', 'archived']).optional().default('active'),
  })
  .refine(
    (data) => {
      // If parent_id is provided, it should be a valid UUID
      // Level matching will be validated server-side
      return true;
    },
    {
      message: 'Parent node must exist and match the level',
      path: ['parent_id'],
    }
  );

/**
 * Program node update schema
 */
export const programNodeUpdateSchema = z.object({
  level: academicLevelSchema.optional(),
  node_type: nodeTypeSchema.optional(),
  code: programNodeCodeSchema.optional(),
  title: z.string().min(1).max(255).trim().optional(),
  parent_id: uuidSchema.optional().nullable(),
  metadata: jsonbSchema.optional(),
  status: z.enum(['active', 'archived']).optional(),
});

/**
 * Cohort create schema (with locked_fields handling)
 */
export const cohortCreateSchema = z
  .object({
    org_id: uuidSchema,
    level: academicLevelSchema,
    program_node_id: uuidSchema,
    term_id: uuidSchema.optional().nullable(),
    section_id: uuidSchema,
    session_id: uuidSchema,
    code: cohortCodeSchema,
    status: statusSchema.optional().default('draft'),
    created_by: uuidSchema,
    created_by_role: z.enum(['superadmin', 'admin']),
    locked_fields: jsonbSchema.optional().default({}),
    subject_ids: z.array(uuidSchema).optional().default([]),
  })
  .refine(
    (data) => {
      // Level matching will be validated server-side via trigger
      return true;
    },
    {
      message: 'Cohort level must match program node level',
      path: ['level'],
    }
  );

/**
 * Cohort update schema (respect locked_fields)
 */
export const cohortUpdateSchema = z.object({
  level: academicLevelSchema.optional(),
  program_node_id: uuidSchema.optional(),
  term_id: uuidSchema.optional().nullable(),
  section_id: uuidSchema.optional(),
  session_id: uuidSchema.optional(),
  code: cohortCodeSchema.optional(),
  status: statusSchema.optional(),
  locked_fields: jsonbSchema.optional(),
});

/**
 * Subject catalog create schema
 */
export const subjectCatalogCreateSchema = z.object({
  org_id: uuidSchema,
  code: subjectCodeSchema,
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters').trim(),
  description: z.string().trim().optional().nullable(),
  category: subjectCategorySchema,
  credits: creditsSchema.optional().nullable(),
  hours_per_week: hoursPerWeekSchema.optional().nullable(),
  syllabus_url: urlSchema.optional().nullable(),
  exam_pattern: jsonbSchema.optional().nullable(),
  level: academicLevelSchema,
  department_node_id: uuidSchema.optional().nullable(),
  metadata: jsonbSchema.optional().nullable(),
  status: z.enum(['active', 'archived']).optional().default('active'),
});

/**
 * Subject catalog update schema
 */
export const subjectCatalogUpdateSchema = z.object({
  code: subjectCodeSchema.optional(),
  title: z.string().min(1).max(255).trim().optional(),
  description: z.string().trim().optional().nullable(),
  category: subjectCategorySchema.optional(),
  credits: creditsSchema.optional().nullable(),
  hours_per_week: hoursPerWeekSchema.optional().nullable(),
  syllabus_url: urlSchema.optional().nullable(),
  exam_pattern: jsonbSchema.optional().nullable(),
  level: academicLevelSchema.optional(),
  department_node_id: uuidSchema.optional().nullable(),
  metadata: jsonbSchema.optional().nullable(),
  status: z.enum(['active', 'archived']).optional(),
});

/**
 * Elective group create schema
 */
export const electiveGroupCreateSchema = z
  .object({
    org_id: uuidSchema,
    program_node_id: uuidSchema,
    term_id: uuidSchema.optional().nullable(),
    code: z.string().min(1, 'Code is required').max(50, 'Code must be at most 50 characters').trim(),
    title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters').trim(),
    pick_min: z.number().int().nonnegative('Pick minimum must be >= 0').optional().default(1),
    pick_max: z.number().int().nonnegative('Pick maximum must be >= 0').optional().default(1),
    rules: jsonbSchema.optional().default({}),
  })
  .refine(
    (data) => data.pick_max >= data.pick_min,
    {
      message: 'Pick maximum must be greater than or equal to pick minimum',
      path: ['pick_max'],
    }
  );

/**
 * Elective group update schema
 */
export const electiveGroupUpdateSchema = z
  .object({
    program_node_id: uuidSchema.optional(),
    term_id: uuidSchema.optional().nullable(),
    code: z.string().min(1).max(50).trim().optional(),
    title: z.string().min(1).max(255).trim().optional(),
    pick_min: z.number().int().nonnegative().optional(),
    pick_max: z.number().int().nonnegative().optional(),
    rules: jsonbSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.pick_min !== undefined && data.pick_max !== undefined) {
        return data.pick_max >= data.pick_min;
      }
      return true;
    },
    {
      message: 'Pick maximum must be greater than or equal to pick minimum',
      path: ['pick_max'],
    }
  );

/**
 * Elective group member schema
 */
export const electiveGroupMemberSchema = z.object({
  elective_group_id: uuidSchema,
  subject_id: uuidSchema,
});

/**
 * Subject offering create schema (XOR validation for subject_id/elective_group_id)
 */
export const subjectOfferingCreateSchema = z
  .object({
    org_id: uuidSchema,
    cohort_id: uuidSchema,
    subject_id: uuidSchema.optional().nullable(),
    elective_group_id: uuidSchema.optional().nullable(),
    is_compulsory: z.boolean().optional().default(true),
    status: statusSchema.optional().default('draft'),
  })
  .refine(
    (data) => {
      // XOR: exactly one of subject_id or elective_group_id must be provided
      const hasSubject = data.subject_id !== null && data.subject_id !== undefined;
      const hasElective = data.elective_group_id !== null && data.elective_group_id !== undefined;
      return (hasSubject && !hasElective) || (!hasSubject && hasElective);
    },
    {
      message: 'Either subject_id or elective_group_id must be provided, but not both',
      path: ['subject_id'],
    }
  );

/**
 * Subject offering update schema
 */
export const subjectOfferingUpdateSchema = z
  .object({
    subject_id: uuidSchema.optional().nullable(),
    elective_group_id: uuidSchema.optional().nullable(),
    is_compulsory: z.boolean().optional(),
    status: statusSchema.optional(),
  })
  .refine(
    (data) => {
      // If both are being updated, ensure XOR
      if (data.subject_id !== undefined && data.elective_group_id !== undefined) {
        const hasSubject = data.subject_id !== null;
        const hasElective = data.elective_group_id !== null;
        return (hasSubject && !hasElective) || (!hasSubject && hasElective);
      }
      return true;
    },
    {
      message: 'Either subject_id or elective_group_id must be provided, but not both',
      path: ['subject_id'],
    }
  );

/**
 * Teacher assignment schema
 */
export const teacherAssignmentSchema = z.object({
  org_id: uuidSchema,
  subject_offering_id: uuidSchema,
  teacher_id: uuidSchema,
  load: jsonbSchema.optional().default({}),
});

/**
 * Bulk import classes schema (for CSV/XLSX)
 */
export const bulkImportClassesSchema = z.object({
  org_code: z.string().min(1, 'Organization code is required').trim(),
  level: academicLevelSchema,
  node_type: nodeTypeSchema,
  program_code: z.string().min(1, 'Program code is required').trim(),
  term_type: termTypeSchema.optional().nullable(),
  term_number_or_label: z.string().trim().optional().nullable(),
  section_label: sectionLabelSchema,
  session_code: academicSessionCodeSchema,
  cohort_status: statusSchema.optional().default('draft'),
});

/**
 * Bulk import subjects schema (for CSV/XLSX)
 */
export const bulkImportSubjectsSchema = z.object({
  org_code: z.string().min(1, 'Organization code is required').trim(),
  level: academicLevelSchema,
  department_code: z.string().trim().optional().nullable(),
  subject_code: subjectCodeSchema,
  title: z.string().min(1, 'Title is required').max(255).trim(),
  category: subjectCategorySchema,
  credits: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val === '') return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    })
    .pipe(creditsSchema.optional().nullable()),
  hours_per_week: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val === '') return null;
      const num = parseInt(val, 10);
      return isNaN(num) ? null : num;
    })
    .pipe(hoursPerWeekSchema.optional().nullable()),
  syllabus_url: urlSchema.optional().nullable(),
});

// ============================================================================
// EXPORTS
// ============================================================================

export { validateForm };

export default {
  // Main schemas
  academicSessionCreateSchema,
  academicSessionUpdateSchema,
  termCreateSchema,
  termUpdateSchema,
  sectionCreateSchema,
  sectionUpdateSchema,
  programNodeCreateSchema,
  programNodeUpdateSchema,
  cohortCreateSchema,
  cohortUpdateSchema,
  subjectCatalogCreateSchema,
  subjectCatalogUpdateSchema,
  electiveGroupCreateSchema,
  electiveGroupUpdateSchema,
  electiveGroupMemberSchema,
  subjectOfferingCreateSchema,
  subjectOfferingUpdateSchema,
  teacherAssignmentSchema,
  bulkImportClassesSchema,
  bulkImportSubjectsSchema,
  // Field schemas
  academicSessionCodeSchema,
  termTypeSchema,
  sectionLabelSchema,
  programNodeCodeSchema,
  cohortCodeSchema,
  subjectCodeSchema,
  subjectCategorySchema,
  academicLevelSchema,
  nodeTypeSchema,
  statusSchema,
  creditsSchema,
  hoursPerWeekSchema,
};


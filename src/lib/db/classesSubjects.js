/**
 * Classes & Subjects Database Utilities
 * 
 * Provides CRUD operations and query helpers for Classes & Subjects feature.
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/classesSubjects
 */

import { query, getClient } from './index.js';

// ============================================================================
// ACADEMIC SESSIONS
// ============================================================================

/**
 * Create a new academic session
 */
export async function createAcademicSession(data) {
  try {
    const { org_id, code, start_date, end_date, is_current = false } = data;

    const result = await query(
      `INSERT INTO academic_sessions (org_id, code, start_date, end_date, is_current)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [org_id, code, start_date, end_date, is_current]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Academic session with this code already exists for this organization');
    }
    if (error.code === '23514') {
      throw new Error(`Invalid academic session data: ${error.message}`);
    }
    throw error;
  }
}

/**
 * List academic sessions with filters, pagination, and search
 */
export async function listAcademicSessions(filters = {}) {
  try {
    const {
      org_id,
      search,
      is_current,
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'DESC',
    } = filters;

    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (org_id) {
      whereConditions.push(`org_id = $${paramIndex}`);
      params.push(org_id);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`code ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (is_current !== undefined) {
      whereConditions.push(`is_current = $${paramIndex}`);
      params.push(is_current);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const allowedSortFields = ['created_at', 'updated_at', 'code', 'start_date'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await query(
      `SELECT COUNT(*) as total FROM academic_sessions ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const result = await query(
      `SELECT * FROM academic_sessions 
       ${whereClause} 
       ORDER BY ${sortField} ${sortOrder} 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      sessions: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get academic session by ID
 */
export async function getAcademicSessionById(id) {
  try {
    const result = await query(
      'SELECT * FROM academic_sessions WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Update academic session
 */
export async function updateAcademicSession(id, data) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return await getAcademicSessionById(id);
    }

    values.push(id);

    const result = await query(
      `UPDATE academic_sessions 
       SET ${fields.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Academic session with this code already exists for this organization');
    }
    if (error.code === '23514') {
      throw new Error(`Invalid academic session data: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if session code exists
 */
export async function checkSessionCodeExists(orgId, code, excludeId = null) {
  try {
    let queryText = 'SELECT id FROM academic_sessions WHERE org_id = $1 AND LOWER(code) = LOWER($2)';
    const params = [orgId, code];

    if (excludeId) {
      queryText += ' AND id != $3';
      params.push(excludeId);
    }

    const result = await query(queryText, params);
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// TERMS
// ============================================================================

/**
 * Create a new term
 */
export async function createTerm(data) {
  try {
    const { org_id, term_type, number, label, scheme_year } = data;

    const result = await query(
      `INSERT INTO terms (org_id, term_type, number, label, scheme_year)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [org_id, term_type, number, label, scheme_year || null]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Term with this combination already exists for this organization');
    }
    throw error;
  }
}

/**
 * List terms with filters
 */
export async function listTerms(filters = {}) {
  try {
    const { org_id, term_type, page = 1, limit = 50 } = filters;

    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (org_id) {
      whereConditions.push(`org_id = $${paramIndex}`);
      params.push(org_id);
      paramIndex++;
    }

    if (term_type) {
      whereConditions.push(`term_type = $${paramIndex}`);
      params.push(term_type);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const result = await query(
      `SELECT * FROM terms 
       ${whereClause} 
       ORDER BY term_type, number 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, (page - 1) * limit]
    );

    return result.rows;
  } catch (error) {
    throw error;
  }
}

/**
 * Get term by ID
 */
export async function getTermById(id) {
  try {
    const result = await query('SELECT * FROM terms WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Update term
 */
export async function updateTerm(id, data) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return await getTermById(id);
    }

    values.push(id);

    const result = await query(
      `UPDATE terms SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Term with this combination already exists for this organization');
    }
    throw error;
  }
}

// ============================================================================
// SECTIONS
// ============================================================================

/**
 * Create a new section
 */
export async function createSection(data) {
  try {
    const { org_id, label, capacity, room } = data;

    const result = await query(
      `INSERT INTO sections (org_id, label, capacity, room)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [org_id, label, capacity || null, room || null]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Section with this label already exists for this organization');
    }
    throw error;
  }
}

/**
 * List sections with filters
 */
export async function listSections(filters = {}) {
  try {
    const { org_id, page = 1, limit = 50 } = filters;

    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (org_id) {
      whereConditions.push(`org_id = $${paramIndex}`);
      params.push(org_id);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const result = await query(
      `SELECT * FROM sections 
       ${whereClause} 
       ORDER BY label 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, (page - 1) * limit]
    );

    return result.rows;
  } catch (error) {
    throw error;
  }
}

/**
 * Get section by ID
 */
export async function getSectionById(id) {
  try {
    const result = await query('SELECT * FROM sections WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Update section
 */
export async function updateSection(id, data) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return await getSectionById(id);
    }

    values.push(id);

    const result = await query(
      `UPDATE sections SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Section with this label already exists for this organization');
    }
    throw error;
  }
}

// ============================================================================
// PROGRAM NODES
// ============================================================================

/**
 * Create a new program node
 */
export async function createProgramNode(data) {
  try {
    const { org_id, level, node_type, code, title, parent_id, metadata = {}, status = 'active' } = data;

    const result = await query(
      `INSERT INTO program_nodes (org_id, level, node_type, code, title, parent_id, metadata, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [org_id, level, node_type, code, title, parent_id || null, JSON.stringify(metadata), status]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Program node with this code already exists for this organization, level, and type');
    }
    throw error;
  }
}

/**
 * List program nodes with filters and hierarchy support
 */
export async function listProgramNodes(filters = {}) {
  try {
    const {
      org_id,
      level,
      node_type,
      parent_id,
      status,
      search,
      page = 1,
      limit = 50,
    } = filters;

    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (org_id) {
      whereConditions.push(`org_id = $${paramIndex}`);
      params.push(org_id);
      paramIndex++;
    }

    if (level) {
      whereConditions.push(`level = $${paramIndex}`);
      params.push(level);
      paramIndex++;
    }

    if (node_type) {
      whereConditions.push(`node_type = $${paramIndex}`);
      params.push(node_type);
      paramIndex++;
    }

    if (parent_id !== undefined) {
      if (parent_id === null) {
        whereConditions.push('parent_id IS NULL');
      } else {
        whereConditions.push(`parent_id = $${paramIndex}`);
        params.push(parent_id);
        paramIndex++;
      }
    }

    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(code ILIKE $${paramIndex} OR title ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const result = await query(
      `SELECT * FROM program_nodes 
       ${whereClause} 
       ORDER BY level, node_type, code 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, (page - 1) * limit]
    );

    return result.rows;
  } catch (error) {
    throw error;
  }
}

/**
 * Get program node by ID
 */
export async function getProgramNodeById(id) {
  try {
    const result = await query('SELECT * FROM program_nodes WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Get program node hierarchy for an organization and level
 */
export async function getProgramNodeHierarchy(orgId, level) {
  try {
    // Get all nodes for the level, ordered by hierarchy
    const result = await query(
      `WITH RECURSIVE node_tree AS (
         SELECT id, org_id, level, node_type, code, title, parent_id, metadata, status, 0 as depth
         FROM program_nodes
         WHERE org_id = $1 AND level = $2 AND parent_id IS NULL
         UNION ALL
         SELECT pn.id, pn.org_id, pn.level, pn.node_type, pn.code, pn.title, pn.parent_id, pn.metadata, pn.status, nt.depth + 1
         FROM program_nodes pn
         INNER JOIN node_tree nt ON pn.parent_id = nt.id
       )
       SELECT * FROM node_tree ORDER BY depth, node_type, code`,
      [orgId, level]
    );

    return result.rows;
  } catch (error) {
    throw error;
  }
}

/**
 * Update program node
 */
export async function updateProgramNode(id, data) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined) {
        if (key === 'metadata' && typeof data[key] === 'object') {
          fields.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(data[key]));
        } else {
          fields.push(`${key} = $${paramIndex}`);
          values.push(data[key]);
        }
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return await getProgramNodeById(id);
    }

    values.push(id);

    const result = await query(
      `UPDATE program_nodes SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Program node with this code already exists for this organization, level, and type');
    }
    throw error;
  }
}

/**
 * Check if program node code exists
 */
export async function checkProgramNodeCodeExists(orgId, level, nodeType, code, excludeId = null) {
  try {
    let queryText = `SELECT id FROM program_nodes 
                     WHERE org_id = $1 AND level = $2 AND node_type = $3 AND LOWER(code) = LOWER($4)`;
    const params = [orgId, level, nodeType, code];

    if (excludeId) {
      queryText += ' AND id != $5';
      params.push(excludeId);
    }

    const result = await query(queryText, params);
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// COHORTS
// ============================================================================

/**
 * Create a new cohort
 */
export async function createCohort(data) {
  try {
    const {
      org_id,
      level,
      program_node_id,
      term_id,
      section_id,
      session_id,
      code,
      status = 'draft',
      created_by,
      created_by_role,
      locked_fields = {},
    } = data;

    const result = await query(
      `INSERT INTO cohorts (
        org_id, level, program_node_id, term_id, section_id, session_id,
        code, status, created_by, created_by_role, locked_fields
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        org_id,
        level,
        program_node_id,
        term_id || null,
        section_id,
        session_id,
        code,
        status,
        created_by,
        created_by_role,
        JSON.stringify(locked_fields),
      ]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Cohort with this combination already exists');
    }
    if (error.code === '23514') {
      throw new Error(`Invalid cohort data: ${error.message}`);
    }
    throw error;
  }
}

/**
 * List cohorts with filters, pagination, search, and joins
 */
export async function listCohorts(filters = {}) {
  try {
    const {
      org_id,
      level,
      status,
      session_id,
      term_id,
      section_id,
      program_node_id,
      search,
      instructorIds, // Array of instructor user IDs - filter cohorts assigned to these instructors
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'DESC',
    } = filters;

    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (org_id) {
      whereConditions.push(`c.org_id = $${paramIndex}`);
      params.push(org_id);
      paramIndex++;
    }

    if (level) {
      whereConditions.push(`c.level = $${paramIndex}`);
      params.push(level);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`c.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (session_id) {
      whereConditions.push(`c.session_id = $${paramIndex}`);
      params.push(session_id);
      paramIndex++;
    }

    if (term_id) {
      whereConditions.push(`c.term_id = $${paramIndex}`);
      params.push(term_id);
      paramIndex++;
    }

    if (section_id) {
      whereConditions.push(`c.section_id = $${paramIndex}`);
      params.push(section_id);
      paramIndex++;
    }

    if (program_node_id) {
      whereConditions.push(`c.program_node_id = $${paramIndex}`);
      params.push(program_node_id);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(c.code ILIKE $${paramIndex} OR pn.title ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Filter by instructor assignments if instructorIds provided
    // Cohorts must be assigned to at least one of the specified instructors
    if (instructorIds && Array.isArray(instructorIds) && instructorIds.length > 0) {
      const instructorPlaceholders = instructorIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
      whereConditions.push(`EXISTS (
        SELECT 1 FROM (
          SELECT DISTINCT cohort_id 
          FROM instructor_classes 
          WHERE instructor_user_id IN (${instructorPlaceholders}) AND cohort_id IS NOT NULL
          UNION
          SELECT DISTINCT cohort_id 
          FROM user_class_subject_links 
          WHERE user_id IN (${instructorPlaceholders}) AND link_type = 'instructor' AND cohort_id IS NOT NULL
        ) AS instructor_cohorts
        WHERE instructor_cohorts.cohort_id = c.id
      )`);
      params.push(...instructorIds);
      paramIndex += instructorIds.length;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const allowedSortFields = ['created_at', 'updated_at', 'code', 'status'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count with joins
    const countResult = await query(
      `SELECT COUNT(*) as total 
       FROM cohorts c
       LEFT JOIN program_nodes pn ON c.program_node_id = pn.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Fetch with joins
    const result = await query(
      `SELECT 
         c.*,
         pn.title as program_node_title,
         pn.code as program_node_code,
         s.label as section_label,
         t.label as term_label,
         t.term_type,
         ac.code as session_code,
         (SELECT COUNT(*) FROM subject_offerings WHERE cohort_id = c.id) as total_subjects
       FROM cohorts c
       LEFT JOIN program_nodes pn ON c.program_node_id = pn.id
       LEFT JOIN sections s ON c.section_id = s.id
       LEFT JOIN terms t ON c.term_id = t.id
       LEFT JOIN academic_sessions ac ON c.session_id = ac.id
       ${whereClause} 
       ORDER BY c.${sortField} ${sortOrder} 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      cohorts: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get cohort by ID with full details
 */
export async function getCohortById(id) {
  try {
    const result = await query(
      `SELECT 
         c.*,
         pn.title as program_node_title,
         pn.code as program_node_code,
         pn.node_type as program_node_type,
         s.label as section_label,
         s.capacity as section_capacity,
         s.room as section_room,
         t.label as term_label,
         t.term_type,
         ac.code as session_code,
         ac.start_date as session_start_date,
         ac.end_date as session_end_date,
         u.email as created_by_email
       FROM cohorts c
       LEFT JOIN program_nodes pn ON c.program_node_id = pn.id
       LEFT JOIN sections s ON c.section_id = s.id
       LEFT JOIN terms t ON c.term_id = t.id
       LEFT JOIN academic_sessions ac ON c.session_id = ac.id
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [id]
    );

    const cohort = result.rows[0] || null;
    
    // Log raw database result
    if (cohort) {
      console.log('[BACKEND] getCohortById: Raw database result for cohort id:', id, {
        rowCount: result.rows.length,
        allFields: Object.keys(cohort),
        nullFields: Object.keys(cohort).filter(key => cohort[key] === null || cohort[key] === undefined),
        sampleData: {
          id: cohort.id,
          code: cohort.code,
          org_id: cohort.org_id,
          program_node_id: cohort.program_node_id,
          program_node_title: cohort.program_node_title,
          section_id: cohort.section_id,
          section_label: cohort.section_label,
          term_id: cohort.term_id,
          term_label: cohort.term_label,
          session_id: cohort.session_id,
          session_code: cohort.session_code,
        },
      });
    } else {
      console.log('[BACKEND] getCohortById: No cohort found for id:', id);
    }

    return cohort;
  } catch (error) {
    console.error('[BACKEND] getCohortById: Database error:', error);
    throw error;
  }
}

/**
 * Update cohort (respect locked_fields based on userRole)
 */
export async function updateCohort(id, data, userRole) {
  try {
    // Get current cohort to check locked_fields
    const currentCohort = await getCohortById(id);
    if (!currentCohort) {
      return null;
    }

    const lockedFields = currentCohort.locked_fields || {};
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(data).forEach((key) => {
      // Admins cannot edit locked fields
      if (userRole === 'admin' && lockedFields[key]) {
        return; // Skip this field
      }

      if (data[key] !== undefined) {
        if (key === 'locked_fields' && typeof data[key] === 'object') {
          fields.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(data[key]));
        } else {
          fields.push(`${key} = $${paramIndex}`);
          values.push(data[key]);
        }
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return await getCohortById(id);
    }

    values.push(id);

    const result = await query(
      `UPDATE cohorts SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Cohort with this combination already exists');
    }
    if (error.code === '23514') {
      throw new Error(`Invalid cohort data: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Publish cohort (set status to 'published')
 */
export async function publishCohort(id) {
  try {
    const result = await query(
      `UPDATE cohorts SET status = 'published' WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Archive cohort (set status to 'archived')
 */
export async function archiveCohort(id) {
  try {
    const result = await query(
      `UPDATE cohorts SET status = 'archived' WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Check if cohort exists
 */
export async function checkCohortExists(orgId, programNodeId, sectionId, sessionId, termId) {
  try {
    const result = await query(
      `SELECT id FROM cohorts 
       WHERE org_id = $1 AND program_node_id = $2 AND section_id = $3 AND session_id = $4 
       AND (term_id = $5 OR (term_id IS NULL AND $5 IS NULL))`,
      [orgId, programNodeId, sectionId, sessionId, termId || null]
    );
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// SUBJECT CATALOG
// ============================================================================

/**
 * Create a new subject in catalog
 */
export async function createSubjectCatalog(data) {
  try {
    const {
      org_id,
      code,
      title,
      category,
      credits,
      hours_per_week,
      syllabus_url,
      exam_pattern,
      level,
      department_node_id,
      status = 'active',
    } = data;

    const result = await query(
      `INSERT INTO subject_catalog (
        org_id, code, title, category, credits, hours_per_week,
        syllabus_url, exam_pattern, level, department_node_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        org_id,
        code,
        title,
        category,
        credits || null,
        hours_per_week || null,
        syllabus_url || null,
        exam_pattern ? JSON.stringify(exam_pattern) : null,
        level,
        department_node_id || null,
        status,
      ]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Subject with this code already exists for this organization');
    }
    throw error;
  }
}

/**
 * List subject catalog with filters, search, and pagination
 */
export async function listSubjectCatalog(filters = {}) {
  try {
    const {
      org_id,
      level,
      category,
      status,
      department_node_id,
      search,
      instructorIds, // Array of instructor user IDs - filter subjects assigned to these instructors
      classIds, // Array of class (cohort) IDs - filter subjects offered in these classes
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'DESC',
    } = filters;

    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (org_id) {
      whereConditions.push(`sc.org_id = $${paramIndex}`);
      params.push(org_id);
      paramIndex++;
    }

    if (level) {
      whereConditions.push(`sc.level = $${paramIndex}`);
      params.push(level);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`sc.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`sc.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (department_node_id) {
      whereConditions.push(`sc.department_node_id = $${paramIndex}`);
      params.push(department_node_id);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`to_tsvector('simple', sc.code || ' ' || sc.title) @@ plainto_tsquery('simple', $${paramIndex})`);
      params.push(search);
      paramIndex++;
    }

    // Filter by instructorIds - subjects assigned to these instructors
    if (instructorIds && Array.isArray(instructorIds) && instructorIds.length > 0) {
      const instructorPlaceholders = instructorIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
      whereConditions.push(`EXISTS (
        SELECT 1 FROM (
          -- From instructor_classes table
          SELECT DISTINCT so.subject_id
          FROM instructor_classes ic
          JOIN subject_offerings so ON ic.subject_offering_id = so.id
          WHERE ic.instructor_user_id IN (${instructorPlaceholders}) AND so.subject_id IS NOT NULL
          UNION
          -- From teacher_assignments table
          SELECT DISTINCT so.subject_id
          FROM teacher_assignments ta
          JOIN subject_offerings so ON ta.subject_offering_id = so.id
          WHERE ta.teacher_id IN (${instructorPlaceholders}) AND so.subject_id IS NOT NULL
        ) AS instructor_subjects
        WHERE instructor_subjects.subject_id = sc.id
      )`);
      params.push(...instructorIds);
      paramIndex += instructorIds.length;
    }

    // Filter by classIds - subjects offered in these classes
    if (classIds && Array.isArray(classIds) && classIds.length > 0) {
      const classPlaceholders = classIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
      whereConditions.push(`EXISTS (
        SELECT 1 FROM subject_offerings so
        WHERE so.subject_id = sc.id
          AND so.cohort_id IN (${classPlaceholders})
          AND so.status = 'published'
      )`);
      params.push(...classIds);
      paramIndex += classIds.length;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const allowedSortFields = ['created_at', 'updated_at', 'code', 'title', 'category'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await query(
      `SELECT COUNT(*) as total FROM subject_catalog sc ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const result = await query(
      `SELECT 
         sc.*,
         pn.title as department_title,
         pn.code as department_code
       FROM subject_catalog sc
       LEFT JOIN program_nodes pn ON sc.department_node_id = pn.id
       ${whereClause} 
       ORDER BY ${sortField} ${sortOrder} 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      subjects: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get subject catalog by ID
 */
export async function getSubjectCatalogById(id) {
  try {
    const result = await query(
      `SELECT 
         sc.*,
         pn.title as department_title,
         pn.code as department_code
       FROM subject_catalog sc
       LEFT JOIN program_nodes pn ON sc.department_node_id = pn.id
       WHERE sc.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Update subject catalog
 */
export async function updateSubjectCatalog(id, data) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Only allow columns that actually exist on subject_catalog
    const allowedColumns = new Set([
      'code',
      'title',
      'category',
      'credits',
      'hours_per_week',
      'syllabus_url',
      'exam_pattern',
      'level',
      'department_node_id',
      'status',
    ]);

    Object.keys(data).forEach((key) => {
      if (!allowedColumns.has(key)) return;
      if (data[key] !== undefined) {
        if (key === 'exam_pattern' && typeof data[key] === 'object') {
          fields.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(data[key]));
        } else {
          fields.push(`${key} = $${paramIndex}`);
          values.push(data[key]);
        }
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return await getSubjectCatalogById(id);
    }

    values.push(id);

    const result = await query(
      `UPDATE subject_catalog SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Subject with this code already exists for this organization');
    }
    throw error;
  }
}

/**
 * Check if subject code exists
 */
export async function checkSubjectCodeExists(orgId, code, excludeId = null) {
  try {
    let queryText = 'SELECT id FROM subject_catalog WHERE org_id = $1 AND LOWER(code) = LOWER($2)';
    const params = [orgId, code];

    if (excludeId) {
      queryText += ' AND id != $3';
      params.push(excludeId);
    }

    const result = await query(queryText, params);
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// ELECTIVE GROUPS
// ============================================================================

/**
 * Create a new elective group
 */
export async function createElectiveGroup(data) {
  try {
    const {
      org_id,
      program_node_id,
      term_id,
      code,
      title,
      pick_min = 1,
      pick_max = 1,
      rules = {},
    } = data;

    const result = await query(
      `INSERT INTO elective_groups (
        org_id, program_node_id, term_id, code, title, pick_min, pick_max, rules
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        org_id,
        program_node_id,
        term_id || null,
        code,
        title,
        pick_min,
        pick_max,
        JSON.stringify(rules),
      ]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Elective group with this code already exists for this program and term');
    }
    throw error;
  }
}

/**
 * List elective groups with filters
 */
export async function listElectiveGroups(filters = {}) {
  try {
    const { org_id, program_node_id, term_id, page = 1, limit = 50 } = filters;

    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (org_id) {
      whereConditions.push(`org_id = $${paramIndex}`);
      params.push(org_id);
      paramIndex++;
    }

    if (program_node_id) {
      whereConditions.push(`program_node_id = $${paramIndex}`);
      params.push(program_node_id);
      paramIndex++;
    }

    if (term_id) {
      whereConditions.push(`term_id = $${paramIndex}`);
      params.push(term_id);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const result = await query(
      `SELECT * FROM elective_groups 
       ${whereClause} 
       ORDER BY code 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, (page - 1) * limit]
    );

    return result.rows;
  } catch (error) {
    throw error;
  }
}

/**
 * Get elective group by ID with members
 */
export async function getElectiveGroupById(id) {
  try {
    const groupResult = await query('SELECT * FROM elective_groups WHERE id = $1', [id]);
    if (groupResult.rows.length === 0) {
      return null;
    }

    const group = groupResult.rows[0];

    // Get members
    const membersResult = await query(
      `SELECT 
         egm.*,
         sc.code as subject_code,
         sc.title as subject_title,
         sc.category as subject_category
       FROM elective_group_members egm
       JOIN subject_catalog sc ON egm.subject_id = sc.id
       WHERE egm.elective_group_id = $1
       ORDER BY sc.code`,
      [id]
    );

    return {
      ...group,
      members: membersResult.rows,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Update elective group
 */
export async function updateElectiveGroup(id, data) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined) {
        if (key === 'rules' && typeof data[key] === 'object') {
          fields.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(data[key]));
        } else {
          fields.push(`${key} = $${paramIndex}`);
          values.push(data[key]);
        }
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return await getElectiveGroupById(id);
    }

    values.push(id);

    const result = await query(
      `UPDATE elective_groups SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Elective group with this code already exists for this program and term');
    }
    throw error;
  }
}

/**
 * Add member to elective group
 */
export async function addElectiveGroupMember(electiveGroupId, subjectId) {
  try {
    const result = await query(
      `INSERT INTO elective_group_members (elective_group_id, subject_id)
       VALUES ($1, $2)
       RETURNING *`,
      [electiveGroupId, subjectId]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Subject is already a member of this elective group');
    }
    throw error;
  }
}

/**
 * Remove member from elective group
 */
export async function removeElectiveGroupMember(electiveGroupId, subjectId) {
  try {
    const result = await query(
      `DELETE FROM elective_group_members 
       WHERE elective_group_id = $1 AND subject_id = $2
       RETURNING *`,
      [electiveGroupId, subjectId]
    );

    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// SUBJECT OFFERINGS
// ============================================================================

/**
 * Create a new subject offering
 */
export async function createSubjectOffering(data) {
  try {
    const {
      org_id,
      cohort_id,
      subject_id,
      elective_group_id,
      is_compulsory = true,
      status = 'draft',
    } = data;

    const result = await query(
      `INSERT INTO subject_offerings (
        org_id, cohort_id, subject_id, elective_group_id, is_compulsory, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        org_id,
        cohort_id,
        subject_id || null,
        elective_group_id || null,
        is_compulsory,
        status,
      ]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Subject offering already exists for this cohort');
    }
    if (error.code === '23514') {
      throw new Error(`Invalid subject offering: ${error.message}`);
    }
    throw error;
  }
}

/**
 * List subject offerings with filters and pagination
 */
export async function listSubjectOfferings(filters = {}) {
  try {
    const {
      org_id,
      cohort_id,
      status,
      page = 1,
      limit = 50,
    } = filters;

    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (org_id) {
      whereConditions.push(`so.org_id = $${paramIndex}`);
      params.push(org_id);
      paramIndex++;
    }

    if (cohort_id) {
      whereConditions.push(`so.cohort_id = $${paramIndex}`);
      params.push(cohort_id);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`so.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const result = await query(
      `SELECT 
         so.*,
         sc.code as subject_code,
         sc.title as subject_title,
         sc.category as subject_category,
         eg.code as elective_group_code,
         eg.title as elective_group_title
       FROM subject_offerings so
       LEFT JOIN subject_catalog sc ON so.subject_id = sc.id
       LEFT JOIN elective_groups eg ON so.elective_group_id = eg.id
       ${whereClause} 
       ORDER BY so.created_at 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, (page - 1) * limit]
    );

    // Log raw database result
    console.log('[BACKEND] listSubjectOfferings: Retrieved from database:', {
      filters,
      rowCount: result.rows.length,
      sampleRows: result.rows.slice(0, 3).map(row => ({
        id: row.id,
        cohort_id: row.cohort_id,
        subject_id: row.subject_id,
        elective_group_id: row.elective_group_id,
        category: row.category,
        subject_code: row.subject_code,
        subject_title: row.subject_title,
        subject_category: row.subject_category,
        elective_group_code: row.elective_group_code,
        elective_group_title: row.elective_group_title,
        nullFields: Object.keys(row).filter(key => row[key] === null || row[key] === undefined),
      })),
    });

    return result.rows;
  } catch (error) {
    throw error;
  }
}

/**
 * Get subject offering by ID
 */
export async function getSubjectOfferingById(id) {
  try {
    const result = await query(
      `SELECT 
         so.*,
         sc.code as subject_code,
         sc.title as subject_title,
         sc.category as subject_category,
         eg.code as elective_group_code,
         eg.title as elective_group_title
       FROM subject_offerings so
       LEFT JOIN subject_catalog sc ON so.subject_id = sc.id
       LEFT JOIN elective_groups eg ON so.elective_group_id = eg.id
       WHERE so.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Bulk create subject offerings
 */
export async function bulkCreateSubjectOfferings(cohortId, offerings) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const created = [];
    for (const offering of offerings) {
      const {
        org_id,
        subject_id,
        elective_group_id,
        is_compulsory = true,
        status = 'draft',
      } = offering;

      const result = await client.query(
        `INSERT INTO subject_offerings (
          org_id, cohort_id, subject_id, elective_group_id, is_compulsory, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          org_id,
          cohortId,
          subject_id || null,
          elective_group_id || null,
          is_compulsory,
          status,
        ]
      );

      created.push(result.rows[0]);
    }

    await client.query('COMMIT');
    return created;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      throw new Error('One or more subject offerings already exist for this cohort');
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update subject offering
 */
export async function updateSubjectOffering(id, data) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return await getSubjectOfferingById(id);
    }

    values.push(id);

    const result = await query(
      `UPDATE subject_offerings SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Subject offering already exists for this cohort');
    }
    if (error.code === '23514') {
      throw new Error(`Invalid subject offering: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Publish subject offerings for a cohort
 */
export async function publishSubjectOfferings(cohortId) {
  try {
    const result = await query(
      `UPDATE subject_offerings SET status = 'published' WHERE cohort_id = $1 RETURNING *`,
      [cohortId]
    );
    return result.rows;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// TEACHER ASSIGNMENTS
// ============================================================================

/**
 * Create a new teacher assignment
 */
export async function createTeacherAssignment(data) {
  try {
    const { org_id, subject_offering_id, teacher_id, load = {} } = data;

    const result = await query(
      `INSERT INTO teacher_assignments (org_id, subject_offering_id, teacher_id, load)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [org_id, subject_offering_id, teacher_id, JSON.stringify(load)]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Teacher is already assigned to this subject offering');
    }
    throw error;
  }
}

/**
 * List teacher assignments with filters
 */
export async function listTeacherAssignments(filters = {}) {
  try {
    const { org_id, subject_offering_id, teacher_id, page = 1, limit = 50 } = filters;

    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (org_id) {
      whereConditions.push(`ta.org_id = $${paramIndex}`);
      params.push(org_id);
      paramIndex++;
    }

    if (subject_offering_id) {
      whereConditions.push(`ta.subject_offering_id = $${paramIndex}`);
      params.push(subject_offering_id);
      paramIndex++;
    }

    if (teacher_id) {
      whereConditions.push(`ta.teacher_id = $${paramIndex}`);
      params.push(teacher_id);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const result = await query(
      `SELECT 
         ta.*,
         u.email as teacher_email,
         so.cohort_id,
         sc.title as subject_title,
         eg.title as elective_group_title
       FROM teacher_assignments ta
       JOIN users u ON ta.teacher_id = u.id
       JOIN subject_offerings so ON ta.subject_offering_id = so.id
       LEFT JOIN subject_catalog sc ON so.subject_id = sc.id
       LEFT JOIN elective_groups eg ON so.elective_group_id = eg.id
       ${whereClause} 
       ORDER BY ta.created_at 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, (page - 1) * limit]
    );

    return result.rows;
  } catch (error) {
    throw error;
  }
}

/**
 * Update teacher assignment
 */
export async function updateTeacherAssignment(id, data) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined) {
        if (key === 'load' && typeof data[key] === 'object') {
          fields.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(data[key]));
        } else {
          fields.push(`${key} = $${paramIndex}`);
          values.push(data[key]);
        }
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      const result = await query('SELECT * FROM teacher_assignments WHERE id = $1', [id]);
      return result.rows[0] || null;
    }

    values.push(id);

    const result = await query(
      `UPDATE teacher_assignments SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Remove teacher assignment
 */
export async function removeTeacherAssignment(id) {
  try {
    const result = await query(
      'DELETE FROM teacher_assignments WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
}


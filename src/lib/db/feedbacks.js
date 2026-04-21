/**
 * Feedbacks DB Utilities
 * 
 * CRUD operations for website feedback submissions.
 * Includes filtering, pagination, and search functionality.
 */

import { query, getClient } from './index.js';

/**
 * Create new feedback
 */
export async function createFeedback(feedbackData) {
	const client = await getClient();
	try {
		await client.query('BEGIN');

		const insertRes = await client.query(
			`INSERT INTO feedbacks
			(user_id, user_role, message, rating, category, status)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING *`,
			[
				feedbackData.user_id,
				feedbackData.user_role,
				feedbackData.message ?? null,
				feedbackData.rating ?? null, // emotion stored as rating
				feedbackData.category ?? null,
				feedbackData.status ?? 'pending',
			]
		);

		await client.query('COMMIT');
		return { success: true, feedback: insertRes.rows[0] };
	} catch (error) {
		await client.query('ROLLBACK');
		return { success: false, error: error.message || 'Failed to create feedback' };
	} finally {
		client.release();
	}
}

/**
 * Build filters WHERE clause
 */
function buildFilters(filters = {}) {
	const clauses = [];
	const params = [];
	let idx = 1;

	const add = (sql, val) => {
		const replaced = sql.replace(/\$\?/g, `$${idx}`);
		clauses.push(replaced);
		params.push(val);
		idx++;
	};

	// Status filter
	if (filters.status) {
		add('f.status = $?', filters.status);
	}

	// Category filter
	if (filters.category) {
		add('f.category = $?', filters.category);
	}

	// User role filter
	if (filters.role) {
		add('f.user_role = $?', filters.role);
	}

	// Date range filters
	if (filters.from) {
		add('f.created_at >= $?', filters.from);
	}

	if (filters.to) {
		add('f.created_at <= $?', filters.to);
	}

	// Search query (searches message)
	if (filters.q) {
		const searchTerm = `%${filters.q}%`;
		clauses.push(`f.message ILIKE $${idx}`);
		params.push(searchTerm);
		idx++;
	}

	const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
	return { where, params };
}

/**
 * List feedbacks with pagination and sorting
 */
export async function listFeedbacks(filters = {}, pagination = {}, sort = {}) {
	try {
		const { page = 1, limit = 20 } = pagination;
		const offset = (Math.max(1, page) - 1) * Math.max(1, limit);

		const { where, params } = buildFilters(filters);

		// Sorting
		const sortable = new Set(['created_at', 'updated_at', 'status', 'rating']);
		const orderBy = sortable.has((sort.by || '').toLowerCase()) ? sort.by.toLowerCase() : 'created_at';
		const dir = (String(sort.dir || 'desc').toLowerCase() === 'asc') ? 'asc' : 'desc';

		// Build SQL with proper parameterized queries
		const listSql = `
			SELECT f.*
			FROM feedbacks f
			${where}
			ORDER BY f.${orderBy} ${dir}
			LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

		const totalSql = `SELECT COUNT(*)::int AS total FROM feedbacks f ${where}`;

		// Add limit and offset to params for listSql
		const listParams = [...params, Math.max(1, limit), offset];

		const [listRes, totalRes] = await Promise.all([
			query(listSql, listParams),
			query(totalSql, params),
		]);

		return {
			success: true,
			feedbacks: listRes.rows,
			pagination: {
				page: Math.max(1, page),
				limit: Math.max(1, limit),
				total: totalRes.rows[0].total,
				pages: Math.ceil(totalRes.rows[0].total / Math.max(1, limit)),
			},
		};
	} catch (error) {
		return { success: false, error: error.message || 'Failed to list feedbacks' };
	}
}

/**
 * Get feedback by ID
 */
export async function getFeedbackById(id) {
	try {
		const res = await query(
			`SELECT f.*
			 FROM feedbacks f
			 WHERE f.id = $1`,
			[id]
		);
		if (res.rowCount === 0) {
			return { success: false, error: 'Feedback not found' };
		}
		return { success: true, feedback: res.rows[0] };
	} catch (error) {
		return { success: false, error: error.message || 'Failed to load feedback' };
	}
}

/**
 * Update feedback (status, admin_notes, reviewed_by, reviewed_at)
 */
export async function updateFeedback(id, updates) {
	const client = await getClient();
	try {
		await client.query('BEGIN');

		// Build dynamic update
		const fields = [];
		const params = [];
		let idx = 1;

		const setIf = (col, val) => {
			if (val !== undefined) {
				fields.push(`${col} = $${idx++}`);
				params.push(val);
			}
		};

		setIf('status', updates.status);
		setIf('admin_notes', updates.admin_notes);
		setIf('reviewed_by', updates.reviewed_by);
		
		// Set reviewed_at if status is being updated to reviewed/resolved
		if (updates.status && (updates.status === 'reviewed' || updates.status === 'resolved')) {
			if (!updates.reviewed_at) {
				fields.push(`reviewed_at = $${idx++}`);
				params.push(new Date().toISOString());
			} else {
				setIf('reviewed_at', updates.reviewed_at);
			}
		}

		if (fields.length === 0) {
			await client.query('ROLLBACK');
			return { success: false, error: 'No fields to update' };
		}

		params.push(id);
		await client.query(
			`UPDATE feedbacks SET ${fields.join(', ')} WHERE id = $${idx}`,
			params
		);

		// Fetch updated feedback
		const updatedRes = await client.query(
			`SELECT * FROM feedbacks WHERE id = $1`,
			[id]
		);

		await client.query('COMMIT');
		return { success: true, feedback: updatedRes.rows[0] };
	} catch (error) {
		await client.query('ROLLBACK');
		return { success: false, error: error.message || 'Failed to update feedback' };
	} finally {
		client.release();
	}
}

/**
 * Export feedbacks (for CSV/XLSX generation)
 */
export async function exportFeedbacks(filters = {}) {
	try {
		const { where, params } = buildFilters(filters);

		const exportSql = `
			SELECT 
				f.id,
				f.user_id,
				f.user_role,
				f.message,
				f.rating,
				f.category,
				f.status,
				f.admin_notes,
				f.reviewed_by,
				f.reviewed_at,
				f.created_at,
				f.updated_at
			FROM feedbacks f
			${where}
			ORDER BY f.created_at DESC`;

		const res = await query(exportSql, params);
		return { success: true, feedbacks: res.rows };
	} catch (error) {
		return { success: false, error: error.message || 'Failed to export feedbacks' };
	}
}


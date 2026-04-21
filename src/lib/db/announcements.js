/**
 * Announcements DB Utilities
 * 
 * CRUD + list/search with parameterized queries and transactions.
 * Includes attachments and targets handling.
 */

import { query, getClient } from './index.js';

/**
 * Insert attachments for an announcement
 */
async function insertAttachments(client, announcementId, attachments = []) {
	if (!attachments || attachments.length === 0) return;
	const values = [];
	const placeholders = [];
	let idx = 1;
	for (const a of attachments) {
		values.push(announcementId, a.key, a.url, a.content_type, a.bytes ?? null, a.checksum ?? null);
		placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
	}
	await client.query(
		`INSERT INTO announcement_attachments
		(announcement_id, key, url, content_type, bytes, checksum)
		VALUES ${placeholders.join(', ')}`,
		values
	);
}

/**
 * Insert targets for an announcement
 */
async function insertTargets(client, announcementId, targets = []) {
	if (!targets || targets.length === 0) return;
	const values = [];
	const placeholders = [];
	let idx = 1;
	for (const t of targets) {
		values.push(announcementId, t.target_role ?? null, t.target_class_id ?? null, t.target_class_label ?? null);
		placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++})`);
	}
	await client.query(
		`INSERT INTO announcement_targets
		(announcement_id, target_role, target_class_id, target_class_label)
		VALUES ${placeholders.join(', ')}`,
		values
	);
}

/**
 * Create announcement (with attachments and targets)
 */
export async function createAnnouncement(data, attachments = [], targets = []) {
	const client = await getClient();
	try {
		await client.query('BEGIN');

		const insertRes = await client.query(
			`INSERT INTO announcements
			(org_id, created_by_user_id, visibility, title, message, category, priority,
			 show_on_homepage, pin_to_dashboard, send_notification, status, start_at, end_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
			RETURNING *`,
			[
				data.org_id ?? null,
				data.created_by_user_id,
				data.visibility,
				data.title,
				data.message,
				data.category,
				data.priority,
				!!data.show_on_homepage,
				!!data.pin_to_dashboard,
				!!data.send_notification,
				data.status ?? 'active',
				data.start_at,
				data.end_at ?? null,
			]
		);
		const announcement = insertRes.rows[0];

		await insertAttachments(client, announcement.id, attachments);
		await insertTargets(client, announcement.id, targets);

		const full = await client.query(
			`SELECT a.*,
			        COALESCE(json_agg(DISTINCT aa) FILTER (WHERE aa.id IS NOT NULL), '[]') AS attachments,
			        COALESCE(json_agg(DISTINCT atg) FILTER (WHERE atg.id IS NOT NULL), '[]') AS targets
			 FROM announcements a
			 LEFT JOIN announcement_attachments aa ON aa.announcement_id = a.id
			 LEFT JOIN announcement_targets atg ON atg.announcement_id = a.id
			 WHERE a.id = $1
			 GROUP BY a.id`,
			[announcement.id]
		);

		await client.query('COMMIT');
		return { success: true, announcement: full.rows[0] };
	} catch (error) {
		await client.query('ROLLBACK');
		return { success: false, error: error.message || 'Failed to create announcement' };
	} finally {
		client.release();
	}
}

/**
 * Update announcement (replace attachments/targets)
 */
export async function updateAnnouncement(id, data = {}, attachments = null, targets = null) {
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

		setIf('org_id', data.org_id ?? null);
		setIf('visibility', data.visibility);
		setIf('title', data.title);
		setIf('message', data.message);
		setIf('category', data.category);
		setIf('priority', data.priority);
		setIf('show_on_homepage', data.show_on_homepage === undefined ? undefined : !!data.show_on_homepage);
		setIf('pin_to_dashboard', data.pin_to_dashboard === undefined ? undefined : !!data.pin_to_dashboard);
		setIf('send_notification', data.send_notification === undefined ? undefined : !!data.send_notification);
		setIf('status', data.status);
		setIf('start_at', data.start_at);
		setIf('end_at', data.end_at ?? null);

		if (fields.length > 0) {
			params.push(id);
			await client.query(`UPDATE announcements SET ${fields.join(', ')} WHERE id = $${idx}`, params);
		}

		// Replace attachments if provided
		if (Array.isArray(attachments)) {
			await client.query('DELETE FROM announcement_attachments WHERE announcement_id = $1', [id]);
			await insertAttachments(client, id, attachments);
		}

		// Replace targets if provided
		if (Array.isArray(targets)) {
			await client.query('DELETE FROM announcement_targets WHERE announcement_id = $1', [id]);
			await insertTargets(client, id, targets);
		}

		const full = await client.query(
			`SELECT a.*,
			        COALESCE(json_agg(DISTINCT aa) FILTER (WHERE aa.id IS NOT NULL), '[]') AS attachments,
			        COALESCE(json_agg(DISTINCT atg) FILTER (WHERE atg.id IS NOT NULL), '[]') AS targets
			 FROM announcements a
			 LEFT JOIN announcement_attachments aa ON aa.announcement_id = a.id
			 LEFT JOIN announcement_targets atg ON atg.announcement_id = a.id
			 WHERE a.id = $1
			 GROUP BY a.id`,
			[id]
		);

		await client.query('COMMIT');
		return { success: true, announcement: full.rows[0] };
	} catch (error) {
		await client.query('ROLLBACK');
		return { success: false, error: error.message || 'Failed to update announcement' };
	} finally {
		client.release();
	}
}

/**
 * Soft delete announcement (status = inactive)
 */
export async function deleteAnnouncement(id) {
	try {
		await query(`UPDATE announcements SET status = 'inactive' WHERE id = $1`, [id]);
		return { success: true };
	} catch (error) {
		return { success: false, error: error.message || 'Failed to delete announcement' };
	}
}

/**
 * Get announcement by ID (with attachments and targets)
 */
export async function getAnnouncementById(id) {
	try {
		const res = await query(
			`SELECT a.*,
			        COALESCE(json_agg(DISTINCT aa) FILTER (WHERE aa.id IS NOT NULL), '[]') AS attachments,
			        COALESCE(json_agg(DISTINCT atg) FILTER (WHERE atg.id IS NOT NULL), '[]') AS targets
			 FROM announcements a
			 LEFT JOIN announcement_attachments aa ON aa.announcement_id = a.id
			 LEFT JOIN announcement_targets atg ON atg.announcement_id = a.id
			 WHERE a.id = $1
			 GROUP BY a.id`,
			[id]
		);
		if (res.rowCount === 0) return { success: false, error: 'Announcement not found' };
		return { success: true, announcement: res.rows[0] };
	} catch (error) {
		return { success: false, error: error.message || 'Failed to load announcement' };
	}
}

/**
 * Build filters WHERE clause
 */
function buildFilters(filters = {}) {
	// console.log('🟡 [DB] [Announcements] buildFilters called with:', filters);
	const clauses = [];
	const params = [];
	let idx = 1;

	const add = (sql, val) => { 
		// Replace $? with $1, $2, etc. for PostgreSQL parameterized queries
		const replaced = sql.replace(/\$\?/g, `$${idx}`);
		// console.log('🟡 [DB] [Announcements] add() - Original SQL:', sql, 'Replaced:', replaced, 'Param idx:', idx);
		clauses.push(replaced);
		params.push(val);
		idx++;
	};

	// Role-based filtering logic:
	// 1. If org_id available and created by admin: Only show to admin of that org (NOT superadmin)
	// 2. If org_id is null: Only show to superadmin (NOT admin)
	// 3. If org_id available and created by superadmin: Show to BOTH admin (of that org) AND superadmin
	
	const currentUserRole = filters.currentUserRole; // 'admin', 'instructor', 'vendor', 'student', 'parent', 'alumni', or 'superadmin'
	const currentUserOrgId = filters.org_id; // org_id for non-superadmin users
	
	// All roles except superadmin should see announcements for their org
	if (currentUserRole === 'admin' || currentUserRole === 'instructor' || currentUserRole === 'vendor' || 
	    currentUserRole === 'student' || currentUserRole === 'parent' || currentUserRole === 'alumni') {
		// Admin, Instructor, Vendor, Student, Parent, Alumni users: 
		// - See all announcements where org_id = their_org (regardless of creator role)
		// - Do NOT see announcements where org_id IS NULL
		if (currentUserOrgId) {
			const orgParamIdx = idx;
			params.push(currentUserOrgId);
			idx++;
			clauses.push(`a.org_id = $${orgParamIdx}`);
			// console.log('🟡 [DB] [Announcements] Added org user filter: org_id =', currentUserOrgId, '(all announcements in org)');
		} else {
			// Users without org_id should see nothing
			clauses.push('1 = 0'); // Always false condition
			// console.log('🟡 [DB] [Announcements] User without org_id - no announcements');
		}
	} else if (currentUserRole === 'superadmin') {
		// Superadmin users:
		// - See announcements where (org_id IS NULL) 
		//   OR (creator_role = 'superadmin')
		// - Do NOT see announcements where org_id is set AND creator_role = 'admin'
		clauses.push(`(
			a.org_id IS NULL
			OR
			EXISTS (SELECT 1 FROM users u WHERE u.id = a.created_by_user_id AND u.role = 'superadmin')
		)`);
		// console.log('🟡 [DB] [Announcements] Added superadmin filter: (org_id IS NULL OR creator is superadmin)');
	} else {
		// Fallback: if no role specified, use old logic
		if (filters.org_id !== null && filters.org_id !== undefined) {
			add('a.org_id = $?', filters.org_id);
			// console.log('🟡 [DB] [Announcements] Added org_id filter (fallback):', filters.org_id);
		} else {
			// console.log('🟡 [DB] [Announcements] No org_id filter (org_id is null/undefined)');
		}
	}
	
	if (filters.visibility) { add('a.visibility = $?', filters.visibility); }
	if (filters.status) { add('a.status = $?', filters.status); }
	if (filters.category) { add('a.category = $?', filters.category); }
	if (filters.priority) { add('a.priority = $?', filters.priority); }
	if (filters.from) { add('a.start_at >= $?', filters.from); }
	if (filters.to) { add('COALESCE(a.end_at, a.start_at) <= $?', filters.to); }
	if (filters.activeWindow === true) {
		// For marquee: Show announcements that are:
		// 1. Currently active (started and not ended), OR
		// 2. Scheduled to start (start_at in the future, but end_at not passed)
		// This allows scheduled announcements to appear in the marquee
		clauses.push(`(a.end_at IS NULL OR now() <= a.end_at)`);
		// console.log('🟡 [DB] [Announcements] Added activeWindow filter: (end_at IS NULL OR now() <= end_at) - allowing scheduled announcements');
	}

	const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
	// console.log('🟡 [DB] [Announcements] Built WHERE clause:', where);
	// console.log('🟡 [DB] [Announcements] Built params:', params);
	return { where, params };
}

/**
 * List announcements with pagination and sorting
 */
export async function listAnnouncements(filters = {}, pagination = {}, sort = {}) {
	try {
		const { page = 1, limit = 20 } = pagination;
		const offset = (Math.max(1, page) - 1) * Math.max(1, limit);

		const { where, params } = buildFilters(filters);

		// Sorting
		const sortable = new Set(['created_at', 'updated_at', 'start_at', 'priority', 'title']);
		const orderBy = sortable.has((sort.by || '').toLowerCase()) ? sort.by.toLowerCase() : 'created_at';
		const dir = (String(sort.dir || 'desc').toLowerCase() === 'asc') ? 'asc' : 'desc';

		// Build SQL with proper parameterized queries
		// Include attachments and targets for marquee display
		const listSql = `
			SELECT a.*,
			       COALESCE(json_agg(DISTINCT aa) FILTER (WHERE aa.id IS NOT NULL), '[]') AS attachments,
			       COALESCE(json_agg(DISTINCT atg) FILTER (WHERE atg.id IS NOT NULL), '[]') AS targets
			FROM announcements a
			LEFT JOIN announcement_attachments aa ON aa.announcement_id = a.id
			LEFT JOIN announcement_targets atg ON atg.announcement_id = a.id
			${where}
			GROUP BY a.id
			ORDER BY a.${orderBy} ${dir}
			LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

		const totalSql = `SELECT COUNT(DISTINCT a.id)::int AS total FROM announcements a ${where}`;
		
		// Add limit and offset to params for listSql
		const listParams = [...params, Math.max(1, limit), offset];

		// console.log('🟡 [DB] [Announcements] Executing listSql:', listSql);
		// console.log('🟡 [DB] [Announcements] List params:', listParams);
		// console.log('🟡 [DB] [Announcements] Executing totalSql:', totalSql);
		// console.log('🟡 [DB] [Announcements] Total params:', params);
		
		const [listRes, totalRes] = await Promise.all([
			query(listSql, listParams),
			query(totalSql, params),
		]);
		
		// console.log('🟡 [DB] [Announcements] List result count:', listRes.rows.length);
		// console.log('🟡 [DB] [Announcements] Total count:', totalRes.rows[0].total);
		
		// Debug: If no results and activeWindow is true, check what announcements exist
		if (listRes.rows.length === 0 && filters.activeWindow === true) {
			// console.log('🔴 [DB] [Announcements] No results with activeWindow filter. Checking all announcements for this org...');
			const debugSql = `
				SELECT a.id, a.title, a.status, a.start_at, a.end_at, a.org_id,
				       u.role as creator_role
				FROM announcements a
				LEFT JOIN users u ON u.id = a.created_by_user_id
				WHERE a.org_id = $1
				ORDER BY a.created_at DESC
				LIMIT 5
			`;
			const debugRes = await query(debugSql, [filters.org_id]);
			// console.log('🔴 [DB] [Announcements] Debug - All announcements for org:', debugRes.rows);
			if (debugRes.rows.length > 0) {
				const now = new Date();
				debugRes.rows.forEach(ann => {
					const startAt = ann.start_at ? new Date(ann.start_at) : null;
					const endAt = ann.end_at ? new Date(ann.end_at) : null;
					// console.log('🔴 [DB] [Announcements] Debug announcement:', {
					// 	id: ann.id,
					// 	title: ann.title,
					// 	status: ann.status,
					// 	start_at: ann.start_at,
					// 	end_at: ann.end_at,
					// 	creator_role: ann.creator_role,
					// 	now: now.toISOString(),
					// 	startAtValid: startAt ? (now >= startAt) : 'N/A',
					// 	endAtValid: endAt ? (now <= endAt) : (ann.end_at === null ? 'NULL (valid)' : 'N/A'),
					// });
				});
			}
		}

		return {
			success: true,
			announcements: listRes.rows,
			pagination: {
				page: Math.max(1, page),
				limit: Math.max(1, limit),
				total: totalRes.rows[0].total,
				pages: Math.ceil(totalRes.rows[0].total / Math.max(1, limit)),
			},
		};
	} catch (error) {
		return { success: false, error: error.message || 'Failed to list announcements' };
	}
}

/**
 * Full-text search using search_tsv
 */
export async function searchAnnouncements(q, options = {}) {
	try {
		const { limit = 20, page = 1, filters = {} } = options;
		const offset = (Math.max(1, page) - 1) * Math.max(1, limit);

		// Use the same buildFilters function which includes role-based filtering
		const { where, params } = buildFilters(filters);
		const allParams = [...params];
		const qIdx = allParams.length + 1;

		const sql = `
			SELECT a.*
			FROM announcements a
			${where ? where + ' AND' : 'WHERE'} a.search_tsv @@ plainto_tsquery('simple', $${qIdx})
			ORDER BY a.created_at DESC
			LIMIT ${Math.max(1, limit)} OFFSET ${offset}`;

		const totalSql = `
			SELECT COUNT(*)::int AS total
			FROM announcements a
			${where ? where + ' AND' : 'WHERE'} a.search_tsv @@ plainto_tsquery('simple', $${qIdx})`;

		allParams.push(q);
		const [listRes, totalRes] = await Promise.all([
			query(sql, allParams),
			query(totalSql, allParams),
		]);

		return {
			success: true,
			announcements: listRes.rows,
			pagination: {
				page: Math.max(1, page),
				limit: Math.max(1, limit),
				total: totalRes.rows[0].total,
				pages: Math.ceil(totalRes.rows[0].total / Math.max(1, limit)),
			},
		};
	} catch (error) {
		return { success: false, error: error.message || 'Failed to search announcements' };
	}
}

export default {
	createAnnouncement,
	updateAnnouncement,
	deleteAnnouncement,
	getAnnouncementById,
	listAnnouncements,
	searchAnnouncements,
};



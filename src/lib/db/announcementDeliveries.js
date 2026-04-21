/**
 * Announcement Deliveries DB Utilities
 * Queue and track delivery attempts per channel.
 */

import { query } from './index.js';

export async function queueDelivery(announcementId, channel) {
	try {
		const res = await query(
			`INSERT INTO announcement_deliveries (announcement_id, channel, status)
			 VALUES ($1, $2, 'queued')
			 RETURNING *`,
			[announcementId, channel]
		);
		return { success: true, delivery: res.rows[0] };
	} catch (error) {
		return { success: false, error: error.message || 'Failed to queue delivery' };
	}
}

export async function markDeliverySent(id) {
	try {
		const res = await query(
			`UPDATE announcement_deliveries
			 SET status = 'sent', sent_at = CURRENT_TIMESTAMP, error = NULL
			 WHERE id = $1
			 RETURNING *`,
			[id]
		);
		return { success: true, delivery: res.rows[0] };
	} catch (error) {
		return { success: false, error: error.message || 'Failed to mark delivery as sent' };
	}
}

export async function markDeliveryFailed(id, errorMessage) {
	try {
		const res = await query(
			`UPDATE announcement_deliveries
			 SET status = 'failed', error = $2
			 WHERE id = $1
			 RETURNING *`,
			[id, errorMessage?.toString()?.substring(0, 1000) || 'Unknown error']
		);
		return { success: true, delivery: res.rows[0] };
	} catch (error) {
		return { success: false, error: error.message || 'Failed to mark delivery as failed' };
	}
}

export default {
	queueDelivery,
	markDeliverySent,
	markDeliveryFailed,
};



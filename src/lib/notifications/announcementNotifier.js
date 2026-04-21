/**
 * Announcement Notification Notifier (lightweight queue)
 * 
 * Queues delivery rows and attempts non-blocking send (stub).
 * Replace with real channels (email/SMS/push) in production.
 */

import { queueDelivery, markDeliveryFailed, markDeliverySent } from '@/lib/db/announcementDeliveries.js';

const DEFAULT_CHANNELS = ['web']; // extend to: ['web','email','push','sms']

/**
 * Queue deliveries for announcement
 * @param {string} announcementId
 * @param {string[]} channels
 */
export async function queueAnnouncementDeliveries(announcementId, channels = DEFAULT_CHANNELS) {
	try {
		const promises = channels.map((ch) => queueDelivery(announcementId, ch));
		const res = await Promise.allSettled(promises);

		// Kick off non-blocking attempt to mark sent (stub)
		res.forEach((r) => {
			if (r.status === 'fulfilled' && r.value?.success && r.value.delivery?.id) {
				const id = r.value.delivery.id;
				// simulate async send with small delay and best-effort handling
				setTimeout(async () => {
					try {
						await markDeliverySent(id);
					} catch (e) {
						await markDeliveryFailed(id, e.message || 'send failed');
					}
				}, 10);
			}
		});
	} catch (error) {
		// Best-effort: do not throw
		console.error('queueAnnouncementDeliveries error:', error);
	}
}

export default { queueAnnouncementDeliveries };



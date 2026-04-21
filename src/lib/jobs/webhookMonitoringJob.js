/**
 * Webhook Monitoring Job
 * 
 * Monitors webhook processing status and sends alerts for stuck/failed webhooks
 */

import { query } from '@/lib/db/index.js';

/**
 * Monitor webhook processing status
 * @returns {Promise<Object>} Monitoring results
 */
export default async function monitorWebhooks() {
  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    // Find failed webhooks older than 5 minutes
    const failedWebhooksResult = await query(
      `SELECT id, event_id, event_type, status, error_message, created_at, retry_count
       FROM webhook_logs
       WHERE status = 'failed'
         AND created_at <= $1
         AND retry_count < 3
       ORDER BY created_at DESC
       LIMIT 100`,
      [fiveMinutesAgo]
    );

    // Find stuck webhooks (pending for more than 10 minutes)
    const stuckWebhooksResult = await query(
      `SELECT id, event_id, event_type, status, created_at, retry_count
       FROM webhook_logs
       WHERE status = 'pending'
         AND created_at <= $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [tenMinutesAgo]
    );

    const failedWebhooks = failedWebhooksResult.rows;
    const stuckWebhooks = stuckWebhooksResult.rows;

    // Get webhook statistics
    const statsResult = await query(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'processed') as processed,
         COUNT(*) FILTER (WHERE status = 'failed') as failed,
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24h
       FROM webhook_logs`
    );

    const stats = statsResult.rows[0];

    // Create alerts for superadmins if needed
    const alerts = [];

    if (failedWebhooks.length > 0) {
      alerts.push({
        type: 'failed_webhooks',
        severity: 'high',
        count: failedWebhooks.length,
        message: `${failedWebhooks.length} webhook(s) failed and need attention`,
        webhooks: failedWebhooks.map(w => ({
          id: w.id,
          eventId: w.event_id,
          eventType: w.event_type,
          error: w.error_message,
          createdAt: w.created_at,
        })),
      });
    }

    if (stuckWebhooks.length > 0) {
      alerts.push({
        type: 'stuck_webhooks',
        severity: 'medium',
        count: stuckWebhooks.length,
        message: `${stuckWebhooks.length} webhook(s) stuck in pending status`,
        webhooks: stuckWebhooks.map(w => ({
          id: w.id,
          eventId: w.event_id,
          eventType: w.event_type,
          createdAt: w.created_at,
        })),
      });
    }

    // Send notifications to superadmins if there are critical issues
    if (alerts.length > 0) {
      // Get all superadmin users
      const superadminsResult = await query(
        `SELECT id, email FROM users WHERE role = 'superadmin' AND status = 'active'`
      );

      const superadmins = superadminsResult.rows;

      // Create notifications for superadmins
      for (const admin of superadmins) {
        for (const alert of alerts) {
          await query(
            `INSERT INTO notifications (user_id, type, title, message, data)
             VALUES ($1, 'webhook_alert', $2, $3, $4::jsonb)
             ON CONFLICT DO NOTHING`,
            [
              admin.id,
              `Webhook Alert: ${alert.type}`,
              alert.message,
              JSON.stringify({
                alertType: alert.type,
                severity: alert.severity,
                count: alert.count,
                webhooks: alert.webhooks,
                stats: {
                  total: parseInt(stats.total, 10),
                  processed: parseInt(stats.processed, 10),
                  failed: parseInt(stats.failed, 10),
                  pending: parseInt(stats.pending, 10),
                  last24h: parseInt(stats.last_24h, 10),
                },
              }),
            ]
          ).catch(err => console.error('Failed to create webhook alert notification:', err));
        }
      }
    }

    return {
      timestamp: now.toISOString(),
      stats: {
        total: parseInt(stats.total, 10),
        processed: parseInt(stats.processed, 10),
        failed: parseInt(stats.failed, 10),
        pending: parseInt(stats.pending, 10),
        last24h: parseInt(stats.last_24h, 10),
        successRate: stats.total > 0 
          ? ((parseInt(stats.processed, 10) / parseInt(stats.total, 10)) * 100).toFixed(2)
          : '0.00',
      },
      alerts,
      failedWebhooksCount: failedWebhooks.length,
      stuckWebhooksCount: stuckWebhooks.length,
    };
  } catch (error) {
    console.error('Webhook monitoring job error:', error);
    throw error;
  }
}


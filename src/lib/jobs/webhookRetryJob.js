/**
 * Webhook Retry Job
 * 
 * Retries failed webhook events with exponential backoff
 */

import { query } from '@/lib/db/index.js';
import { getRazorpayService } from '@/lib/services/razorpay/RazorpayService.js';
import * as webhookHandlers from '@/lib/services/razorpay/webhookHandlers.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_BASE = 60; // 1 minute base delay

/**
 * Retry failed webhooks
 * @param {number} batchSize - Number of webhooks to process per run
 * @returns {Promise<Object>} Retry results
 */
export async function retryFailedWebhooks(batchSize = 10) {
  try {
    // Get failed webhooks that haven't exceeded max retries
    const failedWebhooksResult = await query(
      `SELECT * FROM webhook_logs
       WHERE status = 'failed'
         AND retry_count < $1
         AND (last_retry_at IS NULL OR last_retry_at < NOW() - INTERVAL '${RETRY_DELAY_BASE} minutes' * (2 ^ retry_count))
       ORDER BY created_at ASC
       LIMIT $2`,
      [MAX_RETRIES, batchSize]
    );

    const failedWebhooks = failedWebhooksResult.rows;
    const results = [];

    for (const webhook of failedWebhooks) {
      try {
        // Parse payload
        const payload = typeof webhook.payload === 'string' 
          ? JSON.parse(webhook.payload) 
          : webhook.payload;

        // Re-verify signature if available
        let signatureValid = true;
        if (webhook.signature) {
          const razorpayService = getRazorpayService();
          try {
            signatureValid = razorpayService.verifyWebhookSignature(
              webhook.payload,
              webhook.signature
            );
          } catch (error) {
            console.warn(`Signature verification failed for webhook ${webhook.id}:`, error);
            // Continue with retry even if signature verification fails
          }
        }

        // Create event object
        const event = {
          id: webhook.event_id,
          event: webhook.event_type,
          payload,
          signature: webhook.signature,
        };

        // Route to appropriate handler
        let handler;
        switch (webhook.event_type) {
          case 'payment.captured':
            handler = webhookHandlers.handlePaymentCaptured;
            break;
          case 'payment.failed':
            handler = webhookHandlers.handlePaymentFailed;
            break;
          case 'order.paid':
            handler = webhookHandlers.handleOrderPaid;
            break;
          case 'refund.succeeded':
            handler = webhookHandlers.handleRefundSucceeded;
            break;
          case 'settlement.processed':
            handler = webhookHandlers.handleSettlementProcessed;
            break;
          case 'payout.processed':
            handler = webhookHandlers.handlePayoutProcessed;
            break;
          default:
            console.warn(`No handler for event type: ${webhook.event_type}`);
            continue;
        }

        // Retry handler
        await handler(event);

        // Mark as processed
        await query(
          `UPDATE webhook_logs
           SET status = 'processed', processed_at = CURRENT_TIMESTAMP, error_message = NULL
           WHERE id = $1`,
          [webhook.id]
        );

        results.push({
          webhookId: webhook.id,
          eventId: webhook.event_id,
          eventType: webhook.event_type,
          status: 'success',
        });
      } catch (error) {
        console.error(`Error retrying webhook ${webhook.id}:`, error);
        
        // Update retry count
        await query(
          `UPDATE webhook_logs
           SET retry_count = retry_count + 1,
               last_retry_at = CURRENT_TIMESTAMP,
               error_message = $1
           WHERE id = $2`,
          [error.message, webhook.id]
        );

        results.push({
          webhookId: webhook.id,
          eventId: webhook.event_id,
          eventType: webhook.event_type,
          status: 'failed',
          error: error.message,
          retryCount: webhook.retry_count + 1,
        });
      }
    }

    return {
      processed: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    };
  } catch (error) {
    console.error('retryFailedWebhooks error:', error);
    throw new Error(`Failed to retry webhooks: ${error.message}`);
  }
}

export default retryFailedWebhooks;


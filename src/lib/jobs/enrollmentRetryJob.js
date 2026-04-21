/**
 * Enrollment Retry Job
 * 
 * Processes paid orders without corresponding enrollments/registrations
 * Retries enrollment/registration creation for failed webhook processing
 */

import { query, getClient } from '@/lib/db/index.js';
import { grantItemAccess } from '@/lib/services/razorpay/webhookHandlers.js';

/**
 * Retry failed enrollments/registrations
 * @param {number} batchSize - Maximum number of orders to process (default: 50)
 * @returns {Promise<Object>} Results summary
 */
export default async function retryFailedEnrollments(batchSize = 50) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Find paid orders without corresponding enrollments/registrations
    const missingEnrollments = await client.query(
      `SELECT o.id, o.user_id, o.item_type, o.item_id, o.razorpay_order_id, o.created_at
       FROM orders o
       WHERE o.status = 'paid'
         AND NOT EXISTS (
           -- Check for course enrollments
           SELECT 1 FROM course_enrollments ce
           WHERE ce.order_id = o.id AND ce.course_id = o.item_id AND o.item_type = 'course'
         )
         AND NOT EXISTS (
           -- Check for event registrations
           SELECT 1 FROM event_registrations er
           WHERE er.order_id = o.id AND er.event_id = o.item_id AND o.item_type = 'event'
         )
         AND NOT EXISTS (
           -- Check for workshop registrations
           SELECT 1 FROM workshop_registrations wr
           WHERE wr.order_id = o.id AND wr.workshop_id = o.item_id AND o.item_type = 'workshop'
         )
         AND o.created_at >= NOW() - INTERVAL '30 days'  -- Only process orders from last 30 days
       ORDER BY o.created_at ASC
       LIMIT $1`,
      [batchSize]
    );

    const orders = missingEnrollments.rows;
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Process each order
    for (const order of orders) {
      try {
        results.processed++;

        // Use grantItemAccess function (but need to access it - it's currently private)
        // We'll need to make it exported or create a wrapper
        // For now, let's create enrollments directly
        switch (order.item_type) {
          case 'course':
            // Create course enrollment
            await client.query(
              `INSERT INTO course_enrollments (
                course_id, user_id, order_id, enrollment_status, payment_status, enrolled_via
              )
               VALUES ($1, $2, $3, 'active', 'paid', 'payment')
               ON CONFLICT (course_id, user_id) DO UPDATE SET
                 enrollment_status = 'active',
                 payment_status = 'paid',
                 order_id = COALESCE(EXCLUDED.order_id, course_enrollments.order_id),
                 enrolled_via = CASE 
                   WHEN course_enrollments.enrolled_via = 'invitation' THEN 'invitation'
                   ELSE COALESCE(EXCLUDED.enrolled_via, course_enrollments.enrolled_via)
                 END,
                 updated_at = CURRENT_TIMESTAMP`,
              [order.item_id, order.user_id, order.id]
            );
            break;

          case 'event':
            // Create event registration
            await client.query(
              `INSERT INTO event_registrations (
                event_id, user_id, order_id, registration_status, payment_status
              )
               VALUES ($1, $2, $3, 'registered', 'paid')
               ON CONFLICT (event_id, user_id) DO UPDATE SET
                 registration_status = 'registered',
                 payment_status = 'paid',
                 order_id = COALESCE(EXCLUDED.order_id, event_registrations.order_id),
                 updated_at = CURRENT_TIMESTAMP`,
              [order.item_id, order.user_id, order.id]
            );
            break;

          case 'workshop':
            // Create workshop registration
            await client.query(
              `INSERT INTO workshop_registrations (
                workshop_id, user_id, order_id, registration_status, payment_status
              )
               VALUES ($1, $2, $3, 'registered', 'paid')
               ON CONFLICT (workshop_id, user_id) DO UPDATE SET
                 registration_status = 'registered',
                 payment_status = 'paid',
                 order_id = COALESCE(EXCLUDED.order_id, workshop_registrations.order_id),
                 updated_at = CURRENT_TIMESTAMP`,
              [order.item_id, order.user_id, order.id]
            );
            break;

          default:
            throw new Error(`Unknown item type: ${order.item_type}`);
        }

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          orderId: order.id,
          itemType: order.item_type,
          itemId: order.item_id,
          userId: order.user_id,
          error: error.message,
        });
        console.error(`Failed to retry enrollment for order ${order.id}:`, error);
      }
    }

    await client.query('COMMIT');

    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Enrollment retry job error:', error);
    throw error;
  } finally {
    client.release();
  }
}


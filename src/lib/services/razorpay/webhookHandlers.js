/**
 * Razorpay Webhook Handlers
 * 
 * Handles various Razorpay webhook events
 */

import { query } from '@/lib/db/index.js';
import { getRazorpayService } from './RazorpayService.js';
import { getLedgerService } from './LedgerService.js';
import { getOrganizationAccount, createOrganizationAccount } from '@/lib/db/organizationAccounts.js';
import { getSuperadminAccount, createSuperadminAccount } from '@/lib/db/superadminAccounts.js';

/**
 * Log webhook event
 * @param {string} eventId - Razorpay event ID
 * @param {string} eventType - Event type
 * @param {Object} payload - Webhook payload
 * @param {string} signature - Webhook signature
 * @param {boolean} signatureValid - Whether signature is valid
 * @returns {Promise<UUID>} Webhook log ID
 */
async function logWebhookEvent(eventId, eventType, payload, signature, signatureValid) {
  try {
    const result = await query(
      `INSERT INTO webhook_logs (
        event_id, event_type, payload, signature, signature_valid, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (event_id) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP,
        retry_count = webhook_logs.retry_count + 1
      RETURNING id`,
      [eventId, eventType, JSON.stringify(payload), signature, signatureValid, 'pending']
    );

    return result.rows[0].id;
  } catch (error) {
    console.error('logWebhookEvent error:', error);
    throw error;
  }
}

/**
 * Mark webhook as processed
 * @param {UUID} webhookLogId - Webhook log ID
 * @param {boolean} success - Whether processing was successful
 * @param {string} errorMessage - Error message if failed
 */
async function markWebhookProcessed(webhookLogId, success, errorMessage = null) {
  try {
    await query(
      `UPDATE webhook_logs
       SET status = $1, processed_at = CURRENT_TIMESTAMP, error_message = $2
       WHERE id = $3`,
      [success ? 'processed' : 'failed', errorMessage, webhookLogId]
    );
  } catch (error) {
    console.error('markWebhookProcessed error:', error);
  }
}

/**
 * Check if webhook event was already processed
 * @param {string} eventId - Razorpay event ID
 * @returns {Promise<boolean>} True if already processed
 */
async function isWebhookProcessed(eventId) {
  try {
    const result = await query(
      `SELECT status FROM webhook_logs WHERE event_id = $1`,
      [eventId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].status === 'processed';
  } catch (error) {
    console.error('isWebhookProcessed error:', error);
    return false;
  }
}

/**
 * Handle payment.captured event
 * @param {Object} event - Webhook event
 * @returns {Promise<void>}
 */
export async function handlePaymentCaptured(event) {
  console.log('💰 [WEBHOOK] ===== PAYMENT CAPTURED WEBHOOK STARTED =====');
  console.log('💰 [WEBHOOK] Event ID:', event.id);
  console.log('💰 [WEBHOOK] Event Type:', event.event);
  
  const webhookLogId = await logWebhookEvent(
    event.id,
    event.event,
    event.payload,
    event.signature,
    true // Assuming signature was verified before calling this
  );
  
  console.log('💰 [WEBHOOK] Webhook logged with ID:', webhookLogId);

  try {
    const payment = event.payload.payment.entity;
    const orderId = payment.order_id;
    
    console.log('💰 [WEBHOOK] Payment Details:', {
      razorpayPaymentId: payment.id,
      razorpayOrderId: orderId,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: payment.status,
    });

    // Check if already processed
    const alreadyProcessed = await isWebhookProcessed(event.id);
    if (alreadyProcessed) {
      console.log('💰 [WEBHOOK] ⚠️ Webhook already processed, skipping');
      await markWebhookProcessed(webhookLogId, true);
      return;
    }

    // Update payment status in database
    console.log('💰 [WEBHOOK] Updating payment status to "captured"...');
    const paymentUpdateResult = await query(
      `UPDATE payments
       SET status = 'captured', captured_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE razorpay_payment_id = $1
       RETURNING id, status, captured_at`,
      [payment.id]
    );
    
    if (paymentUpdateResult.rows.length > 0) {
      console.log('💰 [WEBHOOK] ✅ Payment updated:', {
        paymentId: paymentUpdateResult.rows[0].id,
        status: paymentUpdateResult.rows[0].status,
        capturedAt: paymentUpdateResult.rows[0].captured_at,
      });
    } else {
      console.log('💰 [WEBHOOK] ⚠️ Payment not found in DB for razorpay_payment_id:', payment.id);
    }

    // Update order status
    console.log('💰 [WEBHOOK] Updating order status to "paid"...');
    const orderUpdateResult = await query(
      `UPDATE orders
       SET status = 'paid', updated_at = CURRENT_TIMESTAMP
       WHERE razorpay_order_id = $1
       RETURNING id, status, updated_at`,
      [orderId]
    );
    
    if (orderUpdateResult.rows.length > 0) {
      console.log('💰 [WEBHOOK] ✅ Order updated:', {
        orderId: orderUpdateResult.rows[0].id,
        status: orderUpdateResult.rows[0].status,
        updatedAt: orderUpdateResult.rows[0].updated_at,
      });
    } else {
      console.log('💰 [WEBHOOK] ⚠️ Order not found in DB for razorpay_order_id:', orderId);
    }

    // Get order details
    const orderResult = await query(
      `SELECT id, user_id, item_type, item_id, final_amount, org_id FROM orders WHERE razorpay_order_id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const order = orderResult.rows[0];
    
    console.log('💰 [WEBHOOK] Order Details:', {
      orderId: order.id,
      userId: order.user_id,
      itemType: order.item_type,
      itemId: order.item_id,
      amount: order.final_amount,
      orgId: order.org_id,
    });

    // Get payment ID
    const paymentResult = await query(
      `SELECT id FROM payments WHERE razorpay_payment_id = $1`,
      [payment.id]
    );

    if (paymentResult.rows.length === 0) {
      throw new Error(`Payment not found: ${payment.id}`);
    }

    const paymentId = paymentResult.rows[0].id;
    console.log('💰 [WEBHOOK] Payment ID from DB:', paymentId);

    // Calculate and create payment splits
    console.log('💰 [WEBHOOK] Calculating payment splits...');
    const ledgerService = getLedgerService();
    const splits = await ledgerService.calculatePaymentSplits({
      amount: parseFloat(order.final_amount),
      itemType: order.item_type,
      itemId: order.item_id,
      orgId: order.org_id,
    });
    
    console.log('💰 [WEBHOOK] Payment splits calculated:', splits);

    await ledgerService.createPaymentSplits(paymentId, order.id, splits);
    console.log('💰 [WEBHOOK] ✅ Payment splits created');

    // Update vendor balance if there's a vendor split
    const vendorSplit = splits.find(s => s.entityType === 'vendor' && s.entityId);
    if (vendorSplit && vendorSplit.entityId) {
      console.log('💰 [WEBHOOK] Processing vendor split:', vendorSplit);
      
      // Get or create vendor account
      let vendorAccountResult = await query(
        `SELECT id FROM vendor_accounts WHERE user_id = $1 LIMIT 1`,
        [vendorSplit.entityId]
      );

      let vendorAccountId;
      if (vendorAccountResult.rows.length === 0) {
        console.log('💰 [WEBHOOK] Creating new vendor account for user:', vendorSplit.entityId);
        // Auto-create vendor account if it doesn't exist
        const createResult = await query(
          `INSERT INTO vendor_accounts (user_id, kyc_status, currency)
           VALUES ($1, 'not_submitted', 'INR')
           RETURNING id`,
          [vendorSplit.entityId]
        );
        vendorAccountId = createResult.rows[0].id;
        console.log('💰 [WEBHOOK] ✅ Vendor account created:', vendorAccountId);
      } else {
        vendorAccountId = vendorAccountResult.rows[0].id;
        console.log('💰 [WEBHOOK] Using existing vendor account:', vendorAccountId);
      }

      // Update vendor balance
      console.log('💰 [WEBHOOK] Updating vendor balance...');
      await ledgerService.updateVendorBalance(vendorAccountId, {
        pending: vendorSplit.amount,
      });
      console.log('💰 [WEBHOOK] ✅ Vendor balance updated');
    }

    // Update organization balance if there's an organization split
    const organizationSplit = splits.find(s => s.entityType === 'organization' && s.entityId);
    if (organizationSplit && organizationSplit.entityId) {
      console.log('💰 [WEBHOOK] Processing organization split:', organizationSplit);
      
      try {
        // Get or create organization account
        let organizationAccount = await getOrganizationAccount(organizationSplit.entityId);
        
        if (!organizationAccount) {
          console.log('💰 [WEBHOOK] Creating new organization account for org:', organizationSplit.entityId);
          organizationAccount = await createOrganizationAccount(organizationSplit.entityId, {
            kyc_status: 'not_submitted',
            currency: 'INR',
          });
          console.log('💰 [WEBHOOK] ✅ Organization account created:', organizationAccount.id);
        } else {
          console.log('💰 [WEBHOOK] Using existing organization account:', organizationAccount.id);
        }

        // Update organization balance
        console.log('💰 [WEBHOOK] Updating organization balance...');
        await ledgerService.updateOrganizationBalance(organizationAccount.id, {
          pending: organizationSplit.amount,
        });
        console.log('💰 [WEBHOOK] ✅ Organization balance updated');
      } catch (error) {
        console.error('💰 [WEBHOOK] ❌ Error updating organization balance:', error);
        // Don't fail the entire webhook if organization balance update fails
        // Log error but continue processing
      }
    }

    // Update superadmin balance if there's a superadmin split
    const superadminSplit = splits.find(s => s.entityType === 'superadmin' && s.entityId);
    if (superadminSplit && superadminSplit.entityId) {
      console.log('💰 [WEBHOOK] Processing superadmin split:', superadminSplit);
      
      try {
        // Get or create superadmin account
        let superadminAccount = await getSuperadminAccount(superadminSplit.entityId);
        
        if (!superadminAccount) {
          console.log('💰 [WEBHOOK] Creating new superadmin account for user:', superadminSplit.entityId);
          superadminAccount = await createSuperadminAccount(superadminSplit.entityId, {
            kyc_status: 'not_submitted',
            currency: 'INR',
          });
          console.log('💰 [WEBHOOK] ✅ Superadmin account created:', superadminAccount.id);
        } else {
          console.log('💰 [WEBHOOK] Using existing superadmin account:', superadminAccount.id);
        }

        // Update superadmin balance
        console.log('💰 [WEBHOOK] Updating superadmin balance...');
        await ledgerService.updateSuperadminBalance(superadminAccount.id, {
          pending: superadminSplit.amount,
        });
        console.log('💰 [WEBHOOK] ✅ Superadmin balance updated');
      } catch (error) {
        console.error('💰 [WEBHOOK] ❌ Error updating superadmin balance:', error);
        // Don't fail the entire webhook if superadmin balance update fails
        // Log error but continue processing
      }
    }

    // Grant access to item (course/event/workshop)
    console.log('💰 [WEBHOOK] Granting item access...');
    console.log('💰 [WEBHOOK] Access Details:', {
      itemType: order.item_type,
      itemId: order.item_id,
      userId: order.user_id,
      orderId: order.id,
    });
    
    await grantItemAccess(order.item_type, order.item_id, order.user_id, order.id);
    
    console.log('💰 [WEBHOOK] ✅ Item access granted');

    await markWebhookProcessed(webhookLogId, true);
    console.log('💰 [WEBHOOK] ✅ ===== PAYMENT CAPTURED WEBHOOK COMPLETED =====');
  } catch (error) {
    console.error('💰 [WEBHOOK] ❌ ===== PAYMENT CAPTURED WEBHOOK ERROR =====');
    console.error('💰 [WEBHOOK] Error:', error.message);
    console.error('💰 [WEBHOOK] Stack:', error.stack);
    await markWebhookProcessed(webhookLogId, false, error.message);
    throw error;
  }
}

/**
 * Handle payment.failed event
 * @param {Object} event - Webhook event
 * @returns {Promise<void>}
 */
export async function handlePaymentFailed(event) {
  const webhookLogId = await logWebhookEvent(
    event.id,
    event.event,
    event.payload,
    event.signature,
    true
  );

  try {
    const payment = event.payload.payment.entity;

    // Check if already processed
    if (await isWebhookProcessed(event.id)) {
      await markWebhookProcessed(webhookLogId, true);
      return;
    }

    // Update payment status
    await query(
      `UPDATE payments
       SET status = 'failed', updated_at = CURRENT_TIMESTAMP
       WHERE razorpay_payment_id = $1`,
      [payment.id]
    );

    // Update order status
    await query(
      `UPDATE orders
       SET status = 'failed', updated_at = CURRENT_TIMESTAMP
       WHERE razorpay_order_id = $1`,
      [payment.order_id]
    );

    await markWebhookProcessed(webhookLogId, true);
  } catch (error) {
    console.error('handlePaymentFailed error:', error);
    await markWebhookProcessed(webhookLogId, false, error.message);
    throw error;
  }
}

/**
 * Handle order.paid event
 * @param {Object} event - Webhook event
 * @returns {Promise<void>}
 */
export async function handleOrderPaid(event) {
  // This is similar to payment.captured, but triggered when order is fully paid
  // For now, delegate to handlePaymentCaptured
  return handlePaymentCaptured(event);
}

/**
 * Handle refund.succeeded event
 * @param {Object} event - Webhook event
 * @returns {Promise<void>}
 */
export async function handleRefundSucceeded(event) {
  const webhookLogId = await logWebhookEvent(
    event.id,
    event.event,
    event.payload,
    event.signature,
    true
  );

  try {
    const refund = event.payload.refund.entity;
    const paymentId = refund.payment_id;

    // Check if already processed
    if (await isWebhookProcessed(event.id)) {
      await markWebhookProcessed(webhookLogId, true);
      return;
    }

    // Get payment and order details
    const paymentResult = await query(
      `SELECT id, order_id FROM payments WHERE razorpay_payment_id = $1`,
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    const payment = paymentResult.rows[0];

    // Create or update refund record
    await query(
      `INSERT INTO refunds (
        razorpay_refund_id, payment_id, order_id, amount, currency, status, reason, processed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (razorpay_refund_id) DO UPDATE SET
        status = 'processed',
        processed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP`,
      [
        refund.id,
        payment.id,
        payment.order_id,
        refund.amount / 100, // Convert from paise
        refund.currency,
        'processed',
        refund.notes?.reason || 'Refund processed',
      ]
    );

    // Update payment status
    await query(
      `UPDATE payments
       SET status = 'refunded', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [payment.id]
    );

    // Reverse payment splits (move vendor balance to on_hold or deduct)
    await reversePaymentSplits(payment.id, refund.amount / 100);

    await markWebhookProcessed(webhookLogId, true);
  } catch (error) {
    console.error('handleRefundSucceeded error:', error);
    await markWebhookProcessed(webhookLogId, false, error.message);
    throw error;
  }
}

/**
 * Grant access to item (course/event/workshop)
 * @param {string} itemType - Item type
 * @param {UUID} itemId - Item ID
 * @param {UUID} userId - User ID
 * @param {UUID} orderId - Order ID (optional, for events/workshops)
 * @returns {Promise<void>}
 */
export async function grantItemAccess(itemType, itemId, userId, orderId = null) {
  console.log('🎓 [ENROLLMENT] ===== GRANTING ITEM ACCESS =====');
  console.log('🎓 [ENROLLMENT] Access Request:', {
    itemType,
    itemId,
    userId,
    orderId,
  });

  try {
    switch (itemType) {
      case 'course':
        console.log('🎓 [ENROLLMENT] Processing course enrollment...');
        // Check if enrollment already exists
        const existingEnrollment = await query(
          `SELECT id, enrollment_status, enrolled_at FROM course_enrollments 
           WHERE course_id = $1 AND user_id = $2`,
          [itemId, userId]
        );
        
        if (existingEnrollment.rows.length > 0) {
          console.log('🎓 [ENROLLMENT] Existing enrollment found:', {
            enrollmentId: existingEnrollment.rows[0].id,
            status: existingEnrollment.rows[0].enrollment_status,
            enrolledAt: existingEnrollment.rows[0].enrolled_at,
          });
        } else {
          console.log('🎓 [ENROLLMENT] No existing enrollment, creating new one...');
        }
        
        // Check if enrollment exists, if not create it
        // Update order_id, payment_status, and enrolled_via for paid enrollments
        const enrollmentResult = await query(
          `INSERT INTO course_enrollments (course_id, user_id, enrollment_status, order_id, payment_status, enrolled_via)
           VALUES ($1, $2, 'active', $3, 'paid', 'payment')
           ON CONFLICT (course_id, user_id) DO UPDATE SET
             enrollment_status = 'active',
             order_id = COALESCE(EXCLUDED.order_id, course_enrollments.order_id),
             payment_status = COALESCE(EXCLUDED.payment_status, course_enrollments.payment_status),
             enrolled_via = COALESCE(EXCLUDED.enrolled_via, course_enrollments.enrolled_via),
             updated_at = CURRENT_TIMESTAMP
           RETURNING id, course_id, user_id, enrollment_status, order_id, payment_status, enrolled_via, enrolled_at, updated_at`,
          [itemId, userId, orderId]
        );
        
        if (enrollmentResult.rows.length > 0) {
          const enrollment = enrollmentResult.rows[0];
          console.log('🎓 [ENROLLMENT] ✅ Course enrollment created/updated:', {
            enrollmentId: enrollment.id,
            courseId: enrollment.course_id,
            userId: enrollment.user_id,
            status: enrollment.enrollment_status,
            enrolledAt: enrollment.enrolled_at,
            updatedAt: enrollment.updated_at,
          });
        } else {
          console.log('🎓 [ENROLLMENT] ⚠️ Enrollment result empty');
        }
        break;
      case 'event':
        console.log('🎓 [ENROLLMENT] Processing event registration...');
        const eventResult = await query(
          `INSERT INTO event_registrations (event_id, user_id, order_id, registration_status, payment_status)
           VALUES ($1, $2, $3, 'registered', 'paid')
           ON CONFLICT (event_id, user_id) DO UPDATE SET
             registration_status = 'registered',
             payment_status = 'paid',
             order_id = COALESCE(EXCLUDED.order_id, event_registrations.order_id),
             updated_at = CURRENT_TIMESTAMP
           RETURNING id, event_id, user_id, order_id, registration_status, payment_status, updated_at`,
          [itemId, userId, orderId]
        );
        
        if (eventResult.rows.length > 0) {
          const registration = eventResult.rows[0];
          console.log('🎓 [ENROLLMENT] ✅ Event registration created/updated:', {
            registrationId: registration.id,
            eventId: registration.event_id,
            userId: registration.user_id,
            orderId: registration.order_id,
            status: registration.registration_status,
            paymentStatus: registration.payment_status,
            updatedAt: registration.updated_at,
          });
        }
        break;
      case 'workshop':
        console.log('🎓 [ENROLLMENT] Processing workshop registration...');
        const workshopResult = await query(
          `INSERT INTO workshop_registrations (workshop_id, user_id, order_id, registration_status, payment_status)
           VALUES ($1, $2, $3, 'registered', 'paid')
           ON CONFLICT (workshop_id, user_id) DO UPDATE SET
             registration_status = 'registered',
             payment_status = 'paid',
             order_id = COALESCE(EXCLUDED.order_id, workshop_registrations.order_id),
             updated_at = CURRENT_TIMESTAMP
           RETURNING id, workshop_id, user_id, order_id, registration_status, payment_status, updated_at`,
          [itemId, userId, orderId]
        );
        
        if (workshopResult.rows.length > 0) {
          const registration = workshopResult.rows[0];
          console.log('🎓 [ENROLLMENT] ✅ Workshop registration created/updated:', {
            registrationId: registration.id,
            workshopId: registration.workshop_id,
            userId: registration.user_id,
            orderId: registration.order_id,
            status: registration.registration_status,
            paymentStatus: registration.payment_status,
            updatedAt: registration.updated_at,
          });
        }
        break;
      default:
        console.warn(`🎓 [ENROLLMENT] ⚠️ Unknown item type for access grant: ${itemType}`);
    }
    
    console.log('🎓 [ENROLLMENT] ✅ ===== ITEM ACCESS GRANTED =====');
  } catch (error) {
    console.error('🎓 [ENROLLMENT] ❌ ===== GRANT ITEM ACCESS ERROR =====');
    console.error('🎓 [ENROLLMENT] Error:', error.message);
    console.error('🎓 [ENROLLMENT] Stack:', error.stack);
    console.error('🎓 [ENROLLMENT] Details:', { itemType, itemId, userId, orderId });
    throw error;
  }
}

/**
 * Reverse payment splits (for refunds)
 * @param {UUID} paymentId - Payment ID
 * @param {number} refundAmount - Refund amount
 * @returns {Promise<void>}
 */
async function reversePaymentSplits(paymentId, refundAmount) {
  try {
    // Get payment splits (include pending and settled splits for reversal)
    const splitsResult = await query(
      `SELECT * FROM payment_splits WHERE payment_id = $1 AND status IN ('pending', 'settled')`,
      [paymentId]
    );

    const ledgerService = getLedgerService();

    // Get total payment amount to calculate proportional refunds
    const paymentResult = await query(
      `SELECT amount FROM payments WHERE id = $1`,
      [paymentId]
    );
    const totalPaymentAmount = paymentResult.rows[0]?.amount ? parseFloat(paymentResult.rows[0].amount) : refundAmount;

    for (const split of splitsResult.rows) {
      // Calculate proportional refund amount based on split percentage
      const splitAmount = parseFloat(split.amount);
      const proportionalRefund = (refundAmount * splitAmount) / totalPaymentAmount;

      if (split.entity_type === 'vendor' && split.entity_id) {
        // Get vendor account
        const vendorAccountResult = await query(
          `SELECT id FROM vendor_accounts WHERE user_id = $1`,
          [split.entity_id]
        );

        if (vendorAccountResult.rows.length > 0) {
          const vendorAccountId = vendorAccountResult.rows[0].id;
          
          // Move amount from withdrawable/pending to on_hold (or deduct if already paid out)
          await ledgerService.updateVendorBalance(vendorAccountId, {
            withdrawable: -proportionalRefund,
            pending: -proportionalRefund,
            onHold: proportionalRefund,
          });
        }
      } else if (split.entity_type === 'organization' && split.entity_id) {
        // Get organization account
        const organizationAccountResult = await query(
          `SELECT id FROM organization_accounts WHERE org_id = $1`,
          [split.entity_id]
        );

        if (organizationAccountResult.rows.length > 0) {
          const organizationAccountId = organizationAccountResult.rows[0].id;
          
          // Move amount from withdrawable/pending to on_hold (or deduct if already paid out)
          await ledgerService.updateOrganizationBalance(organizationAccountId, {
            withdrawable: -proportionalRefund,
            pending: -proportionalRefund,
            onHold: proportionalRefund,
          });
        }
      } else if (split.entity_type === 'superadmin' && split.entity_id) {
        // Get superadmin account
        const superadminAccountResult = await query(
          `SELECT id FROM superadmin_accounts WHERE user_id = $1`,
          [split.entity_id]
        );

        if (superadminAccountResult.rows.length > 0) {
          const superadminAccountId = superadminAccountResult.rows[0].id;
          
          // Move amount from withdrawable/pending to on_hold (or deduct if already paid out)
          await ledgerService.updateSuperadminBalance(superadminAccountId, {
            withdrawable: -proportionalRefund,
            pending: -proportionalRefund,
            onHold: proportionalRefund,
          });
        }
      }

      // Mark split as reversed
      await query(
        `UPDATE payment_splits
         SET status = 'reversed', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [split.id]
      );
    }
  } catch (error) {
    console.error('reversePaymentSplits error:', error);
    throw error;
  }
}

/**
 * Handle settlement.processed event (placeholder)
 * @param {Object} event - Webhook event
 * @returns {Promise<void>}
 */
export async function handleSettlementProcessed(event) {
  // TODO: Implement settlement processing
  console.log('Settlement processed event:', event);
}

/**
 * Handle payout.processed event (placeholder)
 * @param {Object} event - Webhook event
 * @returns {Promise<void>}
 */
export async function handlePayoutProcessed(event) {
  // TODO: Implement payout processing
  console.log('Payout processed event:', event);
}


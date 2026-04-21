/**
 * Payment Audit Service
 * 
 * Logs all payment-related actions for compliance and debugging
 */

import { query } from '@/lib/db/index.js';

class PaymentAuditService {
  /**
   * Log payment action
   * @param {Object} params - Audit log parameters
   * @param {string} params.action - Action type (payment_audit_action enum)
   * @param {UUID} params.actorId - User ID who performed the action
   * @param {string} params.actorRole - User role
   * @param {string} params.actorEmail - User email
   * @param {string} params.targetType - Target type (order, payment, refund, etc.)
   * @param {UUID} params.targetId - Target ID
   * @param {UUID} params.orderId - Related order ID (optional)
   * @param {UUID} params.paymentId - Related payment ID (optional)
   * @param {UUID} params.refundId - Related refund ID (optional)
   * @param {UUID} params.payoutId - Related payout ID (optional)
   * @param {string} params.description - Action description
   * @param {Object} params.metadata - Additional metadata
   * @param {string} params.ipAddress - IP address
   * @param {string} params.userAgent - User agent
   * @returns {Promise<UUID>} Audit log ID
   */
  async logAction({
    action,
    actorId = null,
    actorRole = null,
    actorEmail = null,
    targetType = null,
    targetId = null,
    orderId = null,
    paymentId = null,
    refundId = null,
    payoutId = null,
    description = null,
    metadata = {},
    ipAddress = null,
    userAgent = null,
  }) {
    try {
      const result = await query(
        `INSERT INTO payment_audit_logs (
          action, actor_id, actor_role, actor_email,
          target_type, target_id,
          order_id, payment_id, refund_id, payout_id,
          description, metadata, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id`,
        [
          action,
          actorId,
          actorRole,
          actorEmail,
          targetType,
          targetId,
          orderId,
          paymentId,
          refundId,
          payoutId,
          description,
          JSON.stringify(metadata),
          ipAddress,
          userAgent,
        ]
      );

      return result.rows[0].id;
    } catch (error) {
      console.error('PaymentAuditService logAction error:', error);
      // Don't throw - audit logging should not break the main flow
      return null;
    }
  }

  /**
   * Log order created
   * @param {Object} params - Log parameters
   * @returns {Promise<UUID>} Audit log ID
   */
  async logOrderCreated({ orderId, userId, userRole, userEmail, orderAmount, itemType, itemId, ipAddress = null, userAgent = null }) {
    return this.logAction({
      action: 'order_created',
      actorId: userId,
      actorRole: userRole,
      actorEmail: userEmail,
      targetType: 'order',
      targetId: orderId,
      orderId,
      description: `Order created for ${itemType} ${itemId} with amount ₹${orderAmount}`,
      metadata: { orderAmount, itemType, itemId },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log payment captured
   * @param {Object} params - Log parameters
   * @returns {Promise<UUID>} Audit log ID
   */
  async logPaymentCaptured({ paymentId, orderId, userId, userRole, userEmail, amount, ipAddress = null, userAgent = null }) {
    return this.logAction({
      action: 'payment_captured',
      actorId: userId,
      actorRole: userRole,
      actorEmail: userEmail,
      targetType: 'payment',
      targetId: paymentId,
      orderId,
      paymentId,
      description: `Payment captured for order ${orderId} with amount ₹${amount}`,
      metadata: { amount },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log refund created
   * @param {Object} params - Log parameters
   * @returns {Promise<UUID>} Audit log ID
   */
  async logRefundCreated({ refundId, paymentId, orderId, userId, userRole, userEmail, amount, reason, ipAddress = null, userAgent = null }) {
    return this.logAction({
      action: 'refund_created',
      actorId: userId,
      actorRole: userRole,
      actorEmail: userEmail,
      targetType: 'refund',
      targetId: refundId,
      orderId,
      paymentId,
      refundId,
      description: `Refund created for payment ${paymentId} with amount ₹${amount}. Reason: ${reason}`,
      metadata: { amount, reason },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log payout processed
   * @param {Object} params - Log parameters
   * @returns {Promise<UUID>} Audit log ID
   */
  async logPayoutProcessed({ payoutId, vendorUserId, amount, status, ipAddress = null, userAgent = null }) {
    return this.logAction({
      action: 'payout_processed',
      actorId: vendorUserId,
      actorRole: 'vendor',
      targetType: 'payout',
      targetId: payoutId,
      payoutId,
      description: `Payout ${status} for payout ${payoutId} with amount ₹${amount}`,
      metadata: { amount, status },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log commission rule change
   * @param {Object} params - Log parameters
   * @returns {Promise<UUID>} Audit log ID
   */
  async logCommissionRuleChange({ action, ruleId, userId, userRole, userEmail, ruleData, ipAddress = null, userAgent = null }) {
    return this.logAction({
      action: `commission_rule_${action}`,
      actorId: userId,
      actorRole: userRole,
      actorEmail: userEmail,
      targetType: 'commission_rule',
      targetId: ruleId,
      description: `Commission rule ${action}: ${ruleId}`,
      metadata: { ruleId, ruleData },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log tax rule change
   * @param {Object} params - Log parameters
   * @returns {Promise<UUID>} Audit log ID
   */
  async logTaxRuleChange({ action, ruleId, userId, userRole, userEmail, ruleData, ipAddress = null, userAgent = null }) {
    return this.logAction({
      action: `tax_rule_${action}`,
      actorId: userId,
      actorRole: userRole,
      actorEmail: userEmail,
      targetType: 'tax_rule',
      targetId: ruleId,
      description: `Tax rule ${action}: ${ruleId}`,
      metadata: { ruleId, ruleData },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log coupon action
   * @param {Object} params - Log parameters
   * @returns {Promise<UUID>} Audit log ID
   */
  async logCouponAction({ action, couponId, orderId, userId, userRole, userEmail, discountAmount, ipAddress = null, userAgent = null }) {
    return this.logAction({
      action: `coupon_${action}`,
      actorId: userId,
      actorRole: userRole,
      actorEmail: userEmail,
      targetType: 'coupon',
      targetId: couponId,
      orderId,
      description: `Coupon ${action}: ${couponId}${discountAmount ? ` with discount ₹${discountAmount}` : ''}`,
      metadata: { couponId, discountAmount },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Query audit logs with filters
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>} Array of audit logs
   */
  async queryLogs(filters = {}) {
    try {
      const {
        action = null,
        actorId = null,
        targetType = null,
        targetId = null,
        orderId = null,
        paymentId = null,
        startDate = null,
        endDate = null,
        limit = 100,
        offset = 0,
      } = filters;

      let whereClause = 'WHERE 1=1';
      const queryParams = [];
      let paramIndex = 1;

      if (action) {
        whereClause += ` AND action = $${paramIndex}`;
        queryParams.push(action);
        paramIndex++;
      }

      if (actorId) {
        whereClause += ` AND actor_id = $${paramIndex}`;
        queryParams.push(actorId);
        paramIndex++;
      }

      if (targetType) {
        whereClause += ` AND target_type = $${paramIndex}`;
        queryParams.push(targetType);
        paramIndex++;
      }

      if (targetId) {
        whereClause += ` AND target_id = $${paramIndex}`;
        queryParams.push(targetId);
        paramIndex++;
      }

      if (orderId) {
        whereClause += ` AND order_id = $${paramIndex}`;
        queryParams.push(orderId);
        paramIndex++;
      }

      if (paymentId) {
        whereClause += ` AND payment_id = $${paramIndex}`;
        queryParams.push(paymentId);
        paramIndex++;
      }

      if (startDate) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        queryParams.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        queryParams.push(endDate);
        paramIndex++;
      }

      queryParams.push(limit, offset);

      const result = await query(
        `SELECT * FROM payment_audit_logs
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        queryParams
      );

      return result.rows.map(row => ({
        id: row.id,
        action: row.action,
        actorId: row.actor_id,
        actorRole: row.actor_role,
        actorEmail: row.actor_email,
        targetType: row.target_type,
        targetId: row.target_id,
        orderId: row.order_id,
        paymentId: row.payment_id,
        refundId: row.refund_id,
        payoutId: row.payout_id,
        description: row.description,
        metadata: row.metadata || {},
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error('PaymentAuditService queryLogs error:', error);
      throw new Error(`Failed to query audit logs: ${error.message}`);
    }
  }

  /**
   * Get audit log by ID
   * @param {UUID} logId - Audit log ID
   * @returns {Promise<Object|null>} Audit log or null
   */
  async getLogById(logId) {
    try {
      const result = await query(
        `SELECT * FROM payment_audit_logs WHERE id = $1`,
        [logId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        action: row.action,
        actorId: row.actor_id,
        actorRole: row.actor_role,
        actorEmail: row.actor_email,
        targetType: row.target_type,
        targetId: row.target_id,
        orderId: row.order_id,
        paymentId: row.payment_id,
        refundId: row.refund_id,
        payoutId: row.payout_id,
        description: row.description,
        metadata: row.metadata || {},
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
      };
    } catch (error) {
      console.error('PaymentAuditService getLogById error:', error);
      return null;
    }
  }
}

// Export singleton instance
let paymentAuditServiceInstance = null;

export function getPaymentAuditService() {
  if (!paymentAuditServiceInstance) {
    paymentAuditServiceInstance = new PaymentAuditService();
  }
  return paymentAuditServiceInstance;
}

export default PaymentAuditService;


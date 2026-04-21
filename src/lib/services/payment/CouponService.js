/**
 * Coupon Service
 * 
 * Manages coupon validation, discount calculation, and redemption tracking
 */

import { query } from '@/lib/db/index.js';

class CouponService {
  /**
   * Validate coupon code
   * @param {Object} params - Validation parameters
   * @param {string} params.code - Coupon code
   * @param {UUID} params.userId - User ID
   * @param {string} params.itemType - Item type (course, event, workshop)
   * @param {UUID} params.itemId - Item ID
   * @param {UUID} params.orgId - Organization ID (optional)
   * @param {number} params.orderAmount - Order amount before discount
   * @returns {Promise<Object>} Validation result with discount amount
   */
  async validateCoupon({ code, userId, itemType, itemId, orgId = null, orderAmount }) {
    try {
      // Find active coupon
      const now = new Date();
      const couponResult = await query(
        `SELECT * FROM coupons
         WHERE code = $1
           AND status = 'active'
           AND deleted_at IS NULL
           AND valid_from <= $2
           AND valid_until >= $2`,
        [code.toUpperCase(), now]
      );

      if (couponResult.rows.length === 0) {
        return {
          valid: false,
          error: 'Coupon code not found or expired',
        };
      }

      const coupon = couponResult.rows[0];

      // Check minimum order amount
      if (coupon.min_order_amount && orderAmount < parseFloat(coupon.min_order_amount)) {
        return {
          valid: false,
          error: `Minimum order amount of ₹${coupon.min_order_amount} required`,
        };
      }

      // Check applicable item types
      if (coupon.applicable_item_types && coupon.applicable_item_types.length > 0) {
        if (!coupon.applicable_item_types.includes(itemType)) {
          return {
            valid: false,
            error: 'Coupon not applicable for this item type',
          };
        }
      }

      // Check applicable orgs
      if (coupon.applicable_org_ids && coupon.applicable_org_ids.length > 0) {
        if (!orgId || !coupon.applicable_org_ids.includes(orgId)) {
          return {
            valid: false,
            error: 'Coupon not applicable for this organization',
          };
        }
      }

      // Check applicable courses
      if (coupon.applicable_course_ids && coupon.applicable_course_ids.length > 0) {
        if (itemType !== 'course' || !coupon.applicable_course_ids.includes(itemId)) {
          return {
            valid: false,
            error: 'Coupon not applicable for this course',
          };
        }
      }

      // Check total usage limit
      if (coupon.max_uses) {
        const usageCountResult = await query(
          `SELECT COUNT(*) as count FROM coupon_redemptions WHERE coupon_id = $1`,
          [coupon.id]
        );
        const usageCount = parseInt(usageCountResult.rows[0].count, 10);
        
        if (usageCount >= coupon.max_uses) {
          return {
            valid: false,
            error: 'Coupon usage limit reached',
          };
        }
      }

      // Check per-user usage limit
      const maxUsesPerUser = coupon.max_uses_per_user || 1;
      const userUsageCountResult = await query(
        `SELECT COUNT(*) as count FROM coupon_redemptions 
         WHERE coupon_id = $1 AND user_id = $2`,
        [coupon.id, userId]
      );
      const userUsageCount = parseInt(userUsageCountResult.rows[0].count, 10);
      
      if (userUsageCount >= maxUsesPerUser) {
        return {
          valid: false,
          error: 'You have already used this coupon',
        };
      }

      // Calculate discount amount
      const discountAmount = this.calculateDiscount(coupon, orderAmount);

      return {
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          type: coupon.type,
          discountValue: parseFloat(coupon.discount_value),
          maxDiscountAmount: coupon.max_discount_amount ? parseFloat(coupon.max_discount_amount) : null,
        },
        discountAmount,
        orderAmountAfterDiscount: orderAmount - discountAmount,
      };
    } catch (error) {
      console.error('CouponService validateCoupon error:', error);
      return {
        valid: false,
        error: 'Failed to validate coupon',
      };
    }
  }

  /**
   * Calculate discount amount
   * @param {Object} coupon - Coupon object
   * @param {number} orderAmount - Order amount
   * @returns {number} Discount amount
   */
  calculateDiscount(coupon, orderAmount) {
    let discountAmount = 0;

    if (coupon.type === 'percentage') {
      discountAmount = (orderAmount * parseFloat(coupon.discount_value)) / 100;
      
      // Apply max discount if set
      if (coupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, parseFloat(coupon.max_discount_amount));
      }
    } else if (coupon.type === 'fixed_amount') {
      discountAmount = Math.min(parseFloat(coupon.discount_value), orderAmount);
    }

    // Ensure discount doesn't exceed order amount
    discountAmount = Math.min(discountAmount, orderAmount);
    
    // Round to 2 decimal places
    return Math.round(discountAmount * 100) / 100;
  }

  /**
   * Apply coupon to order
   * @param {Object} params - Application parameters
   * @param {UUID} params.couponId - Coupon ID
   * @param {UUID} params.orderId - Order ID
   * @param {UUID} params.userId - User ID
   * @param {number} params.discountAmount - Discount amount
   * @param {number} params.orderAmountBeforeDiscount - Order amount before discount
   * @param {number} params.orderAmountAfterDiscount - Order amount after discount
   * @returns {Promise<Object>} Redemption record
   */
  async applyCoupon({ couponId, orderId, userId, discountAmount, orderAmountBeforeDiscount, orderAmountAfterDiscount }) {
    try {
      // Check if coupon already applied to this order
      const existingResult = await query(
        `SELECT id FROM coupon_redemptions WHERE order_id = $1`,
        [orderId]
      );

      if (existingResult.rows.length > 0) {
        throw new Error('Coupon already applied to this order');
      }

      // Create redemption record
      const redemptionResult = await query(
        `INSERT INTO coupon_redemptions (
          coupon_id, order_id, user_id, discount_amount,
          order_amount_before_discount, order_amount_after_discount
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          couponId,
          orderId,
          userId,
          discountAmount,
          orderAmountBeforeDiscount,
          orderAmountAfterDiscount,
        ]
      );

      // Update order with coupon_id
      await query(
        `UPDATE orders SET coupon_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [couponId, orderId]
      );

      return redemptionResult.rows[0];
    } catch (error) {
      console.error('CouponService applyCoupon error:', error);
      throw new Error(`Failed to apply coupon: ${error.message}`);
    }
  }

  /**
   * Get coupon by code
   * @param {string} code - Coupon code
   * @returns {Promise<Object|null>} Coupon object or null
   */
  async getCouponByCode(code) {
    try {
      const result = await query(
        `SELECT * FROM coupons WHERE code = $1 AND deleted_at IS NULL`,
        [code.toUpperCase()]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.transformCoupon(result.rows[0]);
    } catch (error) {
      console.error('CouponService getCouponByCode error:', error);
      return null;
    }
  }

  /**
   * Get coupon by ID
   * @param {UUID} couponId - Coupon ID
   * @returns {Promise<Object|null>} Coupon object or null
   */
  async getCouponById(couponId) {
    try {
      const result = await query(
        `SELECT * FROM coupons WHERE id = $1 AND deleted_at IS NULL`,
        [couponId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.transformCoupon(result.rows[0]);
    } catch (error) {
      console.error('CouponService getCouponById error:', error);
      return null;
    }
  }

  /**
   * Transform database coupon to service format
   * @param {Object} dbCoupon - Coupon from database
   * @returns {Object} Transformed coupon
   */
  transformCoupon(dbCoupon) {
    return {
      id: dbCoupon.id,
      code: dbCoupon.code,
      name: dbCoupon.name,
      description: dbCoupon.description,
      type: dbCoupon.type,
      discountValue: parseFloat(dbCoupon.discount_value),
      maxDiscountAmount: dbCoupon.max_discount_amount ? parseFloat(dbCoupon.max_discount_amount) : null,
      validFrom: dbCoupon.valid_from,
      validUntil: dbCoupon.valid_until,
      status: dbCoupon.status,
      maxUses: dbCoupon.max_uses,
      maxUsesPerUser: dbCoupon.max_uses_per_user,
      minOrderAmount: dbCoupon.min_order_amount ? parseFloat(dbCoupon.min_order_amount) : null,
      applicableItemTypes: dbCoupon.applicable_item_types,
      applicableOrgIds: dbCoupon.applicable_org_ids,
      applicableCourseIds: dbCoupon.applicable_course_ids,
      metadata: dbCoupon.metadata || {},
      createdAt: dbCoupon.created_at,
      updatedAt: dbCoupon.updated_at,
    };
  }

  /**
   * Create coupon
   * @param {Object} couponData - Coupon data
   * @returns {Promise<Object>} Created coupon
   */
  async createCoupon(couponData) {
    try {
      const {
        code,
        name,
        description = null,
        type,
        discountValue,
        maxDiscountAmount = null,
        validFrom,
        validUntil,
        maxUses = null,
        maxUsesPerUser = 1,
        minOrderAmount = null,
        applicableItemTypes = null,
        applicableOrgIds = null,
        applicableCourseIds = null,
        createdBy = null,
        metadata = {},
      } = couponData;

      // Validate dates
      if (new Date(validUntil) <= new Date(validFrom)) {
        throw new Error('validUntil must be after validFrom');
      }

      const result = await query(
        `INSERT INTO coupons (
          code, name, description, type, discount_value, max_discount_amount,
          valid_from, valid_until, max_uses, max_uses_per_user, min_order_amount,
          applicable_item_types, applicable_org_ids, applicable_course_ids,
          created_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          code.toUpperCase(),
          name,
          description,
          type,
          discountValue,
          maxDiscountAmount,
          validFrom,
          validUntil,
          maxUses,
          maxUsesPerUser,
          minOrderAmount,
          applicableItemTypes,
          applicableOrgIds,
          applicableCourseIds,
          createdBy,
          JSON.stringify(metadata),
        ]
      );

      return this.transformCoupon(result.rows[0]);
    } catch (error) {
      console.error('CouponService createCoupon error:', error);
      throw new Error(`Failed to create coupon: ${error.message}`);
    }
  }

  /**
   * Update coupon
   * @param {UUID} couponId - Coupon ID
   * @param {Object} updates - Coupon updates
   * @returns {Promise<Object>} Updated coupon
   */
  async updateCoupon(couponId, updates) {
    try {
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      const allowedFields = [
        'name',
        'description',
        'discount_value',
        'max_discount_amount',
        'valid_from',
        'valid_until',
        'max_uses',
        'max_uses_per_user',
        'min_order_amount',
        'applicable_item_types',
        'applicable_org_ids',
        'applicable_course_ids',
        'status',
        'metadata',
      ];

      for (const [key, value] of Object.entries(updates)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(dbKey)) {
          if (dbKey === 'metadata' && typeof value === 'object') {
            updateFields.push(`${dbKey} = $${paramIndex}`);
            updateValues.push(JSON.stringify(value));
          } else if (Array.isArray(value)) {
            updateFields.push(`${dbKey} = $${paramIndex}`);
            updateValues.push(value);
          } else {
            updateFields.push(`${dbKey} = $${paramIndex}`);
            updateValues.push(value);
          }
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(couponId);

      const result = await query(
        `UPDATE coupons
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex} AND deleted_at IS NULL
         RETURNING *`,
        updateValues
      );

      if (result.rows.length === 0) {
        throw new Error('Coupon not found');
      }

      return this.transformCoupon(result.rows[0]);
    } catch (error) {
      console.error('CouponService updateCoupon error:', error);
      throw new Error(`Failed to update coupon: ${error.message}`);
    }
  }

  /**
   * Delete coupon (soft delete)
   * @param {UUID} couponId - Coupon ID
   * @returns {Promise<boolean>} Success
   */
  async deleteCoupon(couponId) {
    try {
      const result = await query(
        `UPDATE coupons
         SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, status = 'deleted'
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [couponId]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('CouponService deleteCoupon error:', error);
      throw new Error(`Failed to delete coupon: ${error.message}`);
    }
  }

  /**
   * List coupons with filters
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>} Array of coupons
   */
  async listCoupons(filters = {}) {
    try {
      const {
        status = null,
        code = null,
        limit = 100,
        offset = 0,
      } = filters;

      let whereClause = 'WHERE deleted_at IS NULL';
      const queryParams = [];
      let paramIndex = 1;

      if (status) {
        whereClause += ` AND status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (code) {
        whereClause += ` AND code ILIKE $${paramIndex}`;
        queryParams.push(`%${code}%`);
        paramIndex++;
      }

      queryParams.push(limit, offset);

      const result = await query(
        `SELECT * FROM coupons
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        queryParams
      );

      return result.rows.map(row => this.transformCoupon(row));
    } catch (error) {
      console.error('CouponService listCoupons error:', error);
      throw new Error(`Failed to list coupons: ${error.message}`);
    }
  }

  /**
   * Get coupon redemption statistics
   * @param {UUID} couponId - Coupon ID
   * @returns {Promise<Object>} Redemption statistics
   */
  async getRedemptionStats(couponId) {
    try {
      const statsResult = await query(
        `SELECT 
           COUNT(*) as total_redemptions,
           SUM(discount_amount) as total_discount_given,
           COUNT(DISTINCT user_id) as unique_users
         FROM coupon_redemptions
         WHERE coupon_id = $1`,
        [couponId]
      );

      return {
        totalRedemptions: parseInt(statsResult.rows[0].total_redemptions, 10),
        totalDiscountGiven: parseFloat(statsResult.rows[0].total_discount_given) || 0,
        uniqueUsers: parseInt(statsResult.rows[0].unique_users, 10),
      };
    } catch (error) {
      console.error('CouponService getRedemptionStats error:', error);
      throw new Error(`Failed to get redemption stats: ${error.message}`);
    }
  }
}

// Export singleton instance
let couponServiceInstance = null;

export function getCouponService() {
  if (!couponServiceInstance) {
    couponServiceInstance = new CouponService();
  }
  return couponServiceInstance;
}

export default CouponService;


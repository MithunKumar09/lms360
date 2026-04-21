/**
 * Generate Finance Reports Job
 * 
 * Generates daily/weekly finance reports
 */

import { query } from '@/lib/db/index.js';

/**
 * Generate finance report
 * @param {Object} params - Report parameters
 * @param {string} params.period - 'daily' | 'weekly' | 'monthly'
 * @param {Date} params.startDate - Start date
 * @param {Date} params.endDate - End date
 * @returns {Promise<Object>} Report data
 */
export async function generateFinanceReports({ period = 'daily', startDate = null, endDate = null }) {
  try {
    // Set date range
    if (!startDate || !endDate) {
      const now = new Date();
      endDate = new Date(now);
      
      switch (period) {
        case 'daily':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'monthly':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
    }

    // Revenue summary
    const revenueResult = await query(
      `SELECT 
         COUNT(*) as total_orders,
         SUM(final_amount) as total_revenue,
         SUM(discount_amount) as total_discounts,
         SUM(tax_amount) as total_tax,
         COUNT(DISTINCT user_id) as unique_customers
       FROM orders
       WHERE status = 'paid'
         AND created_at >= $1
         AND created_at <= $2`,
      [startDate, endDate]
    );

    // Payment splits summary
    const splitsResult = await query(
      `SELECT 
         entity_type,
         SUM(amount) as total_amount,
         COUNT(*) as count
       FROM payment_splits
       WHERE created_at >= $1
         AND created_at <= $2
       GROUP BY entity_type`,
      [startDate, endDate]
    );

    // Vendor payouts summary
    const payoutsResult = await query(
      `SELECT 
         COUNT(*) as total_payouts,
         SUM(amount) as total_payout_amount,
         COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed_payouts,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payouts
       FROM payouts
       WHERE created_at >= $1
         AND created_at <= $2`,
      [startDate, endDate]
    );

    // Refunds summary
    const refundsResult = await query(
      `SELECT 
         COUNT(*) as total_refunds,
         SUM(amount) as total_refund_amount
       FROM refunds
       WHERE created_at >= $1
         AND created_at <= $2`,
      [startDate, endDate]
    );

    // Coupon usage
    const couponsResult = await query(
      `SELECT 
         COUNT(*) as total_redemptions,
         SUM(discount_amount) as total_discount_given
       FROM coupon_redemptions
       WHERE redeemed_at >= $1
         AND redeemed_at <= $2`,
      [startDate, endDate]
    );

    const revenue = revenueResult.rows[0];
    const splits = splitsResult.rows.reduce((acc, row) => {
      acc[row.entity_type] = {
        totalAmount: parseFloat(row.total_amount) || 0,
        count: parseInt(row.count, 10),
      };
      return acc;
    }, {});
    const payouts = payoutsResult.rows[0];
    const refunds = refundsResult.rows[0];
    const coupons = couponsResult.rows[0];

    return {
      period,
      startDate,
      endDate,
      generatedAt: new Date(),
      revenue: {
        totalOrders: parseInt(revenue.total_orders, 10) || 0,
        totalRevenue: parseFloat(revenue.total_revenue) || 0,
        totalDiscounts: parseFloat(revenue.total_discounts) || 0,
        totalTax: parseFloat(revenue.total_tax) || 0,
        uniqueCustomers: parseInt(revenue.unique_customers, 10) || 0,
      },
      splits: {
        platform: splits.platform || { totalAmount: 0, count: 0 },
        vendor: splits.vendor || { totalAmount: 0, count: 0 },
        tax: splits.tax || { totalAmount: 0, count: 0 },
      },
      payouts: {
        total: parseInt(payouts.total_payouts, 10) || 0,
        totalAmount: parseFloat(payouts.total_payout_amount) || 0,
        processed: parseInt(payouts.processed_payouts, 10) || 0,
        failed: parseInt(payouts.failed_payouts, 10) || 0,
      },
      refunds: {
        total: parseInt(refunds.total_refunds, 10) || 0,
        totalAmount: parseFloat(refunds.total_refund_amount) || 0,
      },
      coupons: {
        totalRedemptions: parseInt(coupons.total_redemptions, 10) || 0,
        totalDiscountGiven: parseFloat(coupons.total_discount_given) || 0,
      },
    };
  } catch (error) {
    console.error('generateFinanceReports error:', error);
    throw new Error(`Failed to generate finance reports: ${error.message}`);
  }
}

export default generateFinanceReports;


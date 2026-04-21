/**
 * Payment Access Utilities
 * 
 * Helper functions to check if user has paid access to items
 */

import { query } from '@/lib/db/index.js';

/**
 * Check if user has paid access to an item
 * @param {UUID} userId - User ID
 * @param {string} itemType - Item type (course, event, workshop)
 * @param {UUID} itemId - Item ID
 * @returns {Promise<boolean>} True if user has paid access
 */
export async function hasPaidAccess(userId, itemType, itemId) {
  try {
    const result = await query(
      `SELECT id FROM orders
       WHERE user_id = $1 AND item_type = $2 AND item_id = $3 AND status = 'paid'
       LIMIT 1`,
      [userId, itemType, itemId]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('hasPaidAccess error:', error);
    return false;
  }
}

/**
 * Check if item requires payment
 * @param {string} itemType - Item type
 * @param {UUID} itemId - Item ID
 * @returns {Promise<boolean>} True if item requires payment
 */
export async function requiresPayment(itemType, itemId) {
  try {
    let queryText;
    
    switch (itemType) {
      case 'course':
        queryText = `SELECT regular_price, discounted_price, 
                            (SELECT name FROM course_types WHERE id = courses.course_type_id) as course_type_name
                     FROM courses WHERE id = $1`;
        break;
      case 'event':
        queryText = `SELECT is_free, price FROM events WHERE id = $1`;
        break;
      case 'workshop':
        queryText = `SELECT is_free, price FROM workshops WHERE id = $1`;
        break;
      default:
        return false;
    }

    const result = await query(queryText, [itemId]);
    
    if (result.rows.length === 0) {
      return false;
    }

    const item = result.rows[0];

    if (itemType === 'course') {
      const courseTypeName = item.course_type_name?.toLowerCase() || '';
      const isFree = courseTypeName === 'free' || 
                     (!item.regular_price || item.regular_price === 0) && 
                     (!item.discounted_price || item.discounted_price === 0);
      return !isFree;
    } else {
      return !item.is_free && item.price > 0;
    }
  } catch (error) {
    console.error('requiresPayment error:', error);
    return false;
  }
}

/**
 * Get item price
 * @param {string} itemType - Item type
 * @param {UUID} itemId - Item ID
 * @returns {Promise<number>} Item price (0 if free)
 */
export async function getItemPrice(itemType, itemId) {
  try {
    let queryText;
    
    switch (itemType) {
      case 'course':
        queryText = `SELECT regular_price, discounted_price FROM courses WHERE id = $1`;
        break;
      case 'event':
        queryText = `SELECT price FROM events WHERE id = $1`;
        break;
      case 'workshop':
        queryText = `SELECT price FROM workshops WHERE id = $1`;
        break;
      default:
        return 0;
    }

    const result = await query(queryText, [itemId]);
    
    if (result.rows.length === 0) {
      return 0;
    }

    const item = result.rows[0];

    if (itemType === 'course') {
      return item.discounted_price > 0 ? item.discounted_price : item.regular_price;
    } else {
      return item.price || 0;
    }
  } catch (error) {
    console.error('getItemPrice error:', error);
    return 0;
  }
}


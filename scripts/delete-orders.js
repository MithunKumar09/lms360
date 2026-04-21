/**
 * Script to delete orders for a specific user and course
 * Usage: node scripts/delete-orders.js
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
if (existsSync(join(__dirname, '..', '.env.local'))) {
  dotenv.config({ path: join(__dirname, '..', '.env.local') });
} else if (existsSync(join(__dirname, '..', '.env'))) {
  dotenv.config({ path: join(__dirname, '..', '.env') });
}

// Database configuration
function getDbConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl && databaseUrl.trim()) {
    return {
      connectionString: databaseUrl.trim(),
    };
  }

  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_NAME || 'edurock_db';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD;

  if (!password) {
    throw new Error('Database password (DB_PASSWORD) is required. Set it in .env or .env.local');
  }

  return {
    host,
    port,
    database,
    user,
    password: String(password),
  };
}

const USER_ID = '83db91d8-7869-4567-acce-25033c092f2f';
const COURSE_ID = '2bb1012d-6b88-4aef-8780-f883523792e5';

async function deleteOrders() {
  const pool = new Pool(getDbConfig());
  const client = await pool.connect();

  try {
    console.log('🔍 Checking for orders...');
    console.log(`   User ID: ${USER_ID}`);
    console.log(`   Course ID: ${COURSE_ID}\n`);

    // 1. Check what orders exist for this user and course
    const checkQuery = `
      SELECT 
        id,
        razorpay_order_id,
        status,
        item_type,
        item_id,
        created_at,
        updated_at
      FROM orders
      WHERE user_id = $1
      AND item_type = 'course'
      AND item_id = $2
      ORDER BY created_at DESC
    `;

    // Also check by specific order ID from logs
    const specificOrderId = 'c1bbd66a-24c3-4cb7-8053-b14b16643617';
    const razorpayOrderId = 'order_RqE2llDN5NzEGZ';
    
    console.log(`\n🔍 Checking for specific order ID: ${specificOrderId}`);
    console.log(`🔍 Checking for Razorpay order ID: ${razorpayOrderId}\n`);

    const checkSpecificOrder = await client.query(
      `SELECT id, razorpay_order_id, status, user_id, item_type, item_id, created_at 
       FROM orders WHERE id = $1`,
      [specificOrderId]
    );

    const checkRazorpayOrder = await client.query(
      `SELECT id, razorpay_order_id, status, user_id, item_type, item_id, created_at 
       FROM orders WHERE razorpay_order_id = $1`,
      [razorpayOrderId]
    );

    if (checkSpecificOrder.rows.length > 0) {
      console.log(`✅ Found order by ID ${specificOrderId}:`);
      const order = checkSpecificOrder.rows[0];
      console.log(`   User ID: ${order.user_id}`);
      console.log(`   Item Type: ${order.item_type}`);
      console.log(`   Item ID: ${order.item_id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Razorpay Order ID: ${order.razorpay_order_id}\n`);
    } else {
      console.log(`❌ Order ID ${specificOrderId} not found in database\n`);
    }

    if (checkRazorpayOrder.rows.length > 0) {
      console.log(`✅ Found order by Razorpay Order ID ${razorpayOrderId}:`);
      const order = checkRazorpayOrder.rows[0];
      console.log(`   Database ID: ${order.id}`);
      console.log(`   User ID: ${order.user_id}`);
      console.log(`   Item Type: ${order.item_type}`);
      console.log(`   Item ID: ${order.item_id}`);
      console.log(`   Status: ${order.status}\n`);
    } else {
      console.log(`❌ Razorpay Order ID ${razorpayOrderId} not found in database\n`);
    }

    // Check ALL orders for this user
    const allOrdersQuery = await client.query(
      `SELECT id, razorpay_order_id, status, item_type, item_id, created_at 
       FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [USER_ID]
    );

    if (allOrdersQuery.rows.length > 0) {
      console.log(`📋 Found ${allOrdersQuery.rows.length} total order(s) for this user:`);
      allOrdersQuery.rows.forEach((order, index) => {
        console.log(`   ${index + 1}. Order ID: ${order.id}`);
        console.log(`      Item Type: ${order.item_type}, Item ID: ${order.item_id}`);
        console.log(`      Status: ${order.status}, Created: ${order.created_at}\n`);
      });
    }

    const checkResult = await client.query(checkQuery, [USER_ID, COURSE_ID]);
    
    if (checkResult.rows.length === 0) {
      console.log('⚠️  No orders found matching the exact user_id + course_id criteria.\n');
      console.log('💡 If you see orders above, they might have different user_id or item_id values.\n');
      
      // Ask if we should delete the specific order ID
      if (checkSpecificOrder.rows.length > 0) {
        console.log(`🔄 Attempting to delete order by ID: ${specificOrderId}\n`);
        // Continue with deletion by order ID
      } else {
        return;
      }
    }

    console.log(`📋 Found ${checkResult.rows.length} order(s):`);
    checkResult.rows.forEach((order, index) => {
      console.log(`   ${index + 1}. Order ID: ${order.id}`);
      console.log(`      Razorpay Order: ${order.razorpay_order_id}`);
      console.log(`      Status: ${order.status}`);
      console.log(`      Created: ${order.created_at}`);
      console.log('');
    });

    // 2. Begin transaction
    await client.query('BEGIN');

    try {
      console.log('🗑️  Starting deletion...\n');

      // Delete refunds
      const refundsResult = await client.query(
        `DELETE FROM refunds
         WHERE order_id IN (
           SELECT id FROM orders
           WHERE user_id = $1 AND item_type = 'course' AND item_id = $2
         )`,
        [USER_ID, COURSE_ID]
      );
      console.log(`   ✓ Deleted ${refundsResult.rowCount} refund record(s)`);

      // Delete payment_splits
      const splitsResult = await client.query(
        `DELETE FROM payment_splits
         WHERE order_id IN (
           SELECT id FROM orders
           WHERE user_id = $1 AND item_type = 'course' AND item_id = $2
         )`,
        [USER_ID, COURSE_ID]
      );
      console.log(`   ✓ Deleted ${splitsResult.rowCount} payment split record(s)`);

      // Delete payments
      const paymentsResult = await client.query(
        `DELETE FROM payments
         WHERE order_id IN (
           SELECT id FROM orders
           WHERE user_id = $1 AND item_type = 'course' AND item_id = $2
         )`,
        [USER_ID, COURSE_ID]
      );
      console.log(`   ✓ Deleted ${paymentsResult.rowCount} payment record(s)`);

      // Delete orders (by user_id + course_id)
      let ordersResult = await client.query(
        `DELETE FROM orders
         WHERE user_id = $1 AND item_type = 'course' AND item_id = $2`,
        [USER_ID, COURSE_ID]
      );
      console.log(`   ✓ Deleted ${ordersResult.rowCount} order record(s) by user_id + course_id`);

      // Also try deleting by specific order ID if it exists
      const specificOrderId = 'c1bbd66a-24c3-4cb7-8053-b14b16643617';
      const razorpayOrderId = 'order_RqE2llDN5NzEGZ';
      
      const specificOrderResult = await client.query(
        `DELETE FROM orders WHERE id = $1`,
        [specificOrderId]
      );
      if (specificOrderResult.rowCount > 0) {
        console.log(`   ✓ Deleted ${specificOrderResult.rowCount} order record(s) by specific order ID`);
      }

      const razorpayOrderResult = await client.query(
        `DELETE FROM orders WHERE razorpay_order_id = $1`,
        [razorpayOrderId]
      );
      if (razorpayOrderResult.rowCount > 0) {
        console.log(`   ✓ Deleted ${razorpayOrderResult.rowCount} order record(s) by Razorpay order ID`);
      }
      console.log('');

      // Commit transaction
      await client.query('COMMIT');
      console.log('✅ Transaction committed successfully!\n');

      // 3. Verify deletion
      const verifyResult = await client.query(checkQuery, [USER_ID, COURSE_ID]);
      
      if (verifyResult.rows.length === 0) {
        console.log('✅ Verification: All orders deleted successfully!');
      } else {
        console.log(`⚠️  Warning: ${verifyResult.rows.length} order(s) still exist:`);
        verifyResult.rows.forEach((order) => {
          console.log(`   - ${order.id} (${order.status})`);
        });
      }

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('\n❌ Error during deletion. Transaction rolled back.');
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
deleteOrders()
  .then(() => {
    console.log('\n✨ Script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });


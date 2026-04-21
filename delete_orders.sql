-- ============================================================================
-- Delete Orders for Testing
-- This script deletes all orders for a specific user and course
-- Run this in your PostgreSQL database to clear orders for fresh payment testing
-- ============================================================================

-- Set these variables (replace with your actual IDs)
-- User ID: 83db91d8-7869-4567-acce-25033c092f2f
-- Course ID: 2bb1012d-6b88-4aef-8780-f883523792e5

BEGIN;

-- 1. First, delete refunds (if any) - they have RESTRICT constraint
DELETE FROM refunds
WHERE order_id IN (
    SELECT id FROM orders
    WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
    AND item_type = 'course'
    AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5'
);

-- 2. Delete payment_splits (if any) - they reference both payments and orders
-- Note: This will also be handled by CASCADE, but explicit deletion is safer
DELETE FROM payment_splits
WHERE order_id IN (
    SELECT id FROM orders
    WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
    AND item_type = 'course'
    AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5'
);

-- 3. Delete payments - they have RESTRICT constraint on orders
DELETE FROM payments
WHERE order_id IN (
    SELECT id FROM orders
    WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
    AND item_type = 'course'
    AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5'
);

-- 4. Finally, delete the orders themselves
-- Note: course_enrollments.order_id will be set to NULL automatically (ON DELETE SET NULL)
-- Using OR condition to delete orders with either status to catch all
DELETE FROM orders
WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
AND item_type = 'course'
AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5';

-- Verify deletion - this should return 0 rows
SELECT COUNT(*) as remaining_orders
FROM orders
WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
AND item_type = 'course'
AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5';

-- Show what was deleted
SELECT 
    'Orders deleted' as action,
    COUNT(*) as count
FROM orders
WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
AND item_type = 'course'
AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5';

-- Commit the transaction
COMMIT;

-- ============================================================================
-- ALTERNATIVE: Delete ALL orders for this user (for all courses)
-- Uncomment below if you want to delete all orders for this user
-- ============================================================================

/*
BEGIN;

DELETE FROM refunds
WHERE order_id IN (
    SELECT id FROM orders
    WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
);

DELETE FROM payment_splits
WHERE order_id IN (
    SELECT id FROM orders
    WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
);

DELETE FROM payments
WHERE order_id IN (
    SELECT id FROM orders
    WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
);

DELETE FROM orders
WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f';

COMMIT;
*/


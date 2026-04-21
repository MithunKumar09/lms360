-- ============================================================================
-- Comprehensive Order Deletion and Verification Script
-- Run this in pgAdmin Query Tool
-- ============================================================================

-- STEP 1: Show ALL orders for this user/course (before deletion)
SELECT 
    'BEFORE DELETION - Current Orders:' as step,
    id,
    razorpay_order_id,
    status,
    user_id,
    item_type,
    item_id,
    created_at,
    updated_at
FROM orders
WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
AND item_type = 'course'
AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5'
ORDER BY created_at DESC;

-- STEP 2: Check specific order IDs from logs
SELECT 
    'Checking specific order ID:' as step,
    id,
    razorpay_order_id,
    status,
    user_id,
    item_id
FROM orders
WHERE id = 'c1bbd66a-24c3-4cb7-8053-b14b16643617';

SELECT 
    'Checking Razorpay order ID:' as step,
    id,
    razorpay_order_id,
    status,
    user_id,
    item_id
FROM orders
WHERE razorpay_order_id = 'order_RqE2llDN5NzEGZ';

-- STEP 3: BEGIN TRANSACTION and DELETE
BEGIN;

-- Delete refunds
WITH deleted_refunds AS (
    DELETE FROM refunds
    WHERE order_id IN (
        SELECT id FROM orders
        WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
        AND item_type = 'course'
        AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5'
    )
    RETURNING *
)
SELECT 'Refunds deleted:', COUNT(*) FROM deleted_refunds;

-- Delete payment_splits
WITH deleted_splits AS (
    DELETE FROM payment_splits
    WHERE order_id IN (
        SELECT id FROM orders
        WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
        AND item_type = 'course'
        AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5'
    )
    RETURNING *
)
SELECT 'Payment splits deleted:', COUNT(*) FROM deleted_splits;

-- Delete payments
WITH deleted_payments AS (
    DELETE FROM payments
    WHERE order_id IN (
        SELECT id FROM orders
        WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
        AND item_type = 'course'
        AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5'
    )
    RETURNING *
)
SELECT 'Payments deleted:', COUNT(*) FROM deleted_payments;

-- Delete orders
WITH deleted_orders AS (
    DELETE FROM orders
    WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
    AND item_type = 'course'
    AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5'
    RETURNING *
)
SELECT 'Orders deleted:', COUNT(*) FROM deleted_orders;

-- Also delete by specific order ID (in case WHERE clause doesn't match)
WITH deleted_by_id AS (
    DELETE FROM orders
    WHERE id = 'c1bbd66a-24c3-4cb7-8053-b14b16643617'
    RETURNING *
)
SELECT 'Orders deleted by ID:', COUNT(*) FROM deleted_by_id;

-- Also delete by Razorpay order ID
WITH deleted_by_razorpay AS (
    DELETE FROM orders
    WHERE razorpay_order_id = 'order_RqE2llDN5NzEGZ'
    RETURNING *
)
SELECT 'Orders deleted by Razorpay ID:', COUNT(*) FROM deleted_by_razorpay;

-- STEP 4: VERIFY DELETION (should return 0 rows)
SELECT 
    'AFTER DELETION - Remaining Orders:' as step,
    COUNT(*) as remaining_count,
    string_agg(id::text || ' (' || status || ')', ', ') as remaining_order_ids
FROM orders
WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
AND item_type = 'course'
AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5';

-- STEP 5: COMMIT (or ROLLBACK if you want to undo)
COMMIT;

-- STEP 6: Final verification query
SELECT 
    'FINAL VERIFICATION:' as step,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL ORDERS DELETED SUCCESSFULLY'
        ELSE '❌ WARNING: ' || COUNT(*)::text || ' orders still exist!'
    END as status,
    COUNT(*) as count
FROM orders
WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
AND item_type = 'course'
AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5';


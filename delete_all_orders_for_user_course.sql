-- ============================================================================
-- DELETE ALL ORDERS FOR USER AND COURSE (Complete Script)
-- This will delete ALL orders regardless of status for this user/course
-- ============================================================================

BEGIN;

-- Show what will be deleted (before deletion)
SELECT 
    'Orders to be deleted:' as info,
    COUNT(*) as count,
    string_agg(id::text, ', ') as order_ids
FROM orders
WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
AND item_type = 'course'
AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5';

-- 1. Delete refunds (if any)
DELETE FROM refunds
WHERE order_id IN (
    SELECT id FROM orders
    WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
    AND item_type = 'course'
    AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5'
);

-- 2. Delete payment_splits
DELETE FROM payment_splits
WHERE order_id IN (
    SELECT id FROM orders
    WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
    AND item_type = 'course'
    AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5'
);

-- 3. Delete payments
DELETE FROM payments
WHERE order_id IN (
    SELECT id FROM orders
    WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
    AND item_type = 'course'
    AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5'
);

-- 4. Delete orders
DELETE FROM orders
WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
AND item_type = 'course'
AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5';

-- Verify deletion (should return 0)
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All orders deleted successfully'
        ELSE '❌ Warning: ' || COUNT(*)::text || ' orders still exist'
    END as deletion_status,
    COUNT(*) as remaining_count,
    string_agg(id::text || ' (' || status || ')', ', ') as remaining_orders
FROM orders
WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
AND item_type = 'course'
AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5';

COMMIT;


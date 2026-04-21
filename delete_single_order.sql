-- Delete the specific new order that appeared
-- Order ID: c1bbd66a-24c3-4cb7-8053-b14b16643617

BEGIN;

-- 1. Delete refunds for this specific order
DELETE FROM refunds
WHERE order_id = 'c1bbd66a-24c3-4cb7-8053-b14b16643617';

-- 2. Delete payment_splits for this specific order
DELETE FROM payment_splits
WHERE order_id = 'c1bbd66a-24c3-4cb7-8053-b14b16643617';

-- 3. Delete payments for this specific order
DELETE FROM payments
WHERE order_id = 'c1bbd66a-24c3-4cb7-8053-b14b16643617';

-- 4. Delete the order itself
DELETE FROM orders
WHERE id = 'c1bbd66a-24c3-4cb7-8053-b14b16643617';

-- Verify it's deleted
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Order deleted successfully'
        ELSE '❌ Order still exists: ' || COUNT(*)::text || ' orders found'
    END as status
FROM orders
WHERE id = 'c1bbd66a-24c3-4cb7-8053-b14b16643617';

COMMIT;


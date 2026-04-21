-- Check if orders still exist for this user and course
SELECT 
    id,
    razorpay_order_id,
    status,
    item_type,
    item_id,
    user_id,
    created_at,
    updated_at
FROM orders
WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
AND item_type = 'course'
AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5'
ORDER BY created_at DESC;

-- Count how many orders exist
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_orders,
    COUNT(CASE WHEN status = 'created' THEN 1 END) as created_orders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
FROM orders
WHERE user_id = '83db91d8-7869-4567-acce-25033c092f2f'
AND item_type = 'course'
AND item_id = '2bb1012d-6b88-4aef-8780-f883523792e5';


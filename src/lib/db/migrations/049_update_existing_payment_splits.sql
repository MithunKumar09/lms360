-- ============================================================================
-- Migration: 049_update_existing_payment_splits.sql
-- Description: Update existing payment_splits to correct entity_type and entity_id
-- Created: 2025-01-27
-- Dependencies: 045_update_payment_splits_entity_type.sql, 039_payment_schema.sql
-- ============================================================================
-- 
-- This migration updates existing payment_splits to have the correct entity_type
-- and entity_id based on who created the content:
--
-- Rules:
-- 1. If vendor created: entity_type = 'vendor', entity_id = vendor_user_id (keep as is)
-- 2. If admin created: entity_type = 'organization', entity_id = org_id
-- 3. If instructor created: entity_type = 'organization', entity_id = org_id
-- 4. If superadmin created: entity_type = 'superadmin', entity_id = superadmin_user_id
--
-- Only updates splits where entity_type = 'vendor' (existing vendor splits)
-- Platform, tax, and fee splits are left unchanged
-- ============================================================================

-- Update payment splits for admin-created content
UPDATE payment_splits ps
SET 
    entity_type = 'organization',
    entity_id = (
        CASE ps.order_id
            WHEN (
                SELECT o.id 
                FROM orders o 
                JOIN courses c ON c.id = o.item_id AND o.item_type = 'course'
                WHERE o.id = ps.order_id
            ) THEN (
                SELECT c.org_id 
                FROM orders o 
                JOIN courses c ON c.id = o.item_id AND o.item_type = 'course'
                WHERE o.id = ps.order_id
                  AND EXISTS (
                      SELECT 1 FROM users u 
                      WHERE u.id = c.created_by AND u.role = 'admin'
                  )
            )
            ELSE NULL
        END
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE ps.entity_type = 'vendor'
  AND EXISTS (
      SELECT 1 
      FROM orders o
      JOIN courses c ON c.id = o.item_id AND o.item_type = 'course'
      JOIN users u ON u.id = c.created_by
      WHERE o.id = ps.order_id
        AND u.role = 'admin'
        AND c.org_id IS NOT NULL
  );

-- Update payment splits for instructor-created content
UPDATE payment_splits ps
SET 
    entity_type = 'organization',
    entity_id = (
        SELECT c.org_id 
        FROM orders o 
        JOIN courses c ON c.id = o.item_id AND o.item_type = 'course'
        JOIN users u ON u.id = c.created_by
        WHERE o.id = ps.order_id
          AND u.role = 'instructor'
          AND c.org_id IS NOT NULL
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE ps.entity_type = 'vendor'
  AND EXISTS (
      SELECT 1 
      FROM orders o
      JOIN courses c ON c.id = o.item_id AND o.item_type = 'course'
      JOIN users u ON u.id = c.created_by
      WHERE o.id = ps.order_id
        AND u.role = 'instructor'
        AND c.org_id IS NOT NULL
  );

-- Update payment splits for superadmin-created content
UPDATE payment_splits ps
SET 
    entity_type = 'superadmin',
    entity_id = (
        SELECT c.created_by 
        FROM orders o 
        JOIN courses c ON c.id = o.item_id AND o.item_type = 'course'
        JOIN users u ON u.id = c.created_by
        WHERE o.id = ps.order_id
          AND u.role = 'superadmin'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE ps.entity_type = 'vendor'
  AND EXISTS (
      SELECT 1 
      FROM orders o
      JOIN courses c ON c.id = o.item_id AND o.item_type = 'course'
      JOIN users u ON u.id = c.created_by
      WHERE o.id = ps.order_id
        AND u.role = 'superadmin'
  );

-- Handle events (if events table exists and has created_by and organization_id)
DO $$
BEGIN
    -- Update payment splits for admin-created events
    UPDATE payment_splits ps
    SET 
        entity_type = 'organization',
        entity_id = (
            SELECT e.organization_id 
            FROM orders o 
            JOIN events e ON e.id = o.item_id AND o.item_type = 'event'
            JOIN users u ON u.id = e.created_by
            WHERE o.id = ps.order_id
              AND u.role = 'admin'
              AND e.organization_id IS NOT NULL
            LIMIT 1
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE ps.entity_type = 'vendor'
      AND EXISTS (
          SELECT 1 
          FROM orders o
          JOIN events e ON e.id = o.item_id AND o.item_type = 'event'
          JOIN users u ON u.id = e.created_by
          WHERE o.id = ps.order_id
            AND u.role = 'admin'
            AND e.organization_id IS NOT NULL
      );

    -- Update payment splits for instructor-created events
    UPDATE payment_splits ps
    SET 
        entity_type = 'organization',
        entity_id = (
            SELECT e.organization_id 
            FROM orders o 
            JOIN events e ON e.id = o.item_id AND o.item_type = 'event'
            JOIN users u ON u.id = e.created_by
            WHERE o.id = ps.order_id
              AND u.role = 'instructor'
              AND e.organization_id IS NOT NULL
            LIMIT 1
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE ps.entity_type = 'vendor'
      AND EXISTS (
          SELECT 1 
          FROM orders o
          JOIN events e ON e.id = o.item_id AND o.item_type = 'event'
          JOIN users u ON u.id = e.created_by
          WHERE o.id = ps.order_id
            AND u.role = 'instructor'
            AND e.organization_id IS NOT NULL
      );

    -- Update payment splits for superadmin-created events
    UPDATE payment_splits ps
    SET 
        entity_type = 'superadmin',
        entity_id = (
            SELECT e.created_by 
            FROM orders o 
            JOIN events e ON e.id = o.item_id AND o.item_type = 'event'
            JOIN users u ON u.id = e.created_by
            WHERE o.id = ps.order_id
              AND u.role = 'superadmin'
            LIMIT 1
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE ps.entity_type = 'vendor'
      AND EXISTS (
          SELECT 1 
          FROM orders o
          JOIN events e ON e.id = o.item_id AND o.item_type = 'event'
          JOIN users u ON u.id = e.created_by
          WHERE o.id = ps.order_id
            AND u.role = 'superadmin'
      );
EXCEPTION
    WHEN undefined_table THEN
        -- Events table doesn't exist, skip
        NULL;
END $$;

-- Handle workshops (if workshops table exists and has created_by and organization_id)
DO $$
BEGIN
    -- Update payment splits for admin-created workshops
    UPDATE payment_splits ps
    SET 
        entity_type = 'organization',
        entity_id = (
            SELECT w.organization_id 
            FROM orders o 
            JOIN workshops w ON w.id = o.item_id AND o.item_type = 'workshop'
            JOIN users u ON u.id = w.created_by
            WHERE o.id = ps.order_id
              AND u.role = 'admin'
              AND w.organization_id IS NOT NULL
            LIMIT 1
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE ps.entity_type = 'vendor'
      AND EXISTS (
          SELECT 1 
          FROM orders o
          JOIN workshops w ON w.id = o.item_id AND o.item_type = 'workshop'
          JOIN users u ON u.id = w.created_by
          WHERE o.id = ps.order_id
            AND u.role = 'admin'
            AND w.organization_id IS NOT NULL
      );

    -- Update payment splits for instructor-created workshops
    UPDATE payment_splits ps
    SET 
        entity_type = 'organization',
        entity_id = (
            SELECT w.organization_id 
            FROM orders o 
            JOIN workshops w ON w.id = o.item_id AND o.item_type = 'workshop'
            JOIN users u ON u.id = w.created_by
            WHERE o.id = ps.order_id
              AND u.role = 'instructor'
              AND w.organization_id IS NOT NULL
            LIMIT 1
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE ps.entity_type = 'vendor'
      AND EXISTS (
          SELECT 1 
          FROM orders o
          JOIN workshops w ON w.id = o.item_id AND o.item_type = 'workshop'
          JOIN users u ON u.id = w.created_by
          WHERE o.id = ps.order_id
            AND u.role = 'instructor'
            AND w.organization_id IS NOT NULL
      );

    -- Update payment splits for superadmin-created workshops
    UPDATE payment_splits ps
    SET 
        entity_type = 'superadmin',
        entity_id = (
            SELECT w.created_by 
            FROM orders o 
            JOIN workshops w ON w.id = o.item_id AND o.item_type = 'workshop'
            JOIN users u ON u.id = w.created_by
            WHERE o.id = ps.order_id
              AND u.role = 'superadmin'
            LIMIT 1
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE ps.entity_type = 'vendor'
      AND EXISTS (
          SELECT 1 
          FROM orders o
          JOIN workshops w ON w.id = o.item_id AND o.item_type = 'workshop'
          JOIN users u ON u.id = w.created_by
          WHERE o.id = ps.order_id
            AND u.role = 'superadmin'
      );
EXCEPTION
    WHEN undefined_table THEN
        -- Workshops table doesn't exist, skip
        NULL;
END $$;

-- ============================================================================
-- VERIFICATION QUERY (run separately to verify)
-- ============================================================================
-- SELECT 
--     ps.entity_type,
--     COUNT(*) as count,
--     SUM(ps.amount) as total_amount
-- FROM payment_splits ps
-- WHERE ps.entity_type IN ('vendor', 'organization', 'superadmin')
-- GROUP BY ps.entity_type
-- ORDER BY ps.entity_type;
-- ============================================================================

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


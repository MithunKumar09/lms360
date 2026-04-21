-- ============================================================================
-- Migration: 042_add_order_linking_to_enrollments.sql
-- Description: Add order_id, payment_status, and enrolled_via fields to course_enrollments table
-- Created: 2025-01-XX
-- Dependencies: 017_course_enrollments_schema.sql, 039_payment_schema.sql
-- ============================================================================

-- Add order_id column to link enrollments to payment orders
ALTER TABLE course_enrollments
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- Add payment_status column to track payment state
ALTER TABLE course_enrollments
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'free'
CHECK (payment_status IN ('free', 'paid', 'refunded'));

-- Add enrolled_via column to track enrollment source
ALTER TABLE course_enrollments
ADD COLUMN IF NOT EXISTS enrolled_via VARCHAR(50) DEFAULT 'manual'
CHECK (enrolled_via IN ('manual', 'payment', 'invitation'));

-- Add index on order_id for performance
CREATE INDEX IF NOT EXISTS idx_course_enrollments_order_id ON course_enrollments(order_id) WHERE order_id IS NOT NULL;

-- Add composite index for common queries (order_id + payment_status)
CREATE INDEX IF NOT EXISTS idx_course_enrollments_order_payment ON course_enrollments(order_id, payment_status) WHERE order_id IS NOT NULL;

-- Update existing enrollments: Set enrolled_via to 'manual' for existing records (already default, but explicit)
-- Note: We can't automatically determine payment_status for existing records, so they remain 'free' (default)

-- Comments
COMMENT ON COLUMN course_enrollments.order_id IS 'Reference to the payment order that created this enrollment (NULL for free enrollments)';
COMMENT ON COLUMN course_enrollments.payment_status IS 'Payment status: free, paid, or refunded';
COMMENT ON COLUMN course_enrollments.enrolled_via IS 'Enrollment source: manual, payment (via webhook), or invitation';


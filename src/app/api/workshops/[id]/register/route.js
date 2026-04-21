/**
 * Workshop Registration API Route
 * 
 * POST /api/workshops/[id]/register - Register for a workshop
 * GET /api/workshops/[id]/register - Check registration status
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { hasPaidAccess } from '@/lib/utils/paymentAccess.js';

/**
 * POST /api/workshops/[id]/register
 * Register for a workshop
 */
export async function POST(request, { params }) {
  try {
    const session = await requireRole(request, ['student', 'alumni', 'parent']);
    const userId = session.user.id;
    const workshopId = params.id;

    if (!workshopId) {
      return NextResponse.json(
        { success: false, error: 'Workshop ID is required' },
        { status: 400 }
      );
    }

    // Verify workshop exists and is published
    const workshopCheck = await query(
      `SELECT id, title, is_free, price, status, capacity,
              (SELECT COUNT(*) FROM workshop_registrations WHERE workshop_id = workshops.id) as current_registrations
       FROM workshops 
       WHERE id = $1 AND status = 'published'`,
      [workshopId]
    );

    if (workshopCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Workshop not found or not available for registration' },
        { status: 404 }
      );
    }

    const workshop = workshopCheck.rows[0];

    // Check capacity
    if (workshop.capacity && parseInt(workshop.current_registrations) >= parseInt(workshop.capacity)) {
      return NextResponse.json(
        { success: false, error: 'Workshop is full' },
        { status: 400 }
      );
    }

    // Check if already registered
    const existingRegistration = await query(
      `SELECT id, registration_status, payment_status FROM workshop_registrations
       WHERE workshop_id = $1 AND user_id = $2`,
      [workshopId, userId]
    );

    if (existingRegistration.rows.length > 0) {
      const reg = existingRegistration.rows[0];
      if (reg.registration_status !== 'cancelled') {
        return NextResponse.json(
          { success: false, error: 'Already registered for this workshop' },
          { status: 400 }
        );
      }
    }

    // For paid workshops, check payment
    if (!workshop.is_free && workshop.price > 0) {
      const hasPaid = await hasPaidAccess(userId, 'workshop', workshopId);
      
      if (!hasPaid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Payment required. Please complete payment to register for this workshop.',
            requiresPayment: true,
            workshop: {
              id: workshop.id,
              title: workshop.title,
              price: workshop.price,
              isFree: false,
            },
          },
          { status: 402 } // 402 Payment Required
        );
      }

      // Get paid order
      const orderResult = await query(
        `SELECT id FROM orders
         WHERE user_id = $1 AND item_type = 'workshop' AND item_id = $2 AND status = 'paid'
         ORDER BY created_at DESC LIMIT 1`,
        [userId, workshopId]
      );

      const orderId = orderResult.rows.length > 0 ? orderResult.rows[0].id : null;

      // Create registration with order link
      const registrationResult = await query(
        `INSERT INTO workshop_registrations (
          workshop_id, user_id, order_id, registration_status, payment_status
        ) VALUES ($1, $2, $3, 'registered', 'paid')
        ON CONFLICT (workshop_id, user_id) DO UPDATE SET
          registration_status = 'registered',
          payment_status = 'paid',
          order_id = COALESCE(EXCLUDED.order_id, workshop_registrations.order_id),
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, registered_at, registration_status, payment_status`,
        [workshopId, userId, orderId]
      );

      return NextResponse.json({
        success: true,
        message: 'Successfully registered for workshop',
        registration: registrationResult.rows[0],
      });
    } else {
      // Free workshop - register directly
      const registrationResult = await query(
        `INSERT INTO workshop_registrations (
          workshop_id, user_id, registration_status, payment_status
        ) VALUES ($1, $2, 'registered', 'paid')
        ON CONFLICT (workshop_id, user_id) DO UPDATE SET
          registration_status = 'registered',
          payment_status = 'paid',
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, registered_at, registration_status, payment_status`,
        [workshopId, userId]
      );

      return NextResponse.json({
        success: true,
        message: 'Successfully registered for workshop',
        registration: registrationResult.rows[0],
      });
    }
  } catch (error) {
    console.error('Workshop registration error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to register for workshop' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workshops/[id]/register
 * Check registration status
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['student', 'alumni', 'parent']);
    const userId = session.user.id;
    const workshopId = params.id;

    const registrationResult = await query(
      `SELECT * FROM workshop_registrations WHERE workshop_id = $1 AND user_id = $2`,
      [workshopId, userId]
    );

    if (registrationResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        isRegistered: false,
      });
    }

    return NextResponse.json({
      success: true,
      isRegistered: true,
      registration: registrationResult.rows[0],
    });
  } catch (error) {
    console.error('Check workshop registration error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check registration' },
      { status: 500 }
    );
  }
}


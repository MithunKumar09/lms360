/**
 * Event Registration API Route
 * 
 * POST /api/events/[id]/register - Register for an event
 * GET /api/events/[id]/register - Check registration status
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { hasPaidAccess } from '@/lib/utils/paymentAccess.js';

/**
 * POST /api/events/[id]/register
 * Register for an event
 */
export async function POST(request, { params }) {
  try {
    const session = await requireRole(request, ['student', 'alumni', 'parent']);
    const userId = session.user.id;
    const eventId = params.id;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Verify event exists and is published
    const eventCheck = await query(
      `SELECT id, title, is_free, price, status, capacity,
              (SELECT COUNT(*) FROM event_registrations WHERE event_id = events.id) as current_registrations
       FROM events 
       WHERE id = $1 AND status = 'published'`,
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Event not found or not available for registration' },
        { status: 404 }
      );
    }

    const event = eventCheck.rows[0];

    // Check capacity
    if (event.capacity && parseInt(event.current_registrations) >= parseInt(event.capacity)) {
      return NextResponse.json(
        { success: false, error: 'Event is full' },
        { status: 400 }
      );
    }

    // Check if already registered
    const existingRegistration = await query(
      `SELECT id, registration_status, payment_status FROM event_registrations
       WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId]
    );

    if (existingRegistration.rows.length > 0) {
      const reg = existingRegistration.rows[0];
      if (reg.registration_status !== 'cancelled') {
        return NextResponse.json(
          { success: false, error: 'Already registered for this event' },
          { status: 400 }
        );
      }
    }

    // For paid events, check payment
    if (!event.is_free && event.price > 0) {
      const hasPaid = await hasPaidAccess(userId, 'event', eventId);
      
      if (!hasPaid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Payment required. Please complete payment to register for this event.',
            requiresPayment: true,
            event: {
              id: event.id,
              title: event.title,
              price: event.price,
              isFree: false,
            },
          },
          { status: 402 } // 402 Payment Required
        );
      }

      // Get paid order
      const orderResult = await query(
        `SELECT id FROM orders
         WHERE user_id = $1 AND item_type = 'event' AND item_id = $2 AND status = 'paid'
         ORDER BY created_at DESC LIMIT 1`,
        [userId, eventId]
      );

      const orderId = orderResult.rows.length > 0 ? orderResult.rows[0].id : null;

      // Create registration with order link
      const registrationResult = await query(
        `INSERT INTO event_registrations (
          event_id, user_id, order_id, registration_status, payment_status
        ) VALUES ($1, $2, $3, 'registered', 'paid')
        ON CONFLICT (event_id, user_id) DO UPDATE SET
          registration_status = 'registered',
          payment_status = 'paid',
          order_id = COALESCE(EXCLUDED.order_id, event_registrations.order_id),
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, registered_at, registration_status, payment_status`,
        [eventId, userId, orderId]
      );

      return NextResponse.json({
        success: true,
        message: 'Successfully registered for event',
        registration: registrationResult.rows[0],
      });
    } else {
      // Free event - register directly
      const registrationResult = await query(
        `INSERT INTO event_registrations (
          event_id, user_id, registration_status, payment_status
        ) VALUES ($1, $2, 'registered', 'paid')
        ON CONFLICT (event_id, user_id) DO UPDATE SET
          registration_status = 'registered',
          payment_status = 'paid',
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, registered_at, registration_status, payment_status`,
        [eventId, userId]
      );

      return NextResponse.json({
        success: true,
        message: 'Successfully registered for event',
        registration: registrationResult.rows[0],
      });
    }
  } catch (error) {
    console.error('Event registration error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to register for event' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/[id]/register
 * Check registration status
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['student', 'alumni', 'parent']);
    const userId = session.user.id;
    const eventId = params.id;

    const registrationResult = await query(
      `SELECT * FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId]
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
    console.error('Check event registration error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check registration' },
      { status: 500 }
    );
  }
}


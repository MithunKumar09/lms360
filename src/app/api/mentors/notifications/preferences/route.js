/**
 * Notification Preferences API Route
 * 
 * GET /api/mentors/notifications/preferences - Get notification preferences
 * PUT /api/mentors/notifications/preferences - Update notification preferences
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/mentors/notifications/preferences
 * Get notification preferences for mentor
 */
export async function GET(request) {
  try {
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    // Get preferences
    const result = await query(
      `SELECT 
        notification_type,
        enabled,
        channel
       FROM notification_preferences
       WHERE mentor_id = $1
       ORDER BY notification_type`,
      [mentorId]
    );

    // If no preferences exist, return defaults
    if (result.rows.length === 0) {
      const defaultPreferences = [
        { notification_type: 'new_registration', enabled: true, channel: 'in_app' },
        { notification_type: 'new_application', enabled: true, channel: 'in_app' },
        { notification_type: 'capacity_warning', enabled: true, channel: 'in_app' },
        { notification_type: 'capacity_full', enabled: true, channel: 'in_app' },
        { notification_type: 'event_reminder', enabled: true, channel: 'in_app' },
        { notification_type: 'workshop_reminder', enabled: true, channel: 'in_app' },
        { notification_type: 'application_status_change', enabled: true, channel: 'in_app' },
        { notification_type: 'system_announcement', enabled: true, channel: 'in_app' },
      ];

      return NextResponse.json({
        success: true,
        data: {
          preferences: defaultPreferences,
        },
      });
    }

    const preferences = result.rows.map(row => ({
      notification_type: row.notification_type,
      enabled: row.enabled,
      channel: row.channel,
    }));

    return NextResponse.json({
      success: true,
      data: {
        preferences,
      },
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mentors/notifications/preferences
 * Update notification preferences
 */
export async function PUT(request) {
  try {
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    const body = await request.json();
    const { preferences } = body;

    if (!preferences || !Array.isArray(preferences)) {
      return NextResponse.json(
        { success: false, error: 'Preferences array is required' },
        { status: 400 }
      );
    }

    // Validate and update preferences
    const validTypes = [
      'new_registration',
      'new_application',
      'capacity_warning',
      'capacity_full',
      'event_reminder',
      'workshop_reminder',
      'application_status_change',
      'system_announcement',
    ];

    const validChannels = ['in_app', 'email', 'both'];

    for (const pref of preferences) {
      if (!validTypes.includes(pref.notification_type)) {
        return NextResponse.json(
          { success: false, error: `Invalid notification type: ${pref.notification_type}` },
          { status: 400 }
        );
      }

      if (!validChannels.includes(pref.channel)) {
        return NextResponse.json(
          { success: false, error: `Invalid channel: ${pref.channel}` },
          { status: 400 }
        );
      }

      // Upsert preference
      await query(
        `INSERT INTO notification_preferences (mentor_id, notification_type, enabled, channel)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (mentor_id, notification_type)
         DO UPDATE SET
           enabled = EXCLUDED.enabled,
           channel = EXCLUDED.channel,
           updated_at = CURRENT_TIMESTAMP`,
        [mentorId, pref.notification_type, pref.enabled, pref.channel]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully',
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

/**
 * Bulk Events Operations API Route
 * 
 * POST /api/events/bulk - Perform bulk operations on events
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getClient } from '@/lib/db/index.js';

/**
 * POST /api/events/bulk
 * Perform bulk operations on events
 * Operations: delete, update_status, export
 */
export async function POST(request) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    const body = await request.json();
    const { operation, event_ids, data } = body;

    if (!operation) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Operation is required' },
        { status: 400 }
      );
    }

    if (!event_ids || !Array.isArray(event_ids) || event_ids.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Event IDs array is required' },
        { status: 400 }
      );
    }

    // Verify all events belong to mentor
    const eventCheck = await client.query(
      `SELECT id, title FROM events WHERE id = ANY($1::uuid[]) AND created_by = $2`,
      [event_ids, mentorId]
    );

    if (eventCheck.rows.length !== event_ids.length) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Some events not found or you do not have permission' },
        { status: 403 }
      );
    }

    const results = {
      success: [],
      failed: [],
    };

    switch (operation) {
      case 'delete':
        // Delete events (cascade will handle related records)
        for (const eventId of event_ids) {
          try {
            await client.query('DELETE FROM events WHERE id = $1', [eventId]);
            results.success.push({ id: eventId, operation: 'deleted' });
          } catch (error) {
            console.error(`Failed to delete event ${eventId}:`, error);
            results.failed.push({ id: eventId, error: error.message });
          }
        }
        break;

      case 'update_status':
        if (!data || !data.status) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { success: false, error: 'Status is required for update_status operation' },
            { status: 400 }
          );
        }

        const validStatuses = ['draft', 'published', 'cancelled'];
        if (!validStatuses.includes(data.status)) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { success: false, error: 'Invalid status' },
            { status: 400 }
          );
        }

        for (const eventId of event_ids) {
          try {
            await client.query(
              'UPDATE events SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
              [data.status, eventId]
            );
            results.success.push({ id: eventId, operation: 'status_updated', status: data.status });
          } catch (error) {
            console.error(`Failed to update event ${eventId}:`, error);
            results.failed.push({ id: eventId, error: error.message });
          }
        }
        break;

      default:
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: `Unknown operation: ${operation}` },
          { status: 400 }
        );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: `Bulk ${operation} completed`,
      results: {
        total: event_ids.length,
        successful: results.success.length,
        failed: results.failed.length,
        details: results,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk events operation error:', error);

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to perform bulk operation' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

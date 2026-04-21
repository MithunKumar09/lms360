/**
 * Brand Event Registrations Export API Route
 * 
 * GET /api/brand/events/[id]/registrations/export - Export registrations as CSV/Excel
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getBrandEventRegistrations } from '@/lib/db/brand/registrations.js';
import { generateCSV, generateXLSX } from '@/lib/utils/fileParser.js';

export async function GET(request, { params }) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    const { id: eventId } = params;

    // Parse format from query parameter (default: csv)
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format')?.toLowerCase() || 'csv';
    const status = searchParams.get('status') || null;
    const paymentStatus = searchParams.get('paymentStatus') || null;
    const search = searchParams.get('search') || null;

    if (!['csv', 'xlsx'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Format must be csv or xlsx' },
        { status: 400 }
      );
    }

    // Fetch all registrations (with pagination)
    const allRegistrations = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await getBrandEventRegistrations(userId, eventId, {
        page: currentPage,
        limit: 1000,
        status,
        paymentStatus,
        search,
      });

      if (result.registrations.length === 0) {
        hasMore = false;
        break;
      }

      // Transform registrations for export
      for (const reg of result.registrations) {
        allRegistrations.push({
          registration_id: reg.id,
          student_name: reg.user.name,
          student_email: reg.user.email,
          registration_status: reg.registrationStatus,
          payment_status: reg.paymentStatus,
          registered_at: reg.registeredAt ? new Date(reg.registeredAt).toISOString() : '',
          slot_number: reg.slotNumber || '',
          waitlist_position: reg.waitlistPosition || '',
          order_id: reg.orderId || '',
        });
      }

      hasMore = result.pagination.hasNext;
      currentPage++;

      // Safety limit: max 10,000 registrations per export
      if (allRegistrations.length >= 10000) {
        break;
      }
    }

    // Define headers
    const headerNames = [
      'Registration ID',
      'Student Name',
      'Student Email',
      'Registration Status',
      'Payment Status',
      'Registered At',
      'Slot Number',
      'Waitlist Position',
      'Order ID',
    ];

    // Generate file content
    let content;
    let contentType;
    let filename;

    if (format === 'xlsx') {
      try {
        content = await generateXLSX(allRegistrations, headerNames, { sheetName: 'Registrations' });
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `event-registrations-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      } catch (error) {
        console.warn('XLSX library not available, falling back to CSV:', error.message);
        content = generateCSV(allRegistrations, headerNames);
        contentType = 'text/csv';
        filename = `event-registrations-export-${new Date().toISOString().split('T')[0]}.csv`;
      }
    } else {
      content = generateCSV(allRegistrations, headerNames);
      contentType = 'text/csv';
      filename = `event-registrations-export-${new Date().toISOString().split('T')[0]}.csv`;
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting brand event registrations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to export registrations',
      },
      { status: error.status || 500 }
    );
  }
}

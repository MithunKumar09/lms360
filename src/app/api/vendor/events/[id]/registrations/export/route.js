/**
 * Vendor Event Registrations Export API Route
 * 
 * GET /api/vendor/events/[id]/registrations/export - Export event registrations
 * 
 * Query Parameters:
 * - format: csv or xlsx (default: csv)
 * - All filter parameters from the list endpoint
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getVendorEventRegistrations } from '@/lib/db/vendor/events.js';
import { generateCSV, generateXLSX } from '@/lib/utils/fileParser.js';
import {
  formatDateForExport,
  formatRegistrationStatusForExport,
  formatPaymentStatusForExport,
  sanitizeForExport,
} from '@/lib/export/exportHelpers.js';

export async function GET(request, { params }) {
  try {
    // Authentication: Only vendors
    const session = await requireRole(request, ['vendor']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    if (!params || !params.id) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    const vendorId = session.user.id;
    const eventId = params.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const limit = 10000; // Large limit for export

    // Get all registrations (with pagination to handle large datasets)
    const allRegistrations = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await getVendorEventRegistrations(vendorId, eventId, {
        page: currentPage,
        limit,
        status: searchParams.get('status') || null,
        paymentStatus: searchParams.get('paymentStatus') || null,
        search: searchParams.get('search') || null,
      });

      if (Array.isArray(result?.registrations)) {
        allRegistrations.push(...result.registrations);
      }
      hasMore = result?.pagination?.hasNext || false;
      currentPage++;

      // Safety limit: prevent infinite loops
      if (currentPage > 100) {
        break;
      }
    }

    // Prepare export data
    const headers = [
      'Student Name',
      'Email',
      'Slot Number',
      'Waitlist Position',
      'Registration Date',
      'Status',
      'Payment Status',
    ];

    const exportData = Array.isArray(allRegistrations)
      ? allRegistrations
          .filter(registration => registration && typeof registration === 'object' && registration.user)
          .map((registration) => ({
      'Student Name': sanitizeForExport(registration.user?.fullName || 'N/A'),
      'Email': sanitizeForExport(registration.user?.email || 'N/A'),
      'Slot Number': registration.slotNumber || 'N/A',
      'Waitlist Position': registration.waitlistPosition || 'N/A',
      'Registration Date': formatDateForExport(
        registration.registeredAt,
        'YYYY-MM-DD HH:mm:ss'
      ),
      'Status': formatRegistrationStatusForExport(
        registration.registrationStatus
      ),
      'Payment Status': formatPaymentStatusForExport(
        registration.paymentStatus
      ),
    }))
      : [];

    // Generate file content
    let content;
    let contentType;
    let filename;

    if (format === 'xlsx') {
      try {
        content = await generateXLSX(exportData, headers, {
          sheetName: 'Event Registrations',
        });
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `event-registrations-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      } catch (error) {
        console.warn('XLSX generation failed, falling back to CSV:', error);
        content = generateCSV(exportData, headers);
        contentType = 'text/csv';
        filename = `event-registrations-export-${new Date().toISOString().split('T')[0]}.csv`;
      }
    } else {
      content = generateCSV(exportData, headers);
      contentType = 'text/csv';
      filename = `event-registrations-export-${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📋 [EXPORT] Exported event registrations:', {
        count: exportData.length,
        format,
        eventId,
      });
    }

    // Create response with file download
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Error exporting event registrations:', error);

    if (error.message.includes('not found') || error.message.includes('does not belong')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Vendor access required.',
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to export event registrations',
      },
      { status: error.status || 500 }
    );
  }
}

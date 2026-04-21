/**
 * Organization Template Download Route
 * 
 * Provides CSV and XLSX template downloads for bulk import.
 * Only superadmin users can download templates.
 * 
 * GET /api/organizations/template?format=csv
 * GET /api/organizations/template?format=xlsx
 * 
 * Note: For XLSX, xlsx library must be installed (npm install xlsx)
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getOrganizationTemplateHeaders, generateCSV, generateXLSX } from '@/lib/utils/fileParser.js';

/**
 * Create sample data row for template
 */
function createSampleRow() {
  return {
    name: 'Example University',
    slug: 'example-university',
    org_type: 'university',
    display_name: 'Example University - Main Campus',
    org_code: 'EXU001',
    country: 'India',
    state: 'Karnataka',
    city: 'Bangalore',
    timezone: 'Asia/Kolkata',
    default_locale: 'en-IN',
    currency: 'INR',
    academic_year_start_month: '6',
    academic_levels: 'degree,engineering,post_graduation',
    primary_admin_name: 'John Doe',
    primary_admin_email: 'john.doe@example.edu',
    contact_email: 'contact@example.edu',
    contact_phone: '+91-80-12345678',
    website_url: 'https://example.edu',
    header_logo_url: 'https://example.com/logo.png',
    square_icon_url: 'https://example.com/icon.png',
    splash_image_url: '',
    loading_mark_url: '',
    status: 'active',
  };
}

/**
 * GET /api/organizations/template
 */
export async function GET(request) {
  try {
    // Authentication: Only superadmin
    await requireSuperadmin(request);

    // Parse format from query parameter (default: csv)
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format')?.toLowerCase() || 'csv';

    // Get headers and sample data
    const headers = getOrganizationTemplateHeaders();
    const headerNames = headers.map((h) => h.label);
    const sampleRow = createSampleRow();

    // Generate file content
    let content;
    let contentType;
    let filename;

    if (format === 'xlsx') {
      // Generate XLSX
      try {
        content = await generateXLSX([sampleRow], headerNames, { sheetName: 'Organizations' });
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = 'organizations-template.xlsx';
      } catch (error) {
        // If xlsx library not available, return CSV instead
        console.warn('⚠️  XLSX library not available, falling back to CSV:', error.message);
        content = generateCSV([sampleRow], headerNames);
        contentType = 'text/csv';
        filename = 'organizations-template.csv';
      }
    } else {
      // Generate CSV (default)
      content = generateCSV([sampleRow], headerNames);
      contentType = 'text/csv';
      filename = 'organizations-template.csv';
    }

    // Create response with file download
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);

    // Handle authentication errors
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Superadmin access required.',
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate template',
      },
      { status: 500 }
    );
  }
}


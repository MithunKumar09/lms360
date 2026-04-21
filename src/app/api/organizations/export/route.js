/**
 * Organizations Export API Route
 * 
 * Exports organizations to CSV or XLSX format.
 * Streams response for large datasets.
 * 
 * GET /api/organizations/export.csv
 * GET /api/organizations/export.xlsx
 * 
 * Query params:
 * - ?from=2024-01-01&to=2024-12-31&status=active&format=csv|xlsx
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { listOrganizations } from '@/lib/db/organizations.js';
import { getBrandAssetsByOrgId } from '@/lib/db/organizationBrandAssets.js';
import { getOrganizationTemplateHeaders, generateCSV, generateXLSX } from '@/lib/utils/fileParser.js';

/**
 * Transform organization to export format
 */
async function transformOrganizationForExport(org) {
  const brandAssets = await getBrandAssetsByOrgId(org.id);
  
  // Build brand asset URLs
  const brandAssetMap = {};
  brandAssets.forEach((asset) => {
    brandAssetMap[asset.key_name] = asset.url;
  });

  return {
    name: org.name,
    slug: org.slug || '',
    org_type: org.org_type || '',
    display_name: org.display_name || '',
    org_code: org.org_code || '',
    country: org.country || '',
    state: org.state || '',
    city: org.city || '',
    timezone: org.timezone || '',
    default_locale: org.default_locale || '',
    currency: org.currency || '',
    academic_year_start_month: org.academic_year_start_month || '',
    academic_levels: Array.isArray(org.academic_levels) ? org.academic_levels.join(',') : '',
    primary_admin_name: org.primary_admin_name || '',
    primary_admin_email: org.primary_admin_email || '',
    contact_email: org.contact_email || '',
    contact_phone: org.contact_phone || '',
    website_url: org.website_url || '',
    header_logo_url: brandAssetMap.header_logo || '',
    square_icon_url: brandAssetMap.square_icon || '',
    splash_image_url: brandAssetMap.splash_image || '',
    loading_mark_url: brandAssetMap.loading_mark || '',
    status: org.status || 'active',
    created_at: org.created_at ? new Date(org.created_at).toISOString() : '',
  };
}

/**
 * GET /api/organizations/export.csv or .xlsx
 */
export async function GET(request) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);

    // Parse format from query parameter (default: csv)
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format')?.toLowerCase() || 'csv';

    // Parse query parameters
    const filters = {
      status: searchParams.get('status'),
      org_type: searchParams.get('org_type'),
      country: searchParams.get('country'),
      state: searchParams.get('state'),
      city: searchParams.get('city'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
      page: 1,
      limit: 10000, // Large limit for export
      sort: 'created_at',
      order: 'DESC',
    };

    // Note: Date filtering would need to be added to listOrganizations function
    // For now, we'll export all matching the other filters
    // You can add date filtering in the database query later if needed

    // Fetch all organizations (with pagination)
    const allOrganizations = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await listOrganizations({ ...filters, page: currentPage, limit: 1000 });
      
      if (result.organizations.length === 0) {
        hasMore = false;
        break;
      }

      // Transform organizations for export
      for (const org of result.organizations) {
        const exportRow = await transformOrganizationForExport(org);
        allOrganizations.push(exportRow);
      }

      hasMore = result.pagination.hasNext;
      currentPage++;

      // Safety limit: max 10,000 organizations per export
      if (allOrganizations.length >= 10000) {
        break;
      }
    }

    // Get headers
    const headers = getOrganizationTemplateHeaders();
    const headerNames = headers.map((h) => h.label);

    // Generate file content
    let content;
    let contentType;
    let filename;

    if (format === 'xlsx') {
      try {
        content = await generateXLSX(allOrganizations, headerNames, { sheetName: 'Organizations' });
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `organizations-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      } catch (error) {
        // If xlsx library not available, return CSV instead
        console.warn('XLSX library not available, falling back to CSV:', error.message);
        content = generateCSV(allOrganizations, headerNames);
        contentType = 'text/csv';
        filename = `organizations-export-${new Date().toISOString().split('T')[0]}.csv`;
      }
    } else {
      content = generateCSV(allOrganizations, headerNames);
      contentType = 'text/csv';
      filename = `organizations-export-${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📋 [EXPORT] Exported organizations:', {
        count: allOrganizations.length,
        format,
      });
    }

    // Create response with file download
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error exporting organizations:', error);

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
        error: error.message || 'Failed to export organizations',
      },
      { status: 500 }
    );
  }
}


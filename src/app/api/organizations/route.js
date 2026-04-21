/**
 * Organizations API Route
 * 
 * Handles GET (list) and POST (create) operations for organizations.
 * Only superadmin users can access these endpoints.
 * 
 * GET /api/organizations
 * - Query params: ?q=search&page=1&limit=20&status=active&org_type=college&country=India
 * - Returns: { organizations: [], pagination: { page, limit, total, pages } }
 * 
 * POST /api/organizations
 * - Request body: OrganizationCreateSchema
 * - Returns: { success: true, organization: {...} }
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkUserIpRateLimit } from '@/lib/api/rateLimiter.js';
import { requireCSRF } from '@/lib/api/csrf.js';
import { organizationCreateSchema, validateForm } from '@/lib/validation/organizationSchemas.js';
import {
  createOrganization,
  listOrganizations,
  checkSlugExists,
  checkCodeExists,
  createOrganizationWithAssets,
} from '@/lib/db/organizations.js';
import { upsertBrandAssets } from '@/lib/db/organizationBrandAssets.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';
import { getClient } from '@/lib/db/index.js';

/**
 * GET /api/organizations
 * List organizations with filters, pagination, and search
 */
export async function GET(request) {
  try {
    // Authentication: Only superadmin
    let session;
    try {
      session = await requireSuperadmin(request);
    } catch (authError) {
      // This is an authorization/permission error, not an authentication error
      // User is authenticated but doesn't have the required role
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ [ORGS] Authorization denied in GET /api/organizations:', {
          status: authError.status,
          requiredRole: 'superadmin',
          userRole: authError.userRole,
          message: authError.message,
        });
      }
      return NextResponse.json(
        {
          success: false,
          error: authError.message || 'Unauthorized. Superadmin access required.',
        },
        { 
          status: authError.status || 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      search: searchParams.get('q') || searchParams.get('search'),
      status: searchParams.get('status'),
      org_type: searchParams.get('org_type'),
      country: searchParams.get('country'),
      state: searchParams.get('state'),
      city: searchParams.get('city'),
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sort: searchParams.get('sort') || 'created_at',
      order: searchParams.get('order') || 'DESC',
    };

    // Validate pagination
    if (filters.page < 1) {
      filters.page = 1;
    }
    if (filters.limit < 1 || filters.limit > 100) {
      filters.limit = 20;
    }

    // Fetch organizations
    let result;
    try {
      result = await listOrganizations(filters);
    } catch (dbError) {
      console.error('Database error in listOrganizations:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch organizations from database',
          details: process.env.NODE_ENV !== 'production' ? dbError.message : undefined,
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📋 [ORGS] Listed organizations:', {
        count: result.organizations.length,
        total: result.pagination.total,
        page: result.pagination.page,
      });
    }

    return NextResponse.json(
      {
        success: true,
        organizations: result.organizations,
        pagination: result.pagination,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // Cache for 5 minutes
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/organizations:', error);
    console.error('Error stack:', error.stack);

    // Always return JSON, never HTML
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred while listing organizations',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

/**
 * POST /api/organizations
 * Create a new organization
 */
export async function POST(request) {
  try {
    // Dev: request start log
    if (process.env.NODE_ENV !== 'production') {
      console.log('🟦 [ORGS][POST] ===== CREATE ORGANIZATION START =====');
      console.log('🟦 [ORGS][POST] URL:', request.url);
      console.log('🟦 [ORGS][POST] Method:', request.method);
    }
    // Authentication: Only superadmin (and orgId === null)
    let session;
    try {
      session = await requireSuperadmin(request);
    } catch (authError) {
      // This is an authorization/permission error, not an authentication error
      // User is authenticated but doesn't have the required role
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ [ORGS] Authorization denied in POST /api/organizations:', {
          status: authError.status,
          requiredRole: 'superadmin',
          userRole: authError.userRole,
          message: authError.message,
        });
      }
      return NextResponse.json(
        {
          success: false,
          error: authError.message || 'Unauthorized. Superadmin access required.',
        },
        { 
          status: authError.status || 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Verify superadmin has no orgId
    if (session.user.orgId !== null && session.user.orgId !== undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only global superadmin (without organization) can create organizations',
        },
        { status: 403 }
      );
    }

    // CSRF protection
    requireCSRF(request);

    // Rate limiting: 10 requests/minute per user/IP
    const ipAddress = getClientIp(request);
    const rateLimit = checkUserIpRateLimit(session.user.id, ipAddress, {
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Please try again in ${rateLimit.retryAfter} seconds.`,
          rateLimited: true,
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfter.toString(),
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    if (process.env.NODE_ENV !== 'production') {
      const bodyKeys = Object.keys(body || {});
      console.log('🟦 [ORGS][POST] Body keys received:', bodyKeys);
    }

    // Validate with Zod schema
    const validation = validateForm(organizationCreateSchema, body);
    if (!validation.success) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('🟥 [ORGS][POST] Validation failed. Detailed field errors:');
        const entries = Object.entries(validation.errors || {});
        if (entries.length === 0) {
          console.warn('🟥 [ORGS][POST] No field errors object present.');
        } else {
          for (const [field, message] of entries) {
            console.warn(`   • ${field}: ${message}`);
          }
        }
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    if (process.env.NODE_ENV !== 'production') {
      console.log('🟩 [ORGS][POST] Validation passed.');
    }

    // Check slug uniqueness
    const slugExists = await checkSlugExists(data.slug);
    if (slugExists) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('🟨 [ORGS][POST] Slug already exists:', data.slug);
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Organization with this slug already exists',
          errors: {
            slug: 'This slug is already taken',
          },
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Check code uniqueness
    const codeExists = await checkCodeExists(data.org_code);
    if (codeExists) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('🟨 [ORGS][POST] Organization code already exists:', data.org_code);
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Organization with this code already exists',
          errors: {
            org_code: 'This organization code is already taken',
          },
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Create organization with brand assets in transaction
    const client = await getClient();
    let organization;

    try {
      await client.query('BEGIN');

      // Prepare organization data (flatten primary_admin)
      const orgData = {
        name: data.name,
        slug: data.slug,
        org_type: data.org_type,
        display_name: data.display_name || null,
        org_code: data.org_code,
        country: data.country,
        state: data.state,
        city: data.city,
        timezone: data.timezone,
        default_locale: data.default_locale,
        currency: data.currency,
        academic_year_start_month: data.academic_year_start_month,
        academic_levels: data.academic_levels || [],
        primary_admin_name: data.primary_admin.name,
        primary_admin_email: data.primary_admin.email,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        website_url: data.website_url || null,
        status: data.status || 'active',
      };

      // Insert organization
      const orgResult = await client.query(
        `INSERT INTO organizations (
          name, slug, org_type, display_name, org_code,
          country, state, city,
          timezone, default_locale, currency, academic_year_start_month,
          academic_levels,
          primary_admin_name, primary_admin_email,
          contact_email, contact_phone, website_url,
          status
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12,
          $13,
          $14, $15,
          $16, $17, $18,
          $19
        ) RETURNING *`,
        [
          orgData.name,
          orgData.slug,
          orgData.org_type,
          orgData.display_name,
          orgData.org_code,
          orgData.country,
          orgData.state,
          orgData.city,
          orgData.timezone,
          orgData.default_locale,
          orgData.currency,
          orgData.academic_year_start_month,
          orgData.academic_levels,
          orgData.primary_admin_name,
          orgData.primary_admin_email,
          orgData.contact_email,
          orgData.contact_phone,
          orgData.website_url,
          orgData.status,
        ]
      );

      organization = orgResult.rows[0];

      // Insert brand assets if provided
      const brandAssets = data.brand_assets || [];
      if (brandAssets.length > 0) {
        for (const asset of brandAssets) {
          await client.query(
            `INSERT INTO organization_brand_assets (
              org_id, key_name, url, variant,
              width, height, format, bytes, checksum
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              organization.id,
              asset.key_name,
              asset.url,
              asset.variant || 'default',
              asset.width || null,
              asset.height || null,
              asset.format || null,
              asset.bytes || null,
              asset.checksum || null,
            ]
          );
        }
      }

      await client.query('COMMIT');

      // Create audit event
      try {
        await createAuditEvent({
          actor_id: session.user.id,
          action: 'create',
          target_type: 'organization',
          target_id: organization.id,
          metadata: {
            name: organization.name,
            slug: organization.slug,
            org_type: organization.org_type,
          },
          ip_address: ipAddress,
          user_agent: request.headers.get('user-agent'),
        });
      } catch (auditError) {
        // Don't fail request if audit logging fails
        console.error('Failed to create audit event:', auditError);
      }

      // Log in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ [ORGS] Created organization:', {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        });
        console.log('🟩 [ORGS][POST] ===== CREATE ORGANIZATION SUCCESS =====');
      }

      return NextResponse.json(
        {
          success: true,
          organization,
        },
        {
          status: 201,
          // Note: In production, you can use revalidateTag('orgs') if using Next.js caching
        }
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating organization:', error);
    console.error('Error stack:', error.stack);
    if (process.env.NODE_ENV !== 'production') {
      console.error('🟥 [ORGS][POST] ===== CREATE ORGANIZATION FAILED =====');
    }

    // Always return JSON, never HTML
    // Handle authentication errors
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Superadmin access required.',
        },
        { 
          status: error.status,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Handle CSRF errors
    if (error.code === 'CSRF_VALIDATION_FAILED') {
      return NextResponse.json(
        {
          success: false,
          error: 'CSRF validation failed',
        },
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.constraint?.includes('slug')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Organization with this slug already exists',
            errors: {
              slug: 'This slug is already taken',
            },
          },
          { 
            status: 409,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
      if (error.constraint?.includes('code')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Organization with this code already exists',
            errors: {
              org_code: 'This organization code is already taken',
            },
          },
          { 
            status: 409,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Handle missing column / relation (schema not migrated)
    if (error.code === '42703' || error.code === '42P01') {
      // 42703: undefined_column, 42P01: undefined_table
      return NextResponse.json(
        {
          success: false,
          error: 'Database schema is out of date. Please run migrations.',
          details: process.env.NODE_ENV !== 'production'
            ? `Missing database ${error.code === '42703' ? 'column' : 'table'}: ${error.message}`
            : undefined,
        },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Handle validation errors
    if (error.code === '23514') {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid organization data: ${error.message}`,
        },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create organization',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}


/**
 * Organization by ID API Route
 * 
 * Handles GET (by ID), PATCH (update), and DELETE operations for a specific organization.
 * Only superadmin users can access these endpoints.
 * 
 * GET /api/organizations/[id]
 * - Returns: { organization: {...}, brandAssets: [...] }
 * 
 * PATCH /api/organizations/[id]
 * - Request body: OrganizationUpdateSchema (partial)
 * - Returns: { success: true, organization: {...} }
 * 
 * DELETE /api/organizations/[id]
 * - Soft delete: Sets status to 'inactive'
 * - Returns: { success: true }
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { requireCSRF } from '@/lib/api/csrf.js';
import { organizationUpdateSchema, validateForm } from '@/lib/validation/organizationSchemas.js';
import {
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  checkSlugExists,
  checkCodeExists,
} from '@/lib/db/organizations.js';
import { getBrandAssetsByOrgId, upsertBrandAssets } from '@/lib/db/organizationBrandAssets.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';
import { getClient } from '@/lib/db/index.js';
import { invalidateByOrgId } from '@/lib/tenant/cache.js';

/**
 * GET /api/organizations/[id]
 * Get organization by ID with brand assets
 */
export async function GET(request, { params }) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);

    const { id } = params;

    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid organization ID format',
        },
        { status: 400 }
      );
    }

    // Fetch organization
    const organization = await getOrganizationById(id);

    if (!organization) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization not found',
        },
        { status: 404 }
      );
    }

    // Fetch brand assets
    const brandAssets = await getBrandAssetsByOrgId(id);

    // Log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📋 [ORGS] Retrieved organization:', {
        id: organization.id,
        name: organization.name,
      });
    }

    // Conditional GET with ETag based on updated_at
    const updatedAt = organization.updated_at || organization.updatedAt || null;
    const weakEtag = updatedAt ? `W/"org-${organization.id}-${new Date(updatedAt).getTime()}"` : `W/"org-${organization.id}"`;
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && weakEtag && ifNoneMatch === weakEtag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': weakEtag,
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          'Vary': 'Authorization, Cookie',
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        organization,
        brandAssets,
      },
      {
        status: 200,
        headers: {
          // Short private cache with SWR to smooth UX during edits
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          'ETag': weakEtag,
          'Vary': 'Authorization, Cookie',
        },
      }
    );
  } catch (error) {
    console.error('Error getting organization:', error);

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
        error: error.message || 'Failed to get organization',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/organizations/[id]
 * Update organization
 */
export async function PATCH(request, { params }) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);

    // CSRF protection
    requireCSRF(request);

    const { id } = params;
    const ipAddress = getClientIp(request);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid organization ID format',
        },
        { status: 400 }
      );
    }

    // Check if organization exists
    const existingOrg = await getOrganizationById(id);
    if (!existingOrg) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization not found',
        },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate with Zod schema (partial update)
    const validation = validateForm(organizationUpdateSchema, body);
    if (!validation.success) {
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

    // Check slug uniqueness (if slug is being updated)
    if (data.slug && data.slug !== existingOrg.slug) {
      const slugExists = await checkSlugExists(data.slug, id);
      if (slugExists) {
        return NextResponse.json(
          {
            success: false,
            error: 'Organization with this slug already exists',
            errors: {
              slug: 'This slug is already taken',
            },
          },
          { status: 409 }
        );
      }
    }

    // Check code uniqueness (if code is being updated)
    if (data.org_code && data.org_code !== existingOrg.org_code) {
      const codeExists = await checkCodeExists(data.org_code, id);
      if (codeExists) {
        return NextResponse.json(
          {
            success: false,
            error: 'Organization with this code already exists',
            errors: {
              org_code: 'This organization code is already taken',
            },
          },
          { status: 409 }
        );
      }
    }

    // Update organization and brand assets in transaction
    const client = await getClient();
    let organization;

    try {
      await client.query('BEGIN');

      // Prepare update data (flatten primary_admin if provided)
      const updateData = { ...data };
      if (data.primary_admin) {
        updateData.primary_admin_name = data.primary_admin.name;
        updateData.primary_admin_email = data.primary_admin.email;
        delete updateData.primary_admin;
      }

      // Slug-subdomain sync: if slug is changing and subdomain currently mirrors slug,
      // keep them in sync so the org remains reachable at {newSlug}.edurock.com.
      if (data.slug && data.slug !== existingOrg.slug && existingOrg.subdomain === existingOrg.slug) {
        updateData.subdomain = data.slug;
      }

      // Remove brand_assets from update data (handle separately)
      const brandAssets = updateData.brand_assets;
      delete updateData.brand_assets;

      // Remove undefined values and flatten primary_admin if provided
      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined && key !== 'primary_admin') {
          fields.push(`${key} = $${paramIndex}`);
          values.push(updateData[key]);
          paramIndex++;
        }
      });

      // Update organization if there are fields to update
      if (fields.length > 0) {
        // Add id as last parameter
        values.push(id);

        const result = await client.query(
          `UPDATE organizations 
           SET ${fields.join(', ')} 
           WHERE id = $${paramIndex} 
           RETURNING *`,
          values
        );

        organization = result.rows[0];
      } else {
        organization = existingOrg;
      }

      // Update brand assets if provided
      if (brandAssets && Array.isArray(brandAssets)) {
        // Upsert brand assets using client for transaction
        for (const asset of brandAssets) {
          const {
            key_name,
            url,
            variant = 'default',
            width,
            height,
            format,
            bytes,
            checksum,
          } = asset;

          // Check if asset exists
          const existingAssetResult = await client.query(
            'SELECT id FROM organization_brand_assets WHERE org_id = $1 AND key_name = $2 AND variant = $3',
            [id, key_name, variant]
          );

          if (existingAssetResult.rows.length > 0) {
            // Update existing asset
            await client.query(
              `UPDATE organization_brand_assets 
               SET url = $1, width = $2, height = $3, format = $4, bytes = $5, checksum = $6, updated_at = CURRENT_TIMESTAMP
               WHERE id = $7`,
              [url, width || null, height || null, format || null, bytes || null, checksum || null, existingAssetResult.rows[0].id]
            );
          } else {
            // Create new asset
            await client.query(
              `INSERT INTO organization_brand_assets (
                org_id, key_name, url, variant,
                width, height, format, bytes, checksum
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                id,
                key_name,
                url,
                variant,
                width || null,
                height || null,
                format || null,
                bytes || null,
                checksum || null,
              ]
            );
          }
        }
      }

      await client.query('COMMIT');

      // Fetch updated organization with brand assets
      organization = await getOrganizationById(id);
      const updatedBrandAssets = await getBrandAssetsByOrgId(id);

      // Invalidate tenant cache if domain-related fields changed
      if (updateData.subdomain !== undefined || updateData.status !== undefined) {
        invalidateByOrgId(id);
      }

      // Create audit event
      try {
        await createAuditEvent({
          actor_id: session.user.id,
          action: 'update',
          target_type: 'organization',
          target_id: id,
          metadata: {
            changes: Object.keys(updateData),
            previous: {
              name: existingOrg.name,
              status: existingOrg.status,
              plan_tier: existingOrg.plan_tier,
            },
            current: {
              name: organization.name,
              status: organization.status,
              plan_tier: organization.plan_tier,
            },
          },
          ip_address: ipAddress,
          user_agent: request.headers.get('user-agent'),
        });
      } catch (auditError) {
        console.error('Failed to create audit event:', auditError);
      }

      // Log in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ [ORGS] Updated organization:', {
          id: organization.id,
          name: organization.name,
        });
      }

      return NextResponse.json(
        {
          success: true,
          organization,
          brandAssets: updatedBrandAssets,
        },
        {
          status: 200,
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
    console.error('Error updating organization:', error);

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

    // Handle CSRF errors
    if (error.code === 'CSRF_VALIDATION_FAILED') {
      return NextResponse.json(
        {
          success: false,
          error: 'CSRF validation failed',
        },
        { status: 403 }
      );
    }

    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.constraint?.includes('slug')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Organization with this slug already exists',
            errors: { slug: 'This slug is already taken' },
          },
          { status: 409 }
        );
      }
      if (error.constraint?.includes('code')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Organization with this code already exists',
            errors: { org_code: 'This organization code is already taken' },
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update organization',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/[id]
 * Delete organization (soft delete - sets status to 'inactive')
 */
export async function DELETE(request, { params }) {
  try {
    // Authentication: Only superadmin
    const session = await requireSuperadmin(request);

    // CSRF protection
    requireCSRF(request);

    const { id } = params;
    const ipAddress = getClientIp(request);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid organization ID format',
        },
        { status: 400 }
      );
    }

    // Check if organization exists
    const organization = await getOrganizationById(id);
    if (!organization) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization not found',
        },
        { status: 404 }
      );
    }

    // Soft delete: Set status to 'inactive'
    const deleted = await deleteOrganization(id, false); // false = soft delete

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete organization',
        },
        { status: 500 }
      );
    }

    // Create audit event
    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'delete',
        target_type: 'organization',
        target_id: id,
        metadata: {
          name: organization.name,
          slug: organization.slug,
          method: 'soft_delete', // status set to inactive
        },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    // Log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('🗑️  [ORGS] Deleted organization:', {
        id: organization.id,
        name: organization.name,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Organization deleted successfully',
      },
      {
        status: 200,
        // Note: In production, you can use revalidateTag('orgs') if using Next.js caching
      }
    );
  } catch (error) {
    console.error('Error deleting organization:', error);

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

    // Handle CSRF errors
    if (error.code === 'CSRF_VALIDATION_FAILED') {
      return NextResponse.json(
        {
          success: false,
          error: 'CSRF validation failed',
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete organization',
      },
      { status: 500 }
    );
  }
}


/**
 * Bulk Import API Route
 * 
 * Imports organizations from validated rows.
 * Processes in batches of 100 rows per transaction.
 * 
 * POST /api/organizations/bulk
 * 
 * Request body:
 * {
 *   rows: [{...}],  // Validated rows from preview
 *   options: {
 *     skipDuplicates: boolean,     // Skip if slug exists
 *     updateOnDuplicate: boolean   // Update if slug exists
 *   }
 * }
 * 
 * Response:
 * {
 *   results: [{ row: number, status: 'created'|'updated'|'skipped', orgId?, errors? }],
 *   summary: { created, updated, skipped, errors }
 * }
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkUserIpRateLimit } from '@/lib/api/rateLimiter.js';
import { requireCSRF } from '@/lib/api/csrf.js';
import { organizationBulkImportSchema, validateForm } from '@/lib/validation/organizationSchemas.js';
import {
  getOrganizationBySlug,
  createOrganization,
  updateOrganization,
  checkSlugExists,
} from '@/lib/db/organizations.js';
import { upsertBrandAssets } from '@/lib/db/organizationBrandAssets.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';
import { getClient } from '@/lib/db/index.js';
import { isValidImageType, getMaxFileSize } from '@/lib/r2/r2.js';

// Rate limit: 5 requests/hour (bulk is heavy)
const BULK_IMPORT_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
};

/**
 * Validate image URL (HEAD request to check type and size)
 */
async function validateImageUrl(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EdurockImageValidator/1.0)',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return { valid: false, error: `URL returned status ${response.status}` };
    }

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    if (!contentType || !isValidImageType(contentType)) {
      return { valid: false, error: `Invalid content type: ${contentType}` };
    }

    if (contentLength && parseInt(contentLength, 10) > getMaxFileSize()) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size (${getMaxFileSize() / 1024 / 1024}MB)`,
      };
    }

    return { valid: true, contentType, contentLength: contentLength ? parseInt(contentLength, 10) : null };
  } catch (error) {
    return { valid: false, error: error.message || 'Failed to validate image URL' };
  }
}

/**
 * Validate brand asset URLs in row
 */
async function validateBrandAssetUrls(row) {
  const errors = {};
  const brandAssetFields = ['header_logo_url', 'square_icon_url', 'splash_image_url', 'loading_mark_url'];

  for (const field of brandAssetFields) {
    const url = row[field];
    if (url && url.trim()) {
      const validation = await validateImageUrl(url.trim());
      if (!validation.valid) {
        errors[field] = validation.error;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * POST /api/organizations/bulk
 */
export async function POST(request) {
  try {
    // Authentication: Only superadmin (and orgId === null)
    const session = await requireSuperadmin(request);

    // Verify superadmin has no orgId
    if (session.user.orgId !== null && session.user.orgId !== undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only global superadmin (without organization) can import organizations',
        },
        { status: 403 }
      );
    }

    // CSRF protection
    requireCSRF(request);

    // Rate limiting: 5 requests/hour per user/IP (bulk is heavy)
    const ipAddress = getClientIp(request);
    const rateLimit = checkUserIpRateLimit(session.user.id, ipAddress, BULK_IMPORT_RATE_LIMIT);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Bulk import is limited to ${BULK_IMPORT_RATE_LIMIT.maxRequests} request(s) per hour. Please try again later.`,
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
    const { rows, options = {} } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rows array is required and must not be empty',
        },
        { status: 400 }
      );
    }

    const { skipDuplicates = false, updateOnDuplicate = false } = options;

    // Validate all rows before processing
    const validatedRows = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const validation = validateForm(organizationBulkImportSchema, row);

      if (!validation.success) {
        validatedRows.push({
          rowIndex: i + 1,
          valid: false,
          errors: validation.errors,
          data: row,
        });
        continue;
      }

      // Validate brand asset URLs if provided
      const urlValidation = await validateBrandAssetUrls(validation.data);
      if (!urlValidation.valid) {
        validatedRows.push({
          rowIndex: i + 1,
          valid: false,
          errors: urlValidation.errors,
          data: row,
        });
        continue;
      }

      validatedRows.push({
        rowIndex: i + 1,
        valid: true,
        data: validation.data,
      });
    }

    // Process in batches of 100 rows
    const batchSize = 100;
    const results = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let batchStart = 0; batchStart < validatedRows.length; batchStart += batchSize) {
      const batch = validatedRows.slice(batchStart, batchStart + batchSize);
      const batchResults = await processBatch(batch, skipDuplicates, updateOnDuplicate, session.user.id);
      results.push(...batchResults);

      // Update counts
      batchResults.forEach((result) => {
        if (result.status === 'created') createdCount++;
        else if (result.status === 'updated') updatedCount++;
        else if (result.status === 'skipped') skippedCount++;
        else if (result.status === 'error') errorCount++;
      });
    }

    // Create audit event
    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'bulk_import',
        target_type: 'organization',
        target_id: null,
        metadata: {
          totalRows: validatedRows.length,
          created: createdCount,
          updated: updatedCount,
          skipped: skippedCount,
          errors: errorCount,
          options: { skipDuplicates, updateOnDuplicate },
        },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    // Log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ [BULK] Import completed:', {
        total: validatedRows.length,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errorCount,
      });
    }

    return NextResponse.json(
      {
        success: true,
        results,
        summary: {
          total: validatedRows.length,
          created: createdCount,
          updated: updatedCount,
          skipped: skippedCount,
          errors: errorCount,
        },
      },
      {
        status: 200,
        // Note: In production, you can use revalidateTag('orgs') if using Next.js caching
      }
    );
  } catch (error) {
    console.error('Error bulk importing organizations:', error);

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
        error: error.message || 'Failed to bulk import organizations',
      },
      { status: 500 }
    );
  }
}

/**
 * Process batch of rows in a transaction
 */
async function processBatch(batch, skipDuplicates, updateOnDuplicate, userId) {
  const client = await getClient();
  const results = [];

  try {
    await client.query('BEGIN');

    for (const rowItem of batch) {
      const { rowIndex, valid, data, errors } = rowItem;

      if (!valid) {
        results.push({
          row: rowIndex,
          status: 'error',
          errors,
        });
        continue;
      }

      try {
        // Transform validated data to organization format
        const orgData = {
          name: data.name,
          slug: data.slug || null, // Will be auto-generated if not provided
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

        // Generate slug if not provided
        if (!orgData.slug) {
          const { slugify } = await import('@/lib/validation/organizationValidators.js');
          orgData.slug = slugify(orgData.name);
        }

        // Check if slug exists
        const existingOrg = await getOrganizationBySlug(orgData.slug);

        if (existingOrg) {
          // Slug exists - handle duplicate
          if (skipDuplicates) {
            results.push({
              row: rowIndex,
              status: 'skipped',
              reason: 'Slug already exists',
              orgId: existingOrg.id,
            });
            continue;
          } else if (updateOnDuplicate) {
            // Update existing organization
            const updateData = { ...orgData };
            delete updateData.slug; // Don't update slug
            delete updateData.org_code; // Don't update code

            await client.query(
              `UPDATE organizations 
               SET name = $1, org_type = $2, display_name = $3,
                   country = $4, state = $5, city = $6,
                   timezone = $7, default_locale = $8, currency = $9, academic_year_start_month = $10,
                   academic_levels = $11,
                   primary_admin_name = $12, primary_admin_email = $13,
                   contact_email = $14, contact_phone = $15, website_url = $16,
                   status = $17, updated_at = CURRENT_TIMESTAMP
               WHERE id = $18
               RETURNING id`,
              [
                updateData.name,
                updateData.org_type,
                updateData.display_name,
                updateData.country,
                updateData.state,
                updateData.city,
                updateData.timezone,
                updateData.default_locale,
                updateData.currency,
                updateData.academic_year_start_month,
                updateData.academic_levels,
                updateData.primary_admin_name,
                updateData.primary_admin_email,
                updateData.contact_email,
                updateData.contact_phone,
                updateData.website_url,
                updateData.status,
                existingOrg.id,
              ]
            );

            // Update brand assets if provided
            if (data.brand_assets && data.brand_assets.length > 0) {
              for (const asset of data.brand_assets) {
                await upsertBrandAssets(existingOrg.id, [asset], client);
              }
            }

            results.push({
              row: rowIndex,
              status: 'updated',
              orgId: existingOrg.id,
            });
            continue;
          } else {
            // Default: skip if slug exists and no option specified
            results.push({
              row: rowIndex,
              status: 'skipped',
              reason: 'Slug already exists (no update option specified)',
              orgId: existingOrg.id,
            });
            continue;
          }
        }

        // Create new organization
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
          ) RETURNING id`,
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

        const orgId = orgResult.rows[0].id;

        // Create brand assets if provided
        if (data.brand_assets && data.brand_assets.length > 0) {
          for (const asset of data.brand_assets) {
            await client.query(
              `INSERT INTO organization_brand_assets (
                org_id, key_name, url, variant,
                width, height, format, bytes, checksum
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (org_id, key_name, variant) DO UPDATE
              SET url = EXCLUDED.url, updated_at = CURRENT_TIMESTAMP`,
              [
                orgId,
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

        results.push({
          row: rowIndex,
          status: 'created',
          orgId,
        });
      } catch (error) {
        // Handle database errors
        if (error.code === '23505') {
          // Unique constraint violation
          if (error.constraint?.includes('slug')) {
            results.push({
              row: rowIndex,
              status: 'error',
              errors: { slug: 'Slug already exists' },
            });
          } else if (error.constraint?.includes('code')) {
            results.push({
              row: rowIndex,
              status: 'error',
              errors: { org_code: 'Organization code already exists' },
            });
          } else {
            results.push({
              row: rowIndex,
              status: 'error',
              errors: { general: 'Duplicate entry detected' },
            });
          }
        } else {
          results.push({
            row: rowIndex,
            status: 'error',
            errors: { general: error.message || 'Failed to create organization' },
          });
        }
      }
    }

    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    // Return error results for all rows in batch
    return batch.map((rowItem) => ({
      row: rowItem.rowIndex,
      status: 'error',
      errors: { general: error.message || 'Batch processing failed' },
    }));
  } finally {
    client.release();
  }
}


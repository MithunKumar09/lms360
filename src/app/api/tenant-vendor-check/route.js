/**
 * Vendor Access Check API — Internal use by middleware only
 *
 * GET /api/tenant-vendor-check?userId=<vendorUserId>&orgId=<orgId>
 *
 * Checks whether a vendor user has an active association with the specified
 * organisation via the vendor_organizations join table.
 *
 * This route exists because:
 *   - Middleware runs on Edge Runtime and cannot import pg/db directly.
 *   - Vendor users have org_id = NULL in the users table (they belong to many
 *     orgs via vendor_organizations) so the standard orgId == sessionOrgId
 *     cross-tenant check cannot be applied.
 *   - Middleware calls this endpoint (with a 60-second in-memory cache) to
 *     enforce that a vendor can only access subdomains/custom-domains of
 *     organisations they are actually registered with.
 *
 * This route is excluded from the middleware matcher to prevent an infinite
 * fetch loop (same as /api/tenant-resolve).
 *
 * Response shapes:
 *   { allowed: true }   — vendor is an active member of this org
 *   { allowed: false }  — vendor is not a member, or org is inactive/deleted
 *
 * Security: fails closed (allowed: false) on any DB error or malformed input.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';

// Force Node.js runtime — same as tenant-resolve.
export const runtime = 'nodejs';

// Validate UUID format to reject obviously malformed params before the DB call.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const orgId  = searchParams.get('orgId');

  // Fail closed on missing or malformed params
  if (
    !userId || !orgId ||
    !UUID_RE.test(userId) ||
    !UUID_RE.test(orgId)
  ) {
    return NextResponse.json({ allowed: false });
  }

  try {
    const { rows } = await query(
      `SELECT 1
       FROM vendor_organizations vo
       INNER JOIN organizations o ON vo.organization_id = o.id
       WHERE vo.vendor_id         = $1
         AND vo.organization_id   = $2
         AND o.status             = 'active'
         AND o.deleted_at         IS NULL
       LIMIT 1`,
      [userId, orgId]
    );

    return NextResponse.json({ allowed: rows.length > 0 });
  } catch (err) {
    console.error('[tenant-vendor-check] DB error:', err.message);
    // Fail closed: deny access on any DB error
    return NextResponse.json({ allowed: false });
  }
}

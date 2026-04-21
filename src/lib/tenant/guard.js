/**
 * withTenantGuard — API Route Tenant Guard Wrapper (Gap 2)
 *
 * Wraps a Next.js App Router route handler to:
 *   1. Extract the resolved tenant org from the x-tenant-org-id header
 *      (set by middleware via the tenant resolver).
 *   2. Cross-validate against session.user.orgId (prevents JWT tampering
 *      where an attacker crafts a different orgId than the domain says).
 *   3. Inject a typed `tenantContext` object as the third argument so
 *      handlers receive { orgId, session, isControlPlane } without
 *      repetitive boilerplate in each of the 147+ API routes.
 *
 * Usage:
 *
 *   import { withTenantGuard } from '@/lib/tenant/guard.js';
 *
 *   export const GET = withTenantGuard(async (request, context, { orgId, session }) => {
 *     const rows = await query('SELECT * FROM courses WHERE org_id = $1', [orgId]);
 *     return NextResponse.json(rows);
 *   });
 *
 * Control-plane routes (x-tenant-mode: control_plane):
 *   - orgId is null, isControlPlane is true.
 *   - Handlers can choose to query across all orgs or gate on superadmin role.
 *
 * Delegation-token routes (superadmin proxying into a tenant):
 *   - The delegation token is validated separately in the tenant-proxy route.
 *   - Regular API routes should NOT need to handle delegation tokens directly.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';

/**
 * @typedef {{ orgId: string|null, session: object, isControlPlane: boolean }} TenantContext
 */

/**
 * @param {(request: Request, context: object, tenant: TenantContext) => Promise<Response>} handler
 * @returns {(request: Request, context: object) => Promise<Response>}
 */
export function withTenantGuard(handler) {
  return async function tenantGuardedHandler(request, context) {
    const headerOrgId = request.headers.get('x-tenant-org-id') || null;
    const tenantMode = request.headers.get('x-tenant-mode') || 'control_plane';
    const isControlPlane = tenantMode === 'control_plane';

    // ── Control plane: superadmin API routes bypass org scoping ──────────
    if (isControlPlane) {
      let session = null;
      try { session = await auth(); } catch { /* allow unauthenticated to fail naturally */ }
      return handler(request, context, { orgId: null, session, isControlPlane: true });
    }

    // ── Tenant route: session + org context required ──────────────────────
    let session;
    try {
      session = await auth();
    } catch (err) {
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
    }

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionOrgId = session.user.orgId ?? null;
    const userRole = session.user.role ?? '';

    // Resolve effective orgId:
    //   - Use header value (set by middleware domain resolution) when available.
    //   - Fall back to session value (for requests without tenant resolution active).
    const orgId = headerOrgId || sessionOrgId;

    if (!orgId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 403 });
    }

    // Cross-validate: the domain says one org, but the JWT claims another.
    // Vendor role exception: vendors have null orgId and use vendor_organizations.
    if (
      userRole !== 'vendor' &&
      headerOrgId &&
      sessionOrgId &&
      headerOrgId !== sessionOrgId
    ) {
      return NextResponse.json(
        { error: 'Organization mismatch — please log in to the correct organization' },
        { status: 403 }
      );
    }

    return handler(request, context, { orgId, session, isControlPlane: false });
  };
}

/**
 * Convenience: extract orgId from request without wrapping the whole handler.
 * Useful for simple routes that already do their own auth but need the org.
 *
 * Returns the org ID string, or null on the control plane.
 * Throws a NextResponse-compatible error object on validation failure.
 *
 * @param {Request} request
 * @param {object}  session  Already-fetched session object
 * @returns {string|null}
 */
export function extractTenantOrgId(request, session) {
  const headerOrgId = request.headers.get('x-tenant-org-id') || null;
  const tenantMode = request.headers.get('x-tenant-mode') || 'control_plane';
  const isControlPlane = tenantMode === 'control_plane';

  if (isControlPlane) return null;

  const sessionOrgId = session?.user?.orgId ?? null;
  const orgId = headerOrgId || sessionOrgId;

  if (!orgId) {
    throw Object.assign(new Error('Tenant context missing'), { status: 403 });
  }

  return orgId;
}

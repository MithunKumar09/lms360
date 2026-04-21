/**
 * Superadmin Org Soft Delete
 *
 * POST /api/superadmin/organizations/[id]/delete
 *   — Marks an organization as 'deleted' (soft delete).
 *   — Immediate effects:
 *       1. Sets organizations.status = 'deleted', deleted_at = NOW()
 *       2. Invalidates all user_sessions for this org
 *       3. Revokes all active delegation tokens targeting this org
 *       4. Expires all pending invite tokens for this org
 *       5. Busts the tenant resolver in-memory cache for this org's domains
 *   — Queued BullMQ jobs continue until they hit the tenant status check;
 *     they will self-discard on the next retry.
 *   — Hard deletion happens 30 days later via /api/jobs/hard-delete-expired-orgs.
 */

import { NextResponse } from 'next/server';
import { requireSuperadminWithMfa } from '@/lib/auth/guards.js';
import { query, getClient } from '@/lib/db/index.js';
import { invalidateByOrgId } from '@/lib/tenant/cache.js';

export async function POST(request, { params }) {
  let session;
  try {
    session = await requireSuperadminWithMfa(request);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: orgId } = await params;

  // Verify org exists and is not already deleted
  const orgRes = await query(
    `SELECT id, name, status, subdomain, custom_domain FROM organizations WHERE id = $1`,
    [orgId]
  );
  const org = orgRes.rows[0];
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }
  if (org.status === 'deleted') {
    return NextResponse.json({ error: 'Organization is already deleted' }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const { reason } = body;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Mark org as deleted
    await client.query(
      `UPDATE organizations
       SET status = 'deleted', deleted_at = NOW()
       WHERE id = $1`,
      [orgId]
    );

    // 2. Invalidate all active sessions for users of this org
    const sessionRes = await client.query(
      `DELETE FROM user_sessions WHERE org_id = $1 RETURNING id`,
      [orgId]
    );
    const sessionsRevoked = sessionRes.rowCount ?? 0;

    // 3. Revoke all active superadmin delegation tokens targeting this org
    await client.query(
      `UPDATE superadmin_delegation_tokens
       SET revoked_at = NOW()
       WHERE target_org_id = $1 AND revoked_at IS NULL`,
      [orgId]
    );

    // 4. Expire all pending invite tokens for this org
    await client.query(
      `UPDATE invite_tokens
       SET expires_at = NOW()
       WHERE org_id = $1 AND expires_at > NOW()`,
      [orgId]
    );

    // 5. Audit trail
    await client.query(
      `INSERT INTO audit_events
         (actor_id, org_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, 'org_soft_deleted', 'organization', $2, $3)`,
      [
        session.user.id,
        orgId,
        JSON.stringify({
          orgName: org.name,
          reason: reason ?? null,
          sessionsRevoked,
          deletedBy: session.user.id,
        }),
      ]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // 6. Bust tenant resolver in-memory cache (outside transaction — safe to do after commit)
  invalidateByOrgId(orgId);

  return NextResponse.json({
    deleted: true,
    orgId,
    orgName: org.name,
    deletedAt: new Date().toISOString(),
    hardDeleteAfter: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    sessionsRevoked: undefined, // omit from response to avoid info leak
  });
}

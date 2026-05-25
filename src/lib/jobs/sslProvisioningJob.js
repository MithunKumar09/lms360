/**
 * SSL Provisioning Job — Cloudflare Custom Hostnames API
 *
 * Provisions SSL certificates for verified custom domains via
 * Cloudflare's Custom Hostnames API (same account as R2 storage).
 *
 * Environment variables required:
 *   CLOUDFLARE_ZONE_ID          — Zone ID for the primary domain (e.g., edurock.com)
 *   CLOUDFLARE_API_TOKEN        — Token with Zone:Edit and SSL:Edit permissions
 *
 * Lifecycle:
 *   1. `triggerSslProvisioning(orgId, domain)` — called after domain_verified=true
 *      → Creates a Cloudflare Custom Hostname → status transitions to 'provisioning'
 *   2. `runSslStatusSyncJob()` — polls Cloudflare for pending hostnames
 *      → Updates ssl_status: 'provisioning' → 'active' | 'failed'
 *   3. On 'active': tenant resolver now routes domain to this org
 *   4. On 'failed': org admin sees error; may need to re-add CNAME
 */

import { query } from '@/lib/db/index.js';

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

/**
 * Get Cloudflare API headers.
 */
function cfHeaders() {
  return {
    Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Create a Cloudflare Custom Hostname for a verified custom domain.
 * Uses TXT method for ownership verification (already done by domainVerificationJob).
 *
 * @param {string} domain - e.g., 'school.example.com'
 * @returns {Promise<{ success: boolean, hostnameId: string|null, error: string|null }>}
 */
async function createCloudflareCustomHostname(domain) {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!zoneId || !process.env.CLOUDFLARE_API_TOKEN) {
    throw new Error('CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN env vars are required');
  }

  const res = await fetch(
    `${CLOUDFLARE_API_BASE}/zones/${zoneId}/custom_hostnames`,
    {
      method: 'POST',
      headers: cfHeaders(),
      body: JSON.stringify({
        hostname: domain,
        ssl: {
          method: 'txt',    // Use TXT record for DCV (already verified by our job)
          type: 'dv',       // Domain-validated certificate
          settings: {
            min_tls_version: '1.2',
          },
          wildcard: false,
        },
      }),
    }
  );

  const data = await res.json();

  if (!data.success) {
    const cfError = data.errors?.[0]?.message ?? 'Unknown Cloudflare error';
    // Code 1407 = hostname already exists in Cloudflare.
    // Fetch the existing hostname ID so the sync job can poll it; without this
    // the org stays permanently stuck in ssl_status='provisioning' since the
    // sync query requires ssl_cloudflare_hostname_id IS NOT NULL.
    if (data.errors?.[0]?.code === 1407) {
      try {
        const listRes = await fetch(
          `${CLOUDFLARE_API_BASE}/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(domain)}`,
          { headers: cfHeaders() }
        );
        const listData = await listRes.json();
        const existingId = listData.result?.[0]?.id ?? null;
        return { success: true, hostnameId: existingId, alreadyExists: true, error: null };
      } catch {
        // Could not fetch existing ID — return null so caller can handle gracefully
        return { success: true, hostnameId: null, alreadyExists: true, error: null };
      }
    }
    // Handle Cloudflare rate limit (429) — surface to caller for retry logic
    if (res.status === 429 || data.errors?.[0]?.code === 429) {
      return { success: false, hostnameId: null, rateLimited: true, error: 'Cloudflare rate limit' };
    }
    return { success: false, hostnameId: null, error: cfError };
  }

  return { success: true, hostnameId: data.result?.id ?? null, error: null };
}

/**
 * Trigger SSL provisioning for a verified custom domain.
 * Updates ssl_status from 'provisioning' to reflect Cloudflare state.
 * Called by domainVerificationJob after domain_verified is set to true.
 *
 * @param {string} orgId
 * @param {string} domain
 */
export async function triggerSslProvisioning(orgId, domain) {
  try {
    const result = await createCloudflareCustomHostname(domain);

    if (!result.success) {
      // Rate-limited by Cloudflare — reset to pending so the next cron cycle retries
      if (result.rateLimited) {
        console.log(JSON.stringify({ event: 'ssl_provision_rate_limited', orgId, domain }));
        await query(`UPDATE organizations SET ssl_status = 'pending' WHERE id = $1`, [orgId]);
        return;
      }
      console.error(`Cloudflare custom hostname creation failed for ${domain}:`, result.error);
      await query(
        `UPDATE organizations SET ssl_status = 'failed', domain_ssl_error = $1 WHERE id = $2`,
        [result.error ?? 'Cloudflare provisioning failed', orgId]
      );
      return;
    }

    // Store the Cloudflare hostname ID for future polling (status sync).
    // hostnameId may be null if alreadyExists=true AND the lookup failed — in that
    // case ssl_status stays 'provisioning' and the sync job will pick it up once
    // the next provision attempt stores the ID.
    if (result.hostnameId) {
      await query(
        `UPDATE organizations
         SET ssl_status = 'provisioning',
             ssl_cloudflare_hostname_id = $1,
             domain_ssl_error = NULL
         WHERE id = $2`,
        [result.hostnameId, orgId]
      );
      console.log(JSON.stringify({ event: 'ssl_provision_triggered', orgId, domain, hostnameId: result.hostnameId }));
    }
    // alreadyExists with null hostnameId: ssl_status already 'provisioning' from verification step
  } catch (err) {
    console.error(`SSL provisioning error for org ${orgId}, domain ${domain}:`, err);
    await query(
      `UPDATE organizations SET ssl_status = 'failed', domain_ssl_error = $1 WHERE id = $2`,
      [err.message ?? 'Unknown provisioning error', orgId]
    );
  }
}

/**
 * Poll Cloudflare for the status of all orgs in 'provisioning' state.
 * Updates ssl_status to 'active' or 'failed' based on Cloudflare response.
 * Called by POST /api/jobs/sync-ssl-status (cron every 5 minutes).
 *
 * @returns {Promise<{ checked: number, activated: number, failed: number }>}
 */
export async function runSslStatusSyncJob() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!zoneId || !process.env.CLOUDFLARE_API_TOKEN) {
    console.warn('CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN not set — skipping SSL sync');
    return { checked: 0, activated: 0, failed: 0 };
  }

  // Get all orgs with provisioning status that have a Cloudflare hostname ID
  const { rows: provisioningOrgs } = await query(
    `SELECT id, custom_domain, ssl_cloudflare_hostname_id
     FROM organizations
     WHERE ssl_status = 'provisioning'
       AND custom_domain IS NOT NULL
       AND ssl_cloudflare_hostname_id IS NOT NULL
       AND status = 'active'
     LIMIT 50`
  );

  if (provisioningOrgs.length === 0) {
    return { checked: 0, activated: 0, failed: 0 };
  }

  let activated = 0;
  let failed = 0;

  for (const org of provisioningOrgs) {
    try {
      const res = await fetch(
        `${CLOUDFLARE_API_BASE}/zones/${zoneId}/custom_hostnames/${org.ssl_cloudflare_hostname_id}`,
        { headers: cfHeaders() }
      );
      const data = await res.json();

      if (!data.success) continue;

      const cfStatus = data.result?.status;
      const sslStatus = data.result?.ssl?.status;

      if (cfStatus === 'active' && sslStatus === 'active') {
        await query(
          `UPDATE organizations SET ssl_status = 'active', domain_ssl_error = NULL WHERE id = $1`,
          [org.id]
        );
        console.log(JSON.stringify({ event: 'ssl_activated', orgId: org.id, domain: org.custom_domain }));
        activated++;
      } else if (cfStatus === 'blocked' || sslStatus === 'validation_timed_out') {
        const errMsg = `Cloudflare status: ${cfStatus}, ssl: ${sslStatus}`;
        await query(
          `UPDATE organizations SET ssl_status = 'failed', domain_ssl_error = $1 WHERE id = $2`,
          [errMsg, org.id]
        );
        console.log(JSON.stringify({ event: 'ssl_failed', orgId: org.id, domain: org.custom_domain, reason: errMsg }));
        failed++;
      }
      // Otherwise still provisioning — check again next cycle
    } catch (err) {
      console.error(`SSL status sync error for org ${org.id}:`, err.message);
    }
  }

  return { checked: provisioningOrgs.length, activated, failed };
}

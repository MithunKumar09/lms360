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
    // Code 1407 = hostname already exists — treat as success
    if (data.errors?.[0]?.code === 1407) {
      return { success: true, hostnameId: null, alreadyExists: true, error: null };
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
      console.error(`Cloudflare custom hostname creation failed for ${domain}:`, result.error);
      await query(
        `UPDATE organizations SET ssl_status = 'failed' WHERE id = $1`,
        [orgId]
      );
      return;
    }

    // Store the Cloudflare hostname ID for future polling (status sync)
    // ssl_status stays 'provisioning' until the sync job marks it 'active'
    if (result.hostnameId) {
      await query(
        `UPDATE organizations
         SET ssl_status = 'provisioning',
             ssl_cloudflare_hostname_id = $1
         WHERE id = $2`,
        [result.hostnameId, orgId]
      );
    }
    // alreadyExists: Cloudflare already has this hostname — just mark as provisioning
  } catch (err) {
    console.error(`SSL provisioning error for org ${orgId}, domain ${domain}:`, err);
    await query(
      `UPDATE organizations SET ssl_status = 'failed' WHERE id = $1`,
      [orgId]
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
          `UPDATE organizations SET ssl_status = 'active' WHERE id = $1`,
          [org.id]
        );
        activated++;
      } else if (cfStatus === 'blocked' || sslStatus === 'validation_timed_out') {
        await query(
          `UPDATE organizations SET ssl_status = 'failed' WHERE id = $1`,
          [org.id]
        );
        failed++;
      }
      // Otherwise still provisioning — check again next cycle
    } catch (err) {
      console.error(`SSL status sync error for org ${org.id}:`, err.message);
    }
  }

  return { checked: provisioningOrgs.length, activated, failed };
}

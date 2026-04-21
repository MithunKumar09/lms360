/**
 * Domain Verification Job
 *
 * Checks DNS TXT records for custom domain verification.
 * Triggered by POST /api/jobs/verify-custom-domains (cron every 5 minutes).
 *
 * Lifecycle:
 *   1. Org admin requests custom domain → domain_verified=false, ssl_status='pending'
 *   2. Admin adds TXT record: _edurock-verify.{domain} = {domain_verification_token}
 *   3. This job checks DNS and marks domain_verified=true when found
 *   4. On verification: triggers SSL provisioning via sslProvisioningJob.js
 */

import dns from 'dns/promises';
import { query } from '@/lib/db/index.js';
import { triggerSslProvisioning } from './sslProvisioningJob.js';

/**
 * Run a single verification check for one organization's custom domain.
 * @param {{ id: string, custom_domain: string, domain_verification_token: string }} org
 * @returns {Promise<{ verified: boolean, orgId: string, domain: string }>}
 */
async function verifyOrgDomain(org) {
  const txtHostname = `_edurock-verify.${org.custom_domain}`;

  let txtRecords;
  try {
    txtRecords = await dns.resolveTxt(txtHostname);
  } catch {
    // DNS lookup failed (NXDOMAIN, timeout, etc.) — not verified yet
    return { verified: false, orgId: org.id, domain: org.custom_domain };
  }

  // txtRecords is an array of arrays (each TXT record may have multiple strings)
  const flatRecords = txtRecords.flat();
  const isVerified = flatRecords.includes(org.domain_verification_token);

  if (!isVerified) {
    return { verified: false, orgId: org.id, domain: org.custom_domain };
  }

  // Mark as verified and kick off SSL provisioning
  await query(
    `UPDATE organizations
     SET domain_verified = true,
         domain_verified_at = NOW(),
         ssl_status = 'provisioning'
     WHERE id = $1
       AND domain_verified = false`,
    [org.id]
  );

  // Trigger Cloudflare Custom Hostname provisioning (fire-and-forget is intentional;
  // ssl_status is polled separately by the SSL job)
  triggerSslProvisioning(org.id, org.custom_domain).catch((err) => {
    console.error(`SSL provisioning trigger failed for org ${org.id}:`, err.message);
  });

  return { verified: true, orgId: org.id, domain: org.custom_domain };
}

/**
 * Run verification checks for all orgs with pending custom domain verification.
 * Called by POST /api/jobs/verify-custom-domains.
 *
 * @returns {Promise<{ checked: number, verified: number, failed: number }>}
 */
export async function runDomainVerificationJob() {
  // Only check orgs that are active and have an unverified custom domain
  const { rows: pendingOrgs } = await query(
    `SELECT id, custom_domain, domain_verification_token
     FROM organizations
     WHERE custom_domain IS NOT NULL
       AND domain_verified = false
       AND domain_verification_token IS NOT NULL
       AND status = 'active'
     ORDER BY updated_at ASC
     LIMIT 100`
  );

  if (pendingOrgs.length === 0) {
    return { checked: 0, verified: 0, failed: 0 };
  }

  let verified = 0;
  let failed = 0;

  // Run checks with controlled concurrency (5 at a time)
  const CONCURRENCY = 5;
  for (let i = 0; i < pendingOrgs.length; i += CONCURRENCY) {
    const batch = pendingOrgs.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map(verifyOrgDomain));

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.verified) verified++;
      } else {
        failed++;
        console.error('Domain verification check failed:', result.reason);
      }
    }
  }

  return { checked: pendingOrgs.length, verified, failed };
}

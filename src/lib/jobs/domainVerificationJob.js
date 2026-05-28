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

  // Always update attempt counter and last-checked timestamp, verified or not.
  // This enables the attempt-limit filter (F9-B) and surfaces feedback in the UI.
  const updateAttempt = () => query(
    `UPDATE organizations
     SET domain_verification_attempts = COALESCE(domain_verification_attempts, 0) + 1,
         domain_verification_last_checked_at = NOW()
     WHERE id = $1`,
    [org.id]
  ).catch((err) => {
    // Non-fatal — don't let a counter update failure break the verification loop
    console.error(`Failed to update attempt counter for org ${org.id}:`, err.message);
  });

  let txtRecords;
  try {
    txtRecords = await dns.resolveTxt(txtHostname);
  } catch (dnsErr) {
    await updateAttempt();
    const dnsFailureReason = `DNS lookup failed for ${txtHostname}: ${dnsErr.code ?? dnsErr.message}`;
    await query(
      `UPDATE organizations
       SET last_verification_failure_reason = $1,
           last_dns_response = $2
       WHERE id = $3`,
      [dnsFailureReason, dnsErr.code ?? dnsErr.message, org.id]
    ).catch(() => {});
    console.log(JSON.stringify({
      event: 'domain_verify_dns_error',
      orgId: org.id,
      domain: org.custom_domain,
      txtHostname,
      dnsErrorCode: dnsErr.code ?? null,
      dnsErrorMessage: dnsErr.message,
      failureReason: dnsFailureReason,
    }));
    return { verified: false, orgId: org.id, domain: org.custom_domain };
  }

  // txtRecords is an array of arrays (each TXT record may have multiple strings)
  const flatRecords = txtRecords.flat();
  const isVerified = flatRecords.includes(org.domain_verification_token);

  console.log(JSON.stringify({
    event: 'domain_verify_dns_lookup',
    orgId: org.id,
    domain: org.custom_domain,
    txtHostname,
    foundRecords: flatRecords,
    expectedToken: org.domain_verification_token,
    isVerified,
  }));

  if (!isVerified) {
    await updateAttempt();
    const mismatchReason = flatRecords.length === 0
      ? `TXT record not found at ${txtHostname}`
      : `TXT token mismatch at ${txtHostname}. Expected: ${org.domain_verification_token}. Found: [${flatRecords.join(', ')}]`;
    await query(
      `UPDATE organizations
       SET last_verification_failure_reason = $1,
           last_dns_response = $2
       WHERE id = $3`,
      [mismatchReason, JSON.stringify(flatRecords), org.id]
    ).catch(() => {});
    console.log(JSON.stringify({
      event: 'domain_verify_token_mismatch',
      orgId: org.id,
      domain: org.custom_domain,
      txtHostname,
      expectedToken: org.domain_verification_token,
      foundRecords: flatRecords,
      failureReason: mismatchReason,
    }));
    return { verified: false, orgId: org.id, domain: org.custom_domain };
  }

  // Mark as verified and kick off SSL provisioning.
  // The WHERE domain_verified=false guard is an idempotency lock: if two concurrent
  // cron executions both resolve DNS successfully, only the first UPDATE matches
  // (rowCount=1). The second gets rowCount=0 and skips triggerSslProvisioning,
  // preventing duplicate Cloudflare hostname creation.
  const updateResult = await query(
    `UPDATE organizations
     SET domain_verified = true,
         domain_verified_at = NOW(),
         ssl_status = 'provisioning',
         domain_verification_attempts = COALESCE(domain_verification_attempts, 0) + 1,
         domain_verification_last_checked_at = NOW()
     WHERE id = $1
       AND domain_verified = false`,
    [org.id]
  );

  if ((updateResult.rowCount ?? 0) === 0) {
    // Another process already verified this org — skip SSL provisioning to avoid duplicate
    return { verified: false, orgId: org.id, domain: org.custom_domain };
  }

  console.log(JSON.stringify({ event: 'domain_verified', orgId: org.id, domain: org.custom_domain }));

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
  // Only check orgs that are active, have an unverified custom domain, and have
  // not exceeded the attempt limit (F9-B: stop after 50 attempts to avoid
  // indefinite DNS lookups for misconfigured/abandoned domains).
  const { rows: pendingOrgs } = await query(
    `SELECT id, custom_domain, domain_verification_token
     FROM organizations
     WHERE custom_domain IS NOT NULL
       AND domain_verified = false
       AND domain_verification_token IS NOT NULL
       AND status = 'active'
       AND (domain_verification_attempts IS NULL OR domain_verification_attempts < 50)
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

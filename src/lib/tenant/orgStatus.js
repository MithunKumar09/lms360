/**
 * Tenant Org Status Utility
 *
 * Shared helper for validating that an organization is active before
 * processing jobs, API requests, or background tasks on its behalf.
 *
 * Used by:
 *   - BullMQ workers (certificate generation, etc.)
 *   - HTTP job endpoints (auto-payouts, compute-vendor-balances, etc.)
 *   - Any code path that iterates over org-scoped resources
 */

import { query } from '@/lib/db/index.js';

/**
 * Organization active status result.
 * @typedef {Object} OrgStatusResult
 * @property {boolean} active   - true if org exists and is active
 * @property {string}  status   - 'active' | 'suspended' | 'deleted' | 'not_found'
 * @property {string}  [orgId]  - the org UUID checked
 */

/**
 * Check whether an org is active (exists + status = 'active').
 *
 * @param {string} orgId - UUID of the organization
 * @returns {Promise<OrgStatusResult>}
 */
export async function getOrgStatus(orgId) {
  if (!orgId) return { active: true, status: 'active' }; // Global/null = always active

  const { rows } = await query(
    `SELECT status FROM organizations WHERE id = $1`,
    [orgId]
  );

  if (!rows[0]) {
    return { active: false, status: 'not_found', orgId };
  }

  return {
    active: rows[0].status === 'active',
    status: rows[0].status,
    orgId,
  };
}

/**
 * Assert that an org is active. Throws if not.
 * Use in HTTP request handlers where you want to short-circuit with an error.
 *
 * @param {string} orgId
 * @throws {Error} with `.httpStatus` property set
 */
export async function assertOrgActive(orgId) {
  const result = await getOrgStatus(orgId);
  if (!result.active) {
    const err = new Error(
      result.status === 'not_found'
        ? `Organization not found: ${orgId}`
        : `Organization is ${result.status}: ${orgId}`
    );
    err.httpStatus = result.status === 'not_found' ? 404 : 403;
    err.orgStatus = result.status;
    throw err;
  }
}

/**
 * Filter a list of org IDs to only active ones.
 * Useful for batch jobs that iterate over many orgs.
 *
 * @param {string[]} orgIds
 * @returns {Promise<string[]>} only the active org IDs
 */
export async function filterActiveOrgIds(orgIds) {
  if (!orgIds || orgIds.length === 0) return [];

  const { rows } = await query(
    `SELECT id FROM organizations WHERE id = ANY($1::uuid[]) AND status = 'active'`,
    [orgIds]
  );

  return rows.map((r) => r.id);
}

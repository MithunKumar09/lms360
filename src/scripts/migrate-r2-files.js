#!/usr/bin/env node
/**
 * R2 File Migration Script — Phase H
 *
 * Copies existing files from the legacy path structure:
 *   org-uploads/{type}/{id}/{file}
 *
 * to the new tenant-scoped path structure:
 *   tenants/{orgId}/{category}/{type}/{id}/{file}
 *
 * Safety guarantees:
 *   - COPY only: never deletes source files (deletion is a separate manual step)
 *   - IDEMPOTENT: re-running the script skips already-migrated files (uses HEAD check)
 *   - DRY RUN by default: pass --execute to actually copy
 *   - PROGRESS: reports counts and errors; writes a log file
 *   - PREREQUISITE: Run on staging bucket first (P10 requirement)
 *
 * Usage:
 *   node src/scripts/migrate-r2-files.js --dry-run          # Preview only
 *   node src/scripts/migrate-r2-files.js --execute          # Actually copy
 *   node src/scripts/migrate-r2-files.js --execute --org <orgId>  # Single org
 *
 * Required env vars (load from .env.local or pass via shell):
 *   CLOUDFLARE_R2_ENDPOINT
 *   CLOUDFLARE_R2_ACCESS_KEY_ID
 *   CLOUDFLARE_R2_SECRET_ACCESS_KEY
 *   CLOUDFLARE_R2_BUCKET_NAME
 *   DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE
 */

import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--execute');
const orgFilter = args.includes('--org') ? args[args.indexOf('--org') + 1] : null;
const LOG_FILE = `migrate-r2-${new Date().toISOString().replace(/:/g, '-').slice(0, 19)}.log`;

// ── R2 client ─────────────────────────────────────────────────────────────────

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;

// ── DB client ─────────────────────────────────────────────────────────────────

const dbPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// ── Logging ───────────────────────────────────────────────────────────────────

const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logStream.write(line + '\n');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Check if a key already exists in R2 (to skip already-migrated files).
 */
async function keyExists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy an object from srcKey to destKey within the same R2 bucket.
 */
async function copyObject(srcKey, destKey) {
  await r2.send(new CopyObjectCommand({
    Bucket: BUCKET,
    CopySource: `${BUCKET}/${srcKey}`,
    Key: destKey,
  }));
}

/**
 * List all objects under a prefix (handles pagination).
 */
async function* listObjects(prefix) {
  let continuationToken;
  do {
    const res = await r2.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    }));
    for (const obj of res.Contents ?? []) {
      yield obj;
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
}

// ── Migration logic ───────────────────────────────────────────────────────────

/**
 * Attempt to derive orgId for a legacy file key.
 *
 * Legacy path pattern: org-uploads/{type}/{id}/{file}
 * - type examples: avatars, courses, assignments, certificates
 * - id: user UUID or course UUID
 *
 * Strategy:
 *   1. For 'avatars' keys: look up user by UUID in path → get org_id
 *   2. For 'courses' keys: look up course by UUID in path → get org_id
 *   3. For 'assignments' keys: look up assignment by UUID → get org_id
 *   4. For 'certificates' keys: look up issued_certificate by UUID → get org_id (via student)
 *   5. If org cannot be determined: place in platform/global/unresolved/{key}
 */
async function resolveOrgIdForKey(key) {
  // Key: org-uploads/{type}/{id}/...
  const parts = key.split('/');
  if (parts.length < 3) return null;

  const type = parts[1]; // 'avatars', 'courses', etc.
  const id = parts[2];

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;

  try {
    if (type === 'avatars' || type === 'users') {
      const { rows } = await dbPool.query(
        `SELECT org_id FROM users WHERE id = $1`, [id]
      );
      return rows[0]?.org_id ?? null;
    }

    if (type === 'courses') {
      const { rows } = await dbPool.query(
        `SELECT org_id FROM courses WHERE id = $1`, [id]
      );
      return rows[0]?.org_id ?? null;
    }

    if (type === 'assignments') {
      const { rows } = await dbPool.query(
        `SELECT org_id FROM assignments WHERE id = $1`, [id]
      );
      return rows[0]?.org_id ?? null;
    }

    if (type === 'certificates') {
      const { rows } = await dbPool.query(
        `SELECT u.org_id
         FROM issued_certificates ic
         JOIN users u ON u.id = ic.student_id
         WHERE ic.id = $1`,
        [id]
      );
      return rows[0]?.org_id ?? null;
    }
  } catch (err) {
    log(`WARN: DB lookup failed for key ${key}: ${err.message}`);
  }

  return null;
}

/**
 * Build the new tenant path for a legacy key + orgId.
 * Legacy: org-uploads/{type}/{id}/{filename}
 * New:    tenants/{orgId}/{type}/{id}/{filename}  OR  platform/global/unresolved/{key}
 */
function buildNewKey(legacyKey, orgId) {
  if (!orgId) {
    return `platform/global/unresolved/${legacyKey}`;
  }
  // Strip 'org-uploads/' prefix
  const withoutPrefix = legacyKey.replace(/^org-uploads\//, '');
  return `tenants/${orgId}/${withoutPrefix}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log(`=== R2 Migration Script ===`);
  log(`Mode: ${DRY_RUN ? 'DRY RUN (no files will be copied)' : 'EXECUTE'}`);
  log(`Org filter: ${orgFilter ?? 'all'}`);
  log(`Bucket: ${BUCKET}`);
  log(`Log file: ${LOG_FILE}`);

  if (DRY_RUN) {
    log('Pass --execute to actually copy files.');
  }

  let scanned = 0;
  let copied = 0;
  let skipped = 0;
  let unresolved = 0;
  let errors = 0;

  // List all legacy objects
  for await (const obj of listObjects('org-uploads/')) {
    const legacyKey = obj.Key;
    scanned++;

    try {
      // Resolve org
      const orgId = await resolveOrgIdForKey(legacyKey);

      // If orgFilter is set, skip other orgs
      if (orgFilter && orgId !== orgFilter) {
        skipped++;
        continue;
      }

      const newKey = buildNewKey(legacyKey, orgId);

      if (!orgId) {
        unresolved++;
        log(`UNRESOLVED: ${legacyKey} → ${newKey}`);
      }

      // Skip if destination already exists (idempotent)
      if (!DRY_RUN) {
        const exists = await keyExists(newKey);
        if (exists) {
          skipped++;
          continue;
        }

        await copyObject(legacyKey, newKey);
        copied++;
      } else {
        log(`DRY RUN: ${legacyKey} → ${newKey}`);
        copied++; // Count as "would copy"
      }

      if (scanned % 100 === 0) {
        log(`Progress: ${scanned} scanned, ${copied} copied/preview, ${skipped} skipped, ${errors} errors`);
      }
    } catch (err) {
      errors++;
      log(`ERROR: ${legacyKey}: ${err.message}`);
    }
  }

  log(`=== Migration Complete ===`);
  log(`Scanned:    ${scanned}`);
  log(`Copied:     ${copied}${DRY_RUN ? ' (dry run — no actual copies)' : ''}`);
  log(`Skipped:    ${skipped} (already migrated or filtered)`);
  log(`Unresolved: ${unresolved} (moved to platform/global/unresolved/)`);
  log(`Errors:     ${errors}`);

  if (errors > 0) {
    log('ATTENTION: Errors occurred. Review the log file before deleting source files.');
    process.exitCode = 1;
  }

  await dbPool.end();
  logStream.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

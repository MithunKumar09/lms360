/**
 * Hard Delete Expired Organizations Cron Job
 *
 * POST /api/jobs/hard-delete-expired-orgs
 *   — Protected by JOB_API_KEY / CRON_SECRET.
 *   — Run once daily (e.g., 03:00 UTC).
 *   — Permanently deletes organizations that have been soft-deleted for >= 30 days.
 *   — Cascade deletes all org-scoped data in dependency order.
 *   — Archives R2 files to archive/{orgId}/ before deleting org record.
 *
 * IMPORTANT: This is irreversible. Confirm 30-day window before running.
 */

import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/index.js';

function verifyApiKey(request) {
  const apiKey =
    request.headers.get('x-api-key') ??
    request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.JOB_API_KEY ?? process.env.CRON_SECRET;

  if (!expectedKey) {
    console.warn('JOB_API_KEY or CRON_SECRET not set — allowing (development mode)');
    return true;
  }

  return apiKey === expectedKey;
}

/**
 * Tables to purge in dependency order (children first, parents last).
 * Only org_id-scoped tables — global tables (organizations, users without org) are handled separately.
 */
const TABLES_TO_PURGE = [
  // Quiz children
  'quiz_attempt_answers',
  'quiz_attempts',
  'quiz_question_options',
  'quiz_questions',
  // Assignment children
  'assignment_submission_files',
  'submission_messages',
  'assignment_submissions',
  'assignment_attachments',
  'assignments',
  // Course content children
  'lesson_transcripts',
  'course_lessons',
  'course_chapters',
  'course_modules',
  'course_enrollments',
  'course_instructors',
  // Announcement children
  'announcement_deliveries',
  'announcement_targets',
  'announcement_attachments',
  // Event registrations
  'event_workshop_registrations',
  // Financial children
  'quiz_attempt_answers', // Already listed but safe due to IF-style deletes
  'payment_splits',
  'refunds',
  'payments',
  'payouts',
  'settlements',
  'vendor_balances',
  'organization_balances',
  'webhook_logs',
  // Auth
  'user_sessions',
  'login_audit',
  'user_metadata',
  'user_auth',
  // Mentor
  'mentor_tasks',
  'mentor_activity_feed',
  'mentor_feedback',
  'mentor_sessions',
  // Achievements
  'student_milestones',
  'student_stamps',
  // Jobs
  'job_applications',
  'job_postings',
  // Academic
  'elective_group_members',
  // Audit
  'audit_events',
  'audit_logs',
  // Delegation tokens
  'superadmin_delegation_tokens',
  // Blog
  'blog_comments',
  'blogs',
  // Courses (must come after all children)
  'course_drafts',
  'courses',
  // Users (only org-scoped users — superadmin/brand users have org_id=NULL and are preserved)
  'users',
];

/**
 * Archive all R2 files for an org to archive/{orgId}/ prefix.
 * Best-effort: logs errors but does not fail the deletion if archive fails.
 */
async function archiveTenantR2Files(orgId) {
  // Only archive if R2 is configured
  if (!process.env.CLOUDFLARE_R2_BUCKET_NAME || !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID) {
    console.warn(`R2 archival skipped for org ${orgId}: R2 not configured`);
    return;
  }

  try {
    // Dynamic import to avoid loading R2 SDK if not needed
    const { S3Client, ListObjectsV2Command, CopyObjectCommand } = await import('@aws-sdk/client-s3');

    const r2 = new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });

    const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    const sourcePrefix = `tenants/${orgId}/`;
    const archivePrefix = `archive/${orgId}/${new Date().toISOString().slice(0, 10)}/`;

    let continuationToken;
    let copiedCount = 0;

    do {
      const listRes = await r2.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: sourcePrefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }));

      for (const obj of listRes.Contents ?? []) {
        const destKey = archivePrefix + obj.Key.slice(sourcePrefix.length);
        await r2.send(new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${obj.Key}`,
          Key: destKey,
        }));
        copiedCount++;
      }

      continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined;
    } while (continuationToken);

    console.log(`Archived ${copiedCount} R2 files for org ${orgId} to ${archivePrefix}`);
  } catch (err) {
    console.error(`R2 archival failed for org ${orgId}:`, err.message);
    // Do not re-throw — archival failure should not block hard deletion
  }
}

/**
 * Hard delete a single org and all its data.
 */
async function hardDeleteOrg(orgId, orgName) {
  console.log(`Hard deleting org ${orgId} (${orgName})...`);

  // Archive R2 files before DB deletion
  await archiveTenantR2Files(orgId);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Purge all org-scoped tables in dependency order
    const seenTables = new Set();
    for (const table of TABLES_TO_PURGE) {
      if (seenTables.has(table)) continue;
      seenTables.add(table);

      const res = await client.query(
        `DELETE FROM ${table} WHERE org_id = $1`,
        [orgId]
      );
      console.log(`  Deleted ${res.rowCount ?? 0} rows from ${table}`);
    }

    // Delete org record (last, after all children)
    await client.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);

    await client.query('COMMIT');
    console.log(`Hard delete complete for org ${orgId}`);
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Hard delete failed for org ${orgId}:`, err.message);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

export async function POST(request) {
  if (!verifyApiKey(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // dryRun=true: return list of orgs that WOULD be deleted without executing any DELETEs.
  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get('dryRun') === 'true';

  try {
    // Find orgs soft-deleted >= 30 days ago
    const { rows: expiredOrgs } = await query(
      `SELECT id, name, deleted_at
       FROM organizations
       WHERE status = 'deleted'
         AND deleted_at IS NOT NULL
         AND deleted_at < NOW() - INTERVAL '30 days'
       LIMIT 10`  // Process in small batches to avoid timeout
    );

    if (expiredOrgs.length === 0) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: 'No organizations ready for hard deletion',
        deleted: 0,
        failed: 0,
      });
    }

    // Dry-run: return the affected org list without touching any data.
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `Dry run: ${expiredOrgs.length} organization(s) would be hard-deleted`,
        wouldDelete: expiredOrgs.map(o => ({
          orgId:     o.id,
          orgName:   o.name,
          deletedAt: o.deleted_at,
        })),
      });
    }

    let deleted = 0;
    let failed = 0;
    const results = [];

    for (const org of expiredOrgs) {
      const result = await hardDeleteOrg(org.id, org.name);
      if (result.success) {
        deleted++;
      } else {
        failed++;
      }
      results.push({ orgId: org.id, orgName: org.name, ...result });
    }

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `Hard delete: ${deleted} deleted, ${failed} failed`,
      deleted,
      failed,
      results,
    });
  } catch (error) {
    console.error('Hard delete job error:', error);
    return NextResponse.json(
      { success: false, error: error.message ?? 'Hard delete job failed' },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";
import { query, getClient } from "@/lib/db/index.js";
import { suspendUser, activateUser, assignRole, removeRole } from "@/lib/db/users.js";
import { createAuditLog, extractRequestInfo } from "@/lib/db/auditLogs.js";
import { revalidateTag } from "next/cache";

/**
 * POST /api/users/bulk-action
 * 
 * Perform bulk actions on multiple users
 */
export async function POST(request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization (superadmin or admin only)
    const userRole = session.user.role;
    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { user_ids, action, options = {} } = body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { error: "MISSING_USER_IDS", message: "user_ids array is required" },
        { status: 400 }
      );
    }

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { error: "MISSING_ACTION", message: "action is required" },
        { status: 400 }
      );
    }

    // Limit batch size
    const MAX_BATCH_SIZE = 100;
    if (user_ids.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: "BATCH_TOO_LARGE", message: `Maximum ${MAX_BATCH_SIZE} users per batch` },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['activate', 'suspend', 'delete', 'assign_role', 'remove_role'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: "INVALID_ACTION", message: `Action must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Organization access control - filter users by organization
    let filteredUserIds = user_ids;
    if (userRole === "admin" && session.user.orgId) {
      const orgUsersRes = await query(
        `SELECT DISTINCT user_id 
         FROM user_roles 
         WHERE user_id = ANY($1::uuid[]) AND org_id = $2`,
        [user_ids, session.user.orgId]
      );
      filteredUserIds = orgUsersRes.rows.map(r => r.user_id);
      
      if (filteredUserIds.length === 0) {
        return NextResponse.json(
          { error: "NO_USERS", message: "No users found in your organization" },
          { status: 400 }
        );
      }
    }

    const client = await getClient();
    const { ipAddress, userAgent } = extractRequestInfo(request);
    const results = {
      success: [],
      errors: [],
    };

    try {
      await client.query('BEGIN');

      for (const userId of filteredUserIds) {
        try {
          // Get user before action for audit logging
          const userRes = await query('SELECT id, email, status FROM users WHERE id = $1', [userId]);
          if (userRes.rows.length === 0) {
            results.errors.push({
              user_id: userId,
              error: 'User not found',
            });
            continue;
          }

          const user = userRes.rows[0];
          const oldValues = { status: user.status };

          switch (action) {
            case 'activate':
              await activateUser(userId);
              await createAuditLog({
                actorId: session.user.id,
                targetUserId: userId,
                action: 'activate_user',
                resourceType: 'user',
                resourceId: userId,
                oldValues,
                newValues: { status: 'active' },
                metadata: { bulk_action: true },
                ipAddress,
                userAgent,
              });
              results.success.push({ user_id: userId, email: user.email });
              break;

            case 'suspend':
              await suspendUser(userId);
              await createAuditLog({
                actorId: session.user.id,
                targetUserId: userId,
                action: 'suspend_user',
                resourceType: 'user',
                resourceId: userId,
                oldValues,
                newValues: { status: 'suspended' },
                metadata: { bulk_action: true },
                ipAddress,
                userAgent,
              });
              results.success.push({ user_id: userId, email: user.email });
              break;

            case 'delete':
              // Soft delete (suspend)
              await suspendUser(userId);
              try {
                await query(
                  `ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL`
                );
                await query(
                  `UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
                  [userId]
                );
              } catch (err) {
                // Column might already exist
              }
              await createAuditLog({
                actorId: session.user.id,
                targetUserId: userId,
                action: 'delete_user',
                resourceType: 'user',
                resourceId: userId,
                oldValues,
                newValues: { status: 'suspended', deleted_at: new Date().toISOString() },
                metadata: { bulk_action: true, soft_delete: true },
                ipAddress,
                userAgent,
              });
              results.success.push({ user_id: userId, email: user.email });
              break;

            case 'assign_role':
              if (!options.role_code) {
                results.errors.push({
                  user_id: userId,
                  error: 'role_code is required for assign_role action',
                });
                continue;
              }
              await assignRole({
                userId,
                roleCode: options.role_code,
                orgId: options.org_id || session.user.orgId || null,
              });
              await createAuditLog({
                actorId: session.user.id,
                targetUserId: userId,
                action: 'assign_role',
                resourceType: 'role',
                resourceId: userId,
                newValues: {
                  role_code: options.role_code,
                  org_id: options.org_id || session.user.orgId || null,
                },
                metadata: { bulk_action: true },
                ipAddress,
                userAgent,
              });
              results.success.push({ user_id: userId, email: user.email });
              break;

            case 'remove_role':
              if (!options.role_code) {
                results.errors.push({
                  user_id: userId,
                  error: 'role_code is required for remove_role action',
                });
                continue;
              }
              await removeRole({
                userId,
                roleCode: options.role_code,
                orgId: options.org_id || session.user.orgId || null,
              });
              await createAuditLog({
                actorId: session.user.id,
                targetUserId: userId,
                action: 'remove_role',
                resourceType: 'role',
                resourceId: userId,
                oldValues: {
                  role_code: options.role_code,
                  org_id: options.org_id || session.user.orgId || null,
                },
                metadata: { bulk_action: true },
                ipAddress,
                userAgent,
              });
              results.success.push({ user_id: userId, email: user.email });
              break;
          }

        } catch (error) {
          results.errors.push({
            user_id: userId,
            error: error.message || 'Unknown error',
          });
        }
      }

      await client.query('COMMIT');

      // Revalidate cache
      revalidateTag("users");
      revalidateTag("users-list");

      return NextResponse.json({
        success: true,
        message: `Bulk action '${action}' completed: ${results.success.length} succeeded, ${results.errors.length} failed`,
        results: {
          total: filteredUserIds.length,
          succeeded: results.success.length,
          failed: results.errors.length,
          success: results.success,
          errors: results.errors,
        },
      }, { status: 200 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Bulk action error:', error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}


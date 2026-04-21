import { NextResponse } from "next/server";
import { listSessions, revokeSessions } from "@/lib/db/users.js";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";
import { query } from "@/lib/db/index.js";
import { createAuditLog, extractRequestInfo } from "@/lib/db/auditLogs.js";
import { revalidateTag } from "next/cache";

/**
 * GET /api/users/[id]/sessions
 * 
 * Get all sessions for a user
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // all, active, expired

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization (superadmin, admin, or own user)
    const userRole = session.user.role;
    if (userRole !== "superadmin" && userRole !== "admin" && session.user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Organization access control
    if (userRole === "admin" && session.user.orgId) {
      const userOrgRes = await query(
        `SELECT org_id FROM user_roles WHERE user_id = $1 AND org_id = $2 LIMIT 1`,
        [id, session.user.orgId]
      );
      
      if (userOrgRes.rows.length === 0) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Get all sessions
    const allSessions = await listSessions(id);

    // Filter sessions based on filter parameter
    let filteredSessions = allSessions;
    if (filter === "active") {
      filteredSessions = allSessions.filter(s => !s.revoked_at && new Date(s.expires_at) > new Date());
    } else if (filter === "expired") {
      filteredSessions = allSessions.filter(s => new Date(s.expires_at) <= new Date() || s.revoked_at);
    }

    return NextResponse.json({
      sessions: filteredSessions,
      total: filteredSessions.length,
      filter,
    });

  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/[id]/sessions/revoke-all
 * 
 * Revoke all sessions for a user
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;

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

    // Organization access control
    if (userRole === "admin" && session.user.orgId) {
      const userOrgRes = await query(
        `SELECT org_id FROM user_roles WHERE user_id = $1 AND org_id = $2 LIMIT 1`,
        [id, session.user.orgId]
      );
      
      if (userOrgRes.rows.length === 0) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Revoke all sessions
    await revokeSessions(id);

    // Create audit log
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await createAuditLog({
      actorId: session.user.id,
      targetUserId: id,
      action: 'revoke_all_sessions',
      resourceType: 'user',
      resourceId: id,
      metadata: { all_sessions: true },
      ipAddress,
      userAgent,
    });

    // Revalidate cache
    revalidateTag("users");
    revalidateTag(`user-${id}`);

    return NextResponse.json({
      success: true,
      message: "All sessions revoked successfully",
    });

  } catch (error) {
    console.error('Error revoking sessions:', error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}


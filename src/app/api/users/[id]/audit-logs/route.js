import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";
import { query } from "@/lib/db/index.js";
import { getUserAuditLogs } from "@/lib/db/auditLogs.js";

/**
 * GET /api/users/[id]/audit-logs
 * 
 * Get audit logs for a user
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);

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

    // Parse query parameters
    const options = {
      limit: Math.min(parseInt(searchParams.get("limit") || "50", 10), 100),
      offset: parseInt(searchParams.get("offset") || "0", 10),
      action: searchParams.get("action") || null,
      startDate: searchParams.get("startDate") ? new Date(searchParams.get("startDate")) : null,
      endDate: searchParams.get("endDate") ? new Date(searchParams.get("endDate")) : null,
    };

    // Get audit logs
    const result = await getUserAuditLogs(id, options);

    return NextResponse.json({
      logs: result.logs,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}


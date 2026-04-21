import { NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db/index.js";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";

const PAGE_MAX = 50;

function capPageSize(pageSize) {
  const n = parseInt(pageSize || '15', 10);
  return Math.min(Math.max(n, 1), PAGE_MAX);
}

function toOffset(page, pageSize) {
  const p = Math.max(parseInt(page || '1', 10), 1);
  return (p - 1) * pageSize;
}

export async function GET(request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = session.user.id; // Get current user ID to filter invites by creator
    const userRole = session.user.role;
    
    const { searchParams } = new URL(request.url);
    const filters = {
      q: searchParams.get("q") || undefined,
      page: parseInt(searchParams.get("page") || "1", 10),
      pageSize: Math.min(parseInt(searchParams.get("pageSize") || "15", 10), PAGE_MAX),
    };
    
    // Check If-None-Match header for ETag validation
    const ifNoneMatch = request.headers.get("If-None-Match");
    
    const limit = capPageSize(filters.pageSize);
    const offset = toOffset(filters.page, limit);
    const where = [];
    const params = [];
    let i = 1;

    // Filter invites by creator_id - only show invites created by current user
    // Superadmin can see all invites, but for admin/instructor, only show their own invites
    if (userRole !== "superadmin") {
      where.push(`it.creator_id = $${i++}`);
      params.push(currentUserId);
    }

    // Query invite_tokens table for pending invites (not used yet and not expired)
    // For superadmin: show all invites
    // For admin/instructor: only show invites created by them
    // Note: We'll show both pending (used_at IS NULL) and accepted (used_at IS NOT NULL) invites
    // The status will be determined in the frontend based on whether user has logged in

    // Search filter
    if (filters.q) {
      where.push(`to_tsvector('simple', 
        coalesce(it.payload->>'first_name', '') || ' ' || 
        coalesce(it.payload->>'last_name', '') || ' ' || 
        coalesce(it.email, '')
      ) @@ plainto_tsquery('simple', $${i++})`);
      params.push(filters.q);
    }

    // Count query - count only pending invites (used_at IS NULL and not expired)
    // Note: This matches the old behavior of counting only pending invites
    const countWhere = [...where];
    const countParams = [...params];
    let countParamIdx = params.length + 1;
    countWhere.push(`it.used_at IS NULL`); // Only count pending invites
    countWhere.push(`it.expires_at > CURRENT_TIMESTAMP`); // Not expired
    const countWhereSql = countWhere.length ? `WHERE ${countWhere.join(' AND ')}` : '';
    
    const countSql = `
      SELECT COUNT(*) as total
      FROM invite_tokens it
      ${countWhereSql}
    `;

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    // Data query - get invites with role information
    // Include user's last_login_at to determine if invite is accepted
    // Show both pending (used_at IS NULL) and accepted (used_at IS NOT NULL) invites
    const dataWhere = [...where];
    const dataParams = [...params];
    let dataParamIdx = params.length + 1;
    dataWhere.push(`it.expires_at > CURRENT_TIMESTAMP`); // Not expired (but can be used)
    const dataWhereSql = dataWhere.length ? `WHERE ${dataWhere.join(' AND ')}` : '';
    
    const limitParamIdx = dataParams.length + 1;
    const offsetParamIdx = dataParams.length + 2;
    
    const dataSql = `
      SELECT 
        it.id,
        it.email,
        it.payload->>'first_name' as first_name,
        it.payload->>'last_name' as last_name,
        it.payload->>'avatar_url' as avatar_url,
        it.created_at,
        it.expires_at,
        it.used_at,
        COALESCE(r.code::text, 'unknown') as role_code,
        COALESCE(r.title, 'Unknown Role') as role_title,
        o.name as org_name,
        o.display_name as org_display_name,
        u.last_login_at as user_last_login_at
      FROM invite_tokens it
      LEFT JOIN roles r ON r.id = it.role_id
      LEFT JOIN organizations o ON o.id = it.org_id
      LEFT JOIN users u ON LOWER(u.email) = LOWER(it.email)
      ${dataWhereSql}
      ORDER BY it.created_at DESC
      LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}
    `;

    dataParams.push(limit, offset);
    const dataResult = await query(dataSql, dataParams);

    const items = dataResult.rows.map(row => ({
      id: row.id,
      email: row.email,
      first_name: row.first_name || null,
      last_name: row.last_name || null,
      avatar_url: row.avatar_url || null,
      created_at: row.created_at,
      expires_at: row.expires_at,
      used_at: row.used_at || null,
      user_last_login_at: row.user_last_login_at || null,
      role_code: row.role_code,
      role_title: row.role_title,
      org_name: row.org_name || row.org_display_name || null,
      roles: row.role_code ? [{ code: row.role_code, title: row.role_title }] : [],
    }));

    // Generate ETag from data hash
    const etagContent = JSON.stringify({ 
      ...filters, 
      total,
      count: items.length,
      timestamp: Math.floor(Date.now() / 60000) // Round to minute for cache stability
    });
    const etag = `"${crypto.createHash("sha256").update(etagContent).digest("hex").substring(0, 32)}"`;
    
    // If client sent matching ETag, return 304 Not Modified
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { 
        status: 304,
        headers: {
          "ETag": etag,
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300, must-revalidate",
        }
      });
    }
    
    // Return data with ETag headers
    const res = NextResponse.json({ 
      success: true,
      items,
      total,
      page: filters.page,
      pageSize: limit,
      etag: etag.replace(/"/g, '') 
    }, { status: 200 });
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300, must-revalidate");
    res.headers.set("ETag", etag);
    res.headers.set("Vary", "Accept, Accept-Encoding, Authorization");
    return res;
  } catch (error) {
    console.error("GET /api/users/invitations error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "SERVER_ERROR", 
        message: error.message || "Failed to fetch invited users" 
      },
      { status: 500 }
    );
  }
}


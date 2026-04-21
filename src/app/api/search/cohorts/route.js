import { NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db/index.js";
import { requireRole } from "@/lib/auth/guards.js";

export async function GET(request) {
  try {
    // console.log('📚 [SEARCH COHORTS] ===== GET /api/search/cohorts REQUEST =====');
    
    // Get authenticated session to filter by organization
    // Accept both 'instructor' and 'orginstructor' roles
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor', 'orginstructor']);
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;
    
    // console.log('📚 [SEARCH COHORTS] User:', {
    //   role: userRole,
    //   orgId: userOrgId,
    //   email: session.user.email
    // });
    
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "100", 10), 1), 100); // Increased limit for dropdowns
    const offset = (page - 1) * pageSize;
    
    // Get orgId from query params (for superadmin) or use session orgId
    const orgIdFromQuery = searchParams.get("orgId") || searchParams.get("org_id");
    const orgId = userRole === 'superadmin' ? (orgIdFromQuery || null) : userOrgId;

    const params = [];
    const where = [];
    
    // Filter by organization (required for admin/instructor, optional for superadmin)
    if (orgId) {
      params.push(orgId);
      where.push(`c.org_id = $${params.length}`);
      // console.log('📚 [SEARCH COHORTS] Filtering by org_id:', orgId);
    } else if (userRole !== 'superadmin') {
      // Admin/instructor must have orgId
      return NextResponse.json({ 
        items: [], 
        total: 0, 
        page: 1, 
        pageSize: 20, 
        etag: null, 
        error: 'Organization ID is required' 
      }, { status: 400 });
    }
    
    // Filter by status (only published cohorts)
    params.push('published');
    where.push(`c.status = $${params.length}`);
    
    // Search filter
    if (q) {
      params.push(q);
      where.push(`to_tsvector('simple', coalesce(c.code,'') || ' ' || coalesce(pn.code,'') || ' ' || coalesce(pn.title,'') ) @@ plainto_tsquery('simple', $${params.length})`);
    }
    
    // If no search term, return all published cohorts in the organization
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Include program node information in the response
    const dataSql = `
      SELECT 
        c.id, 
        c.code AS label,
        c.program_node_id,
        pn.code AS program_node_code,
        pn.title AS program_node_title,
        pn.node_type AS program_node_type
      FROM cohorts c
      LEFT JOIN program_nodes pn ON c.program_node_id = pn.id
      ${whereSql} 
      ORDER BY c.created_at DESC 
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const countSql = `SELECT COUNT(*)::int AS total FROM cohorts c LEFT JOIN program_nodes pn ON c.program_node_id = pn.id ${whereSql}`;
    
    // console.log('📚 [SEARCH COHORTS] Query params:', params);
    // console.log('📚 [SEARCH COHORTS] Where clause:', whereSql);

    const [dataRes, countRes] = await Promise.all([
      query(dataSql, [...params, pageSize, offset]), 
      query(countSql, params)
    ]);
    
    // console.log('📚 [SEARCH COHORTS] Results:', {
    //   itemsCount: dataRes.rows.length,
    //   total: countRes.rows[0]?.total || 0
    // });
    
    // Format items with program node info in label for better display
    const items = dataRes.rows.map(row => ({
      id: row.id,
      label: row.program_node_code && row.program_node_title 
        ? `${row.label} (${row.program_node_code} - ${row.program_node_title})`
        : row.label,
      code: row.label,
      program_node_id: row.program_node_id,
      program_node_code: row.program_node_code,
      program_node_title: row.program_node_title,
      program_node_type: row.program_node_type,
    }));
    
    const total = countRes.rows[0]?.total || 0;
    const etag = crypto.createHash("sha1").update(JSON.stringify({ q, page, pageSize, total, orgId })).digest("hex");

    const res = NextResponse.json({ items, total, page, pageSize, etag });
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.headers.set("ETag", etag);
    return res;
  } catch (e) {
    // console.error('📚 [SEARCH COHORTS] ❌ Error:', e);
    // console.error('📚 [SEARCH COHORTS] Error stack:', e.stack);
    return NextResponse.json({ 
      items: [], 
      total: 0, 
      page: 1, 
      pageSize: 10, 
      etag: null, 
      error: e.message 
    }, { status: e.status || 500 });
  }
}



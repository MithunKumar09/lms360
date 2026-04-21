import { NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db/index.js";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";

export async function GET(request) {
  try {
    // Get authenticated session to filter by organization
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || null;
    
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const role = (searchParams.get("role") || "").trim();
    const verified = searchParams.get("verified");
    const cohortId = searchParams.get("cohortId");
    const cohortIds = searchParams.get("cohortIds")?.split(',').map(id => id.trim()).filter(Boolean);
    
    // Get orgId from query params (for superadmin) or use session orgId
    const orgIdFromQuery = searchParams.get("orgId") || searchParams.get("org_id");
    const orgId = userRole === 'superadmin' ? (orgIdFromQuery || null) : userOrgId;
    
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "20", 10), 1), 100);
    const offset = (page - 1) * pageSize;

    const params = [];
    const where = [];
    let joins = [];
    
    // Filter by organization (required for non-superadmin users)
    if (orgId) {
      params.push(orgId);
      where.push(`u.org_id = $${params.length}::uuid`);
    } else if (userRole !== 'superadmin') {
      // Non-superadmin users must have orgId
      return NextResponse.json({ 
        items: [], 
        total: 0, 
        page: 1, 
        pageSize: 20, 
        etag: null, 
        error: 'Organization ID is required' 
      }, { status: 400 });
    }
    
    // Determine if we need to join with student_links or user_class_subject_links for cohort filtering
    // Students can be linked to cohorts via:
    // 1. student_links table (direct cohort assignment)
    // 2. user_class_subject_links table with link_type='student' (subject-based cohort assignment)
    const needsCohortFilter = cohortId || (cohortIds && cohortIds.length > 0);
    
    if (needsCohortFilter) {
      // Handle cohort filtering - support both single cohortId and multiple cohortIds
      if (cohortIds && cohortIds.length > 0) {
        params.push(cohortIds);
        // Check both student_links AND user_class_subject_links tables
        where.push(`(
          EXISTS (SELECT 1 FROM student_links sl WHERE sl.user_id = u.id AND sl.cohort_id = ANY($${params.length}::uuid[]))
          OR
          EXISTS (SELECT 1 FROM user_class_subject_links ucsl WHERE ucsl.user_id = u.id AND ucsl.link_type = 'student' AND ucsl.cohort_id = ANY($${params.length}::uuid[]))
        )`);
      } else if (cohortId) {
        params.push(cohortId);
        // Check both student_links AND user_class_subject_links tables
        where.push(`(
          EXISTS (SELECT 1 FROM student_links sl WHERE sl.user_id = u.id AND sl.cohort_id = $${params.length}::uuid)
          OR
          EXISTS (SELECT 1 FROM user_class_subject_links ucsl WHERE ucsl.user_id = u.id AND ucsl.link_type = 'student' AND ucsl.cohort_id = $${params.length}::uuid)
        )`);
      }
    }
    
    if (q) {
      params.push(q);
      where.push(`to_tsvector('simple', coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'') || ' ' || coalesce(u.email,'')) @@ plainto_tsquery('simple', $${params.length})`);
    }
    if (verified === "true") where.push(`u.email_verified_at IS NOT NULL`);
    if (verified === "false") where.push(`u.email_verified_at IS NULL`);
    if (role) {
      // Handle both 'student' and 'orgstudent' role codes
      // Map 'student' to check for both 'student' and 'orgstudent' role codes
      if (role === 'student' || role === 'orgstudent') {
        // Check for both student and orgstudent role codes
        where.push(`EXISTS (
          SELECT 1 FROM user_roles ur 
          JOIN roles r ON r.id = ur.role_id 
          WHERE ur.user_id = u.id 
          AND (r.code::text = 'student' OR r.code::text = 'orgstudent')
        )`);
      } else {
        params.push(role);
        where.push(`EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id=u.id AND r.code=$${params.length}::role_code_enum)`);
      }
    }
    
    const joinSql = joins.length > 0 ? joins.join(" ") : "";
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const dataSql = `
      SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
      FROM users u
      ${joinSql}
      ${whereSql}
      ORDER BY u.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}`;
    const countSql = `
      SELECT COUNT(DISTINCT u.id)::int AS total 
      FROM users u
      ${joinSql}
      ${whereSql}`;

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [SEARCH USERS API] Query params:', { 
        role, 
        cohortId, 
        cohortIds, 
        q, 
        verified,
        orgId,
        userRole,
        paramsCount: params.length,
        params: params.map((p, i) => ({ index: i, value: Array.isArray(p) ? p : p, type: typeof p }))
      });
      console.log('🔍 [SEARCH USERS API] SQL:', { 
        joinSql, 
        whereSql, 
        dataSql: dataSql.substring(0, 500) 
      });
    }

    const [dataRes, countRes] = await Promise.all([query(dataSql, params), query(countSql, params)]);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [SEARCH USERS API] Results:', { 
        rowsCount: dataRes.rows.length, 
        total: countRes.rows[0]?.total || 0,
        sampleRows: dataRes.rows.slice(0, 3).map(r => ({ id: r.id, email: r.email }))
      });
    }
    const items = dataRes.rows.map((r) => ({
      id: r.id,
      label: r.first_name || r.last_name ? `${r.first_name || ""} ${r.last_name || ""}`.trim() : r.email,
      email: r.email,
    }));
    const total = countRes.rows[0]?.total || 0;
    const etag = crypto.createHash("sha1").update(JSON.stringify({ q, role, verified, cohortId, cohortIds, orgId, page, pageSize, total })).digest("hex");

    const res = NextResponse.json({ items, total, page, pageSize, etag });
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.headers.set("ETag", etag);
    return res;
  } catch (e) {
    return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 10, etag: null, error: e.message }, { status: 200 });
  }
}



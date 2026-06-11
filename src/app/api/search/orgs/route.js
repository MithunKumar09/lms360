import { NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db/index.js";

// This route reads request.url (query params), so it must be dynamic. Without this, Next.js
// throws a DynamicServerError that the handler's try/catch swallows into a 200 + empty items.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "20", 10), 1), 20);
    const offset = (page - 1) * pageSize;

    const params = [];
    const where = [];
    
    // Always filter by active status for public registration
    where.push(`status = 'active'`);
    
    if (q) {
      params.push(q);
      where.push(`to_tsvector('simple', name) @@ plainto_tsquery('simple', $${params.length})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Build data query with limit/offset
    const dataParams = [...params, pageSize, offset];
    const dataSql = `SELECT id, name AS label FROM organizations ${whereSql} ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    
    // Count query doesn't need limit/offset
    const countSql = `SELECT COUNT(*)::int AS total FROM organizations ${whereSql}`;

    const [dataRes, countRes] = await Promise.all([
      query(dataSql, dataParams), 
      query(countSql, params)
    ]);
    const items = dataRes.rows;
    const total = countRes.rows[0]?.total || 0;
    const etag = crypto.createHash("sha1").update(JSON.stringify({ q, page, pageSize, total })).digest("hex");

    const res = NextResponse.json({ items, total, page, pageSize, etag });
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.headers.set("ETag", etag);
    return res;
  } catch (e) {
    return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 10, etag: null, error: e.message }, { status: 200 });
  }
}



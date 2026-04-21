import { NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db/index.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const cohortId = searchParams.get("cohortId") || null;
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "20", 10), 1), 20);
    const offset = (page - 1) * pageSize;

    const params = [];
    const where = [];
    if (cohortId) {
      params.push(cohortId);
      where.push(`so.cohort_id = $${params.length}`);
    }
    if (q) {
      params.push(q);
      where.push(`to_tsvector('simple', coalesce(sc.code,'') || ' ' || coalesce(sc.title,'')) @@ plainto_tsquery('simple', $${params.length})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const dataSql = `
      SELECT so.id, (coalesce(sc.code,'') || ' ' || coalesce(sc.title,'')) AS label
      FROM subject_offerings so
      LEFT JOIN subject_catalog sc ON sc.id = so.subject_id
      ${whereSql}
      ORDER BY so.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}`;
    const countSql = `SELECT COUNT(*)::int AS total FROM subject_offerings so LEFT JOIN subject_catalog sc ON sc.id = so.subject_id ${whereSql}`;

    const [dataRes, countRes] = await Promise.all([query(dataSql, params), query(countSql, params)]);
    const items = dataRes.rows;
    const total = countRes.rows[0]?.total || 0;
    const etag = crypto.createHash("sha1").update(JSON.stringify({ q, cohortId, page, pageSize, total })).digest("hex");

    const res = NextResponse.json({ items, total, page, pageSize, etag });
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.headers.set("ETag", etag);
    return res;
  } catch (e) {
    return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 10, etag: null, error: e.message }, { status: 200 });
  }
}



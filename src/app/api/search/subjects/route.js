import { NextResponse } from "next/server";
import crypto from "crypto";
import { listSubjectOfferings } from "@/lib/db/classesSubjects.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get("cohort_id");
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "20", 10), 1), 100);
    
    // cohort_id is required to fetch subjects for a cohort
    if (!cohortId) {
      return NextResponse.json({ 
        items: [], 
        total: 0, 
        page: 1, 
        pageSize: 20, 
        etag: null,
        error: "cohort_id is required" 
      }, { status: 400 });
    }

    // Fetch subject offerings for the cohort
    const filters = {
      cohort_id: cohortId,
      status: 'published', // Only show published subjects
      page,
      limit: pageSize,
    };

    const subjectOfferings = await listSubjectOfferings(filters);

    // Transform to the format expected by AsyncSelect
    let items = subjectOfferings.map(so => ({
      id: so.id, // Use subject_offering_id as the ID
      label: so.subject_title || so.subject_code || `Subject ${so.id.substring(0, 8)}`,
      code: so.subject_code,
      title: so.subject_title,
      category: so.subject_category,
      subject_id: so.subject_id,
      elective_group_id: so.elective_group_id,
    }));

    // Apply search filter if provided
    if (q) {
      const searchLower = q.toLowerCase();
      items = items.filter(item => 
        (item.code && item.code.toLowerCase().includes(searchLower)) ||
        (item.title && item.title.toLowerCase().includes(searchLower))
      );
    }

    const total = items.length;
    const etag = crypto.createHash("sha1").update(JSON.stringify({ cohortId, q, page, pageSize, total })).digest("hex");

    const res = NextResponse.json({ items, total, page, pageSize, etag });
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.headers.set("ETag", etag);
    return res;
  } catch (e) {
    console.error('[API] Error fetching subjects:', e);
    return NextResponse.json({ 
      items: [], 
      total: 0, 
      page: 1, 
      pageSize: 20, 
      etag: null, 
      error: e.message 
    }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import crypto from "crypto";
import { listProgramNodes } from "@/lib/db/classesSubjects.js";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "20", 10), 1), 100);
    
    // Get session to determine org_id (for filtering)
    const session = await auth();
    const orgId = session?.user?.orgId || null;
    
    // Build filters
    const filters = {
      org_id: orgId,
      status: 'active', // Only show active program nodes
      page,
      limit: pageSize,
    };
    
    // Add search term if provided
    if (q) {
      filters.search = q;
    }
    
    // Fetch program nodes
    const programNodes = await listProgramNodes(filters);
    
    // Transform to the format expected by AsyncSelect
    const items = programNodes.map(pn => ({
      id: pn.id,
      label: `${pn.code} - ${pn.title}`,
      code: pn.code,
      title: pn.title,
      level: pn.level,
      node_type: pn.node_type,
      parent_id: pn.parent_id,
    }));
    
    const total = items.length;
    const etag = crypto.createHash("sha1").update(JSON.stringify({ q, orgId, page, pageSize, total })).digest("hex");
    
    const res = NextResponse.json({ items, total, page, pageSize, etag });
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.headers.set("ETag", etag);
    return res;
  } catch (e) {
    console.error('[API] Error fetching program nodes:', e);
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


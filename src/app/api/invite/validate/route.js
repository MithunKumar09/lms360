import { NextResponse } from "next/server";
import { sha256 } from "@/lib/security/tokens.js";
import { getInviteByTokenHash } from "@/lib/db/users.js";

// Export GET for health check / debugging
export async function GET(request) {
  console.log('🔍 [INVITE_VALIDATE] GET request received - route is working');
  return NextResponse.json({ 
    message: "Invite validate endpoint is working",
    method: "Use POST to validate an invite token",
    example: { token: "your-invite-token-here" }
  });
}

// Simple in-memory rate limit per IP (dev-friendly). Replace with Upstash in prod.
const rl = new Map();
function rateLimit(key, limit = 5, windowMs = 60 * 1000) {
  const now = Date.now();
  const rec = rl.get(key) || { count: 0, reset: now + windowMs };
  if (now > rec.reset) {
    rec.count = 0;
    rec.reset = now + windowMs;
  }
  rec.count += 1;
  rl.set(key, rec);
  return rec.count <= limit;
}

export async function POST(request) {
  console.log('🔍 [INVITE_VALIDATE] ===== INVITE VALIDATE REQUEST STARTED =====');
  console.log('🔍 [INVITE_VALIDATE] Request method:', request.method);
  console.log('🔍 [INVITE_VALIDATE] Request URL:', request.url);
  
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    console.log('🔍 [INVITE_VALIDATE] Client IP:', ip);
    
    if (!rateLimit(`invite_validate:${ip}`)) {
      console.log('🔍 [INVITE_VALIDATE] ❌ Rate limit exceeded for IP:', ip);
      return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
    }
    
    const body = await request.json();
    console.log('🔍 [INVITE_VALIDATE] Request body received:', { token: body?.token ? body.token.substring(0, 20) + '...' : 'missing' });
    
    const token = body?.token || "";
    if (!token || token.length < 20) {
      console.log('🔍 [INVITE_VALIDATE] ❌ Invalid token:', { tokenLength: token.length, hasToken: !!token });
      return NextResponse.json({ error: "INVALID_TOKEN", message: "Token is required and must be at least 20 characters" }, { status: 400 });
    }
    
    console.log('🔍 [INVITE_VALIDATE] Hashing token...');
    const tokenHashBuffer = sha256(token);
    const tokenHashHex = tokenHashBuffer.toString("hex");
    console.log('🔍 [INVITE_VALIDATE] Token hash generated (hex):', tokenHashHex.substring(0, 16) + '...');
    console.log('🔍 [INVITE_VALIDATE] Full token hash (hex):', tokenHashHex);
    
    console.log('🔍 [INVITE_VALIDATE] Looking up invite in database...');
    // Pass hex string to match how it's stored in the database
    const invite = await getInviteByTokenHash(tokenHashHex);
    
    if (!invite) {
      console.log('🔍 [INVITE_VALIDATE] ❌ Invite not found or expired');
      return NextResponse.json({ error: "NOT_FOUND_OR_EXPIRED", message: "Invite token not found or has expired" }, { status: 404 });
    }
    
    console.log('🔍 [INVITE_VALIDATE] ✅ Invite found:', {
      inviteId: invite.id,
      email: invite.email,
      role: invite.role_code,
      expiresAt: invite.expires_at,
    });
    
    const masked = (email) => {
      const [user, domain] = String(email).split("@");
      return `${user?.slice(0, 2)}***@${domain}`;
    };
    
    // Use display_name if available, otherwise fall back to name
    const orgName = invite.org_display_name || invite.org_name || null;
    
    // For vendor role, fetch assigned organizations
    let organizations = [];
    if (invite.role_code === 'vendor') {
      const { query } = await import('@/lib/db/index.js');
      try {
        // Check if user already exists (might have been created during request acceptance)
        const userCheck = await query(
          'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
          [invite.email]
        );
        
        if (userCheck.rows.length > 0) {
          // User exists, fetch their assigned organizations
          const vendorOrgs = await query(
            `SELECT o.id, o.name, o.display_name
             FROM organizations o
             INNER JOIN vendor_organizations vo ON o.id = vo.organization_id
             WHERE vo.vendor_id = $1 AND o.status = 'active'
             ORDER BY o.name`,
            [userCheck.rows[0].id]
          );
          organizations = vendorOrgs.rows.map(org => ({
            id: org.id,
            name: org.display_name || org.name,
          }));
        }
      } catch (orgError) {
        console.error('🔍 [INVITE_VALIDATE] Error fetching vendor organizations:', orgError);
        // Don't fail validation if org fetch fails
      }
    }
    
    const response = {
      ok: true,
      inviteId: invite.id,
      emailMasked: masked(invite.email),
      role: invite.role_code,
      orgName: orgName,
      orgId: invite.org_id || null,
      organizations: organizations.length > 0 ? organizations : (orgName ? [{ name: orgName }] : []),
      mfa_required: invite.mfa_required,
      mfa_method: invite.mfa_method,
      expires_at: invite.expires_at,
    };
    
    console.log('🔍 [INVITE_VALIDATE] ✅ Validation successful, returning response');
    return NextResponse.json(response);
  } catch (e) {
    console.error('🔍 [INVITE_VALIDATE] ❌ ===== INVITE VALIDATE ERROR =====');
    console.error('🔍 [INVITE_VALIDATE] Error:', e.message);
    console.error('🔍 [INVITE_VALIDATE] Error stack:', e.stack);
    return NextResponse.json({ error: "SERVER_ERROR", message: e.message }, { status: 500 });
  }
}



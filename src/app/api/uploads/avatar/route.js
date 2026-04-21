import { NextResponse } from "next/server";
import { getR2Client, getR2BucketName, buildTenantR2Key, buildR2PublicUrlFromFullKey } from "@/lib/r2/config.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";

// POST: issue presigned URL for avatar upload
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const contentType = body.contentType || searchParams.get("contentType") || "";

    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
    }

    const size = Number(body.size || searchParams.get("size") || 0);
    if (size <= 0 || size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "SIZE_EXCEEDED" }, { status: 400 });
    }

    // Phase D: derive orgId to build tenant-isolated path
    let orgId = null;
    try {
      const session = await auth();
      orgId = session?.user?.orgId ?? null;
    } catch { /* unauthenticated upload — orgId stays null, goes to platform/global */ }

    const ext = contentType.split("/")[1] || "bin";
    const filename = `${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
    // Phase D path: tenants/{orgId}/users/{filename}
    const fullKey = buildTenantR2Key(orgId, 'users', filename);

    const s3 = getR2Client();
    const bucket = getR2BucketName();

    const putCmd = new PutObjectCommand({
      Bucket: bucket,
      Key: fullKey,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, putCmd, { expiresIn: 60 });
    const publicUrl = buildR2PublicUrlFromFullKey(fullKey);

    return NextResponse.json({ uploadUrl: url, key: fullKey, publicUrl, expiresIn: 60 });
  } catch (e) {
    return NextResponse.json({ error: "SERVER_ERROR", message: e.message }, { status: 500 });
  }
}



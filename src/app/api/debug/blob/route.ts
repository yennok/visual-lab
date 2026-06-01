import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// TEMPORARY debug endpoint (dev-only). Diagnoses why Blob `put()` fails inside
// the running server even though the same token uploads fine standalone. It
// reports the runtime token (masked) and the result of a real `put()` using the
// exact same implicit-token path as /api/generate. Remove once root cause found.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN ?? "";
  const tokenLen = token.length;
  const tokenPrefix = token.slice(0, 22);

  let putResult: string;
  try {
    const blob = await put(`debug/inapp-${Date.now()}.txt`, "hi", {
      access: "public",
    });
    putResult = `SUCCESS ${blob.url}`;
  } catch (e) {
    putResult = `FAILED ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({
    tokenLen,
    tokenPrefix,
    runtime: "nodejs",
    put: putResult,
  });
}

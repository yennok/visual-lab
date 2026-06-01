import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

// TEMPORARY debug endpoint (dev-only). The 22-char prefix is just the store id
// (shared by every token for the store), so it can't distinguish a live token
// from a stale one. This compares what the running server's process.env holds
// against what's actually written in .env.local, and tries put() both ways.
// Remove once root cause found. Only a non-reversible fingerprint is exposed.
function fingerprint(t: string) {
  return {
    len: t.length,
    prefix: t.slice(0, 22),
    last4: t.slice(-4),
    hash: t ? createHash("sha256").update(t).digest("hex").slice(0, 12) : "",
  };
}

async function tryPut(token?: string) {
  try {
    const b = await put(`debug/inapp-${Date.now()}.txt`, "hi", {
      access: "public",
      ...(token ? { token } : {}),
    });
    return `SUCCESS ${b.url}`;
  } catch (e) {
    return `FAILED ${e instanceof Error ? e.message : String(e)}`;
  }
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const envToken = process.env.BLOB_READ_WRITE_TOKEN ?? "";

  // Read .env.local straight off disk to compare with the runtime value.
  let fileToken = "";
  try {
    const txt = readFileSync(".env.local", "utf8");
    const line = txt
      .split("\n")
      .find((l) => l.startsWith("BLOB_READ_WRITE_TOKEN="));
    if (line) {
      fileToken = line
        .split("=")
        .slice(1)
        .join("=")
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  } catch {
    // ignore — fileToken stays ""
  }

  return NextResponse.json({
    sameTokens: envToken === fileToken,
    envToken: fingerprint(envToken), // what the running server uses (implicit put)
    fileToken: fingerprint(fileToken), // what .env.local actually contains
    putWithEnv: await tryPut(), // implicit token — identical to /api/generate
    putWithFile: await tryPut(fileToken), // explicit token from the file
  });
}

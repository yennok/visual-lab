import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { generateImage } from "@/lib/gemini";
import { buildBrandPrompt, type BrandSubject } from "@/lib/brand-prompt";
import { getOrCreateWorkspace } from "@/lib/user";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/generate — Phase 1 pipeline:
// buildBrandPrompt() → generateImage() (Gemini) → Blob put() → Generation row.
// Gated by middleware; the auth() check is defense-in-depth.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { scene?: string; aspectRatio?: string; imageSize?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const scene = (body.scene ?? "").trim();
  if (!scene) {
    return NextResponse.json({ error: "A scene is required." }, { status: 400 });
  }
  const aspectRatio = body.aspectRatio ?? "3:2";
  const imageSize = body.imageSize ?? "2K";

  const { brand, campaign } = await getOrCreateWorkspace();
  const subjects = (brand.subjects as unknown as BrandSubject[]) ?? [];
  const prompt = buildBrandPrompt({ stylePrompt: brand.stylePrompt, subjects, scene });

  let result;
  try {
    result = await generateImage({ prompt, aspectRatio, imageSize });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const buffer = Buffer.from(result.image.dataBase64, "base64");
  const ext = result.image.mimeType.includes("jpeg") ? "jpg" : "png";
  const blob = await put(`generations/${randomUUID()}.${ext}`, buffer, {
    access: "public",
    contentType: result.image.mimeType,
  });

  const generation = await prisma.generation.create({
    data: {
      campaignId: campaign.id,
      brandId: brand.id,
      scene,
      prompt,
      modelText: result.text || null,
      aspectRatio,
      imageSize,
      blobUrl: blob.url,
      author: userId,
    },
  });

  return NextResponse.json({ generation });
}

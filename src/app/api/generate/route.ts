import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { generateImage, type ReferenceImage } from "@/lib/gemini";
import { buildBrandPrompt, type BrandSubject } from "@/lib/brand-prompt";
import { getOrCreateWorkspace } from "@/lib/user";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_REFERENCE_IMAGES = 6;

// POST /api/generate — Phase 1 pipeline:
// buildBrandPrompt() + brand reference images → generateImage() (Gemini) →
// Blob put() → Generation row. Gated by middleware; auth() is defense-in-depth.
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

  // Map each reference id to the subject(s) it depicts, so we can label the
  // images we hand the model ("Reference image of X:").
  const labelByRefId = new Map<string, string>();
  for (const sub of subjects) {
    for (const refId of sub.refIds ?? []) {
      if (sub.name.trim() && !labelByRefId.has(refId)) {
        labelByRefId.set(refId, `Reference image of ${sub.name.trim()}:`);
      }
    }
  }

  const refs = await prisma.reference.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: "asc" },
  });
  // Feed subject-anchor images first (consistency of the people/products),
  // then fill the remaining slots with general style references.
  const ordered = [
    ...refs.filter((r) => labelByRefId.has(r.id)),
    ...refs.filter((r) => !labelByRefId.has(r.id)),
  ].slice(0, MAX_REFERENCE_IMAGES);

  const referenceImages: ReferenceImage[] = [];
  const usedRefIds: string[] = [];
  for (const ref of ordered) {
    try {
      const res = await fetch(ref.blobUrl);
      if (!res.ok) continue;
      const mimeType = res.headers.get("content-type") || "image/png";
      const buf = Buffer.from(await res.arrayBuffer());
      referenceImages.push({
        mimeType,
        dataBase64: buf.toString("base64"),
        label: labelByRefId.get(ref.id),
      });
      usedRefIds.push(ref.id);
    } catch {
      // Skip references that can't be fetched.
    }
  }

  let result;
  try {
    result = await generateImage({ prompt, referenceImages, aspectRatio, imageSize });
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
      references: usedRefIds,
      blobUrl: blob.url,
      author: userId,
    },
  });

  return NextResponse.json({ generation });
}

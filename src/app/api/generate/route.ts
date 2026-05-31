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

  let body: {
    scene?: string;
    aspectRatio?: string;
    imageSize?: string;
    palette?: string[];
    tags?: string[];
    referenceIds?: string[];
    extraReferenceUrls?: string[];
  };
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
  // Per-generation overrides: an explicit array (even empty) wins; `undefined`
  // falls back to the brand's saved values. This lets the Composer say "use no
  // tags" distinctly from "I didn't send an override".
  const brandTags = (brand.tags as unknown as string[]) ?? [];
  const brandPalette = (brand.palette as unknown as string[]) ?? [];
  const tags = Array.isArray(body.tags) ? body.tags : brandTags;
  const palette = Array.isArray(body.palette) ? body.palette : brandPalette;
  const prompt = buildBrandPrompt({
    stylePrompt: brand.stylePrompt,
    subjects,
    scene,
    tags,
    palette,
  });

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

  let refs = await prisma.reference.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: "asc" },
  });
  // When the Composer sends an explicit reference selection, honor it (already
  // scoped to this brand by the query above); otherwise use them all.
  if (Array.isArray(body.referenceIds)) {
    const picked = new Set(body.referenceIds);
    refs = refs.filter((r) => picked.has(r.id));
  }
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

  // Temporary, per-generation reference images uploaded straight from the
  // Workspace. They are NOT persisted to the brand (no Reference row, not in
  // usedRefIds). We only fetch URLs that live on our own Vercel Blob store —
  // fetching arbitrary client-supplied URLs server-side would be an SSRF hole.
  if (Array.isArray(body.extraReferenceUrls)) {
    for (const url of body.extraReferenceUrls) {
      if (referenceImages.length >= MAX_REFERENCE_IMAGES) break;
      let host: string;
      try {
        host = new URL(url).hostname;
      } catch {
        continue;
      }
      if (!host.endsWith(".blob.vercel-storage.com")) continue;
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const mimeType = res.headers.get("content-type") || "image/png";
        const buf = Buffer.from(await res.arrayBuffer());
        referenceImages.push({ mimeType, dataBase64: buf.toString("base64") });
      } catch {
        // Skip temporary references that can't be fetched.
      }
    }
  }

  let result;
  try {
    result = await generateImage({ prompt, referenceImages, aspectRatio, imageSize });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!result.image?.dataBase64) {
    return NextResponse.json(
      {
        error:
          result.text?.trim() ||
          "The model returned no image. Try again or adjust the prompt.",
      },
      { status: 502 },
    );
  }

  // Persisting the result (Blob upload + DB row) can also fail — keep it inside a
  // try so the client always gets a JSON error instead of an empty 500 body.
  let generation;
  try {
    const buffer = Buffer.from(result.image.dataBase64, "base64");
    const ext = result.image.mimeType.includes("jpeg") ? "jpg" : "png";
    const blob = await put(`generations/${randomUUID()}.${ext}`, buffer, {
      access: "public",
      contentType: result.image.mimeType,
    });

    generation = await prisma.generation.create({
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
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save the generated image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ generation });
}

"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrCreateWorkspace } from "@/lib/user";
import type { BrandSubject } from "@/lib/brand-prompt";
import {
  analyzeBrandImages,
  composeStylePrompt,
  normalizePalette,
  type BrandImage,
} from "@/lib/brand-analysis";

const REFERENCE_KINDS = ["mood", "product", "turnaround", "other"];

export async function updateBrand(input: {
  name: string;
  styleTemplate: string;
  stylePrompt: string;
  subjects: BrandSubject[];
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  // getOrCreateWorkspace returns this user's own brand, so the update is scoped.
  const { brand } = await getOrCreateWorkspace();

  // Only let subjects point at references that actually belong to this brand.
  const ownRefs = await prisma.reference.findMany({
    where: { brandId: brand.id },
    select: { id: true },
  });
  const ownRefIds = new Set(ownRefs.map((r) => r.id));

  const subjects = (input.subjects ?? [])
    .map((s) => ({
      name: s.name.trim(),
      description: s.description.trim(),
      refIds: Array.from(new Set(s.refIds ?? [])).filter((id) =>
        ownRefIds.has(id),
      ),
    }))
    .filter((s) => s.name.length > 0);

  await prisma.brand.update({
    where: { id: brand.id },
    data: {
      name: input.name.trim() || "My Brand",
      styleTemplate: input.styleTemplate || "custom",
      stylePrompt: input.stylePrompt.trim(),
      subjects,
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/brands");
}

export async function addReference(input: {
  blobUrl: string;
  name: string;
  kind: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const { brand } = await getOrCreateWorkspace();

  await prisma.reference.create({
    data: {
      brandId: brand.id,
      blobUrl: input.blobUrl,
      name: input.name.slice(0, 120) || "reference",
      kind: REFERENCE_KINDS.includes(input.kind) ? input.kind : "mood",
    },
  });

  revalidatePath("/app/brands");
}

export async function setReferenceKind(id: string, kind: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const { brand } = await getOrCreateWorkspace();

  // Scope by brandId so a user can only touch their own references.
  await prisma.reference.updateMany({
    where: { id, brandId: brand.id },
    data: { kind: REFERENCE_KINDS.includes(kind) ? kind : "mood" },
  });

  revalidatePath("/app/brands");
}

export async function removeReference(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const { brand } = await getOrCreateWorkspace();

  await prisma.reference.deleteMany({ where: { id, brandId: brand.id } });
  revalidatePath("/app/brands");
}

export async function analyzeBrand(): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const { brand } = await getOrCreateWorkspace();

  const references = await prisma.reference.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: "asc" },
    take: 8,
  });
  if (references.length === 0) {
    return { ok: false, error: "Upload at least one reference image first." };
  }

  // Fetch the (public) blobs and turn them into base64 for Gemini.
  const images: BrandImage[] = [];
  for (const ref of references) {
    try {
      const res = await fetch(ref.blobUrl);
      if (!res.ok) continue;
      const mimeType = res.headers.get("content-type") || "image/png";
      const buf = Buffer.from(await res.arrayBuffer());
      images.push({ mimeType, dataBase64: buf.toString("base64") });
    } catch {
      // Skip a reference that can't be fetched.
    }
  }
  if (images.length === 0) {
    return { ok: false, error: "Could not read the reference images." };
  }

  try {
    const analysis = await analyzeBrandImages(images);
    await prisma.brand.update({
      where: { id: brand.id },
      data: {
        stylePrompt: composeStylePrompt(analysis),
        palette: normalizePalette(analysis.palette),
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Analysis failed.",
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/brands");
  return { ok: true };
}

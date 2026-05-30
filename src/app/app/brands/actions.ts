"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrCreateWorkspace } from "@/lib/user";
import type { BrandSubject } from "@/lib/brand-prompt";

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

  const subjects = (input.subjects ?? [])
    .map((s) => ({ name: s.name.trim(), description: s.description.trim() }))
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

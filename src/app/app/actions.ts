"use server";

import { auth } from "@clerk/nextjs/server";
import { getOrCreateWorkspace } from "@/lib/user";
import { improveScenePrompt } from "@/lib/prompt-improve";

// Rewrite a rough scene into a clearer image-generation prompt, leaning on the
// caller's brand for context. Returns the improved text for the Composer to drop
// back into its textarea (the user can still edit before generating).
export async function improvePrompt(
  scene: string,
): Promise<{ ok: boolean; prompt?: string; error?: string }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const { brand } = await getOrCreateWorkspace();

  const tags = (brand.tags as unknown as string[]) ?? [];
  try {
    const prompt = await improveScenePrompt({
      scene,
      stylePrompt: brand.stylePrompt,
      tags,
    });
    return { ok: true, prompt };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not improve the prompt.",
    };
  }
}

import { auth, currentUser } from "@clerk/nextjs/server";
import type { Brand, Campaign, Client, User } from "@prisma/client";
import { prisma } from "@/lib/db";

const DEFAULT_STYLE_PROMPT =
  "Clean, modern, photographic. Natural light, crisp focus, neutral background. A consistent, on-brand look across every image.";

export type Workspace = {
  user: User;
  brand: Brand;
  client: Client;
  campaign: Campaign;
};

/**
 * Resolve the signed-in Clerk user to a DB User (creating the row on first
 * sign-in) and guarantee a default Brand + "My Work" Client + "General"
 * Campaign exist. Phase 1 is single-brand-per-user; the onboarding wizard and
 * multi-brand support come later.
 */
export async function getOrCreateWorkspace(): Promise<Workspace> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    `${userId}@placeholder.local`;

  const user = await prisma.user.upsert({
    where: { clerkUserId: userId },
    update: {},
    create: { clerkUserId: userId, email },
  });

  let brand = await prisma.brand.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!brand) {
    brand = await prisma.brand.create({
      data: { userId: user.id, name: "My Brand", stylePrompt: DEFAULT_STYLE_PROMPT },
    });
  }

  let client = await prisma.client.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!client) {
    client = await prisma.client.create({
      data: { userId: user.id, name: "My Work" },
    });
  }

  let campaign = await prisma.campaign.findFirst({
    where: { clientId: client.id },
    orderBy: { createdAt: "asc" },
  });
  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: { clientId: client.id, brandId: brand.id, name: "General" },
    });
  }

  return { user, brand, client, campaign };
}

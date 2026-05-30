import { prisma } from "@/lib/db";
import { getOrCreateWorkspace } from "@/lib/user";
import { Composer } from "./_components/composer";

export const dynamic = "force-dynamic";

export default async function AppHome() {
  const { brand, campaign } = await getOrCreateWorkspace();
  const generations = await prisma.generation.findMany({
    where: { campaignId: campaign.id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Workspace</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Brand: {brand.name} · Campaign: {campaign.name}
        </p>
      </div>

      <Composer />

      {generations.length === 0 ? (
        <p className="text-zinc-500">
          No generations yet — describe a scene above to create your first image.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {generations.map((g) => (
            <figure key={g.id} className="overflow-hidden rounded-card border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.blobUrl}
                alt={g.scene}
                className="aspect-[3/2] w-full object-cover"
              />
              <figcaption className="line-clamp-2 p-2 text-xs text-zinc-500">
                {g.scene}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}

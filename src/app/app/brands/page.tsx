import type { BrandSubject } from "@/lib/brand-prompt";
import { prisma } from "@/lib/db";
import { getOrCreateWorkspace } from "@/lib/user";
import { BrandForm } from "./brand-form";
import { Palette } from "./palette";
import { ReferenceUploader } from "./reference-uploader";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const { brand } = await getOrCreateWorkspace();
  const references = await prisma.reference.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: "asc" },
  });
  const subjects = (brand.subjects as unknown as BrandSubject[]) ?? [];
  const palette = (brand.palette as unknown as string[]) ?? [];

  return (
    <section className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Brand Studio</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload your brand or moodboard images and let AI turn them into a
          reusable style. Every generation uses it — but you can also generate
          without setting this up.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Reference images
        </h2>
        <ReferenceUploader
          references={references.map((r) => ({
            id: r.id,
            blobUrl: r.blobUrl,
            name: r.name,
            kind: r.kind,
          }))}
        />
      </div>

      {palette.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Palette
          </h2>
          <Palette palette={palette} />
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Style
        </h2>
        <BrandForm
          key={brand.stylePrompt}
          initial={{
            name: brand.name,
            styleTemplate: brand.styleTemplate,
            stylePrompt: brand.stylePrompt,
            subjects,
          }}
        />
      </div>
    </section>
  );
}

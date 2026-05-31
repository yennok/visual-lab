import type { BrandSubject } from "@/lib/brand-prompt";
import { prisma } from "@/lib/db";
import { getOrCreateWorkspace } from "@/lib/user";
import { BrandForm } from "./brand-form";
import { PaletteEditor } from "./palette-editor";
import { TagsEditor } from "./tags-editor";
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
  const tags = (brand.tags as unknown as string[]) ?? [];

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

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Palette
        </h2>
        <p className="text-xs text-zinc-500">
          AI-extracted from your references. Edit, remove, add your own (pick or
          type a hex), or pull colors from an image of brand-guideline swatches.
        </p>
        <PaletteEditor key={palette.join(",")} initial={palette} />
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Tags
        </h2>
        <p className="text-xs text-zinc-500">
          The brand&apos;s defining highlights — AI-suggested, fully yours to edit.
        </p>
        <TagsEditor key={tags.join(",")} initial={tags} />
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Style
        </h2>
        <BrandForm
          key={brand.stylePrompt}
          references={references.map((r) => ({
            id: r.id,
            blobUrl: r.blobUrl,
            name: r.name,
          }))}
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

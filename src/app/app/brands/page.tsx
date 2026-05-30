import type { BrandSubject } from "@/lib/brand-prompt";
import { getOrCreateWorkspace } from "@/lib/user";
import { BrandForm } from "./brand-form";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const { brand } = await getOrCreateWorkspace();
  const subjects = (brand.subjects as unknown as BrandSubject[]) ?? [];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Brand</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Define your look once — every generation uses it.
        </p>
      </div>
      <BrandForm
        initial={{
          name: brand.name,
          styleTemplate: brand.styleTemplate,
          stylePrompt: brand.stylePrompt,
          subjects,
        }}
      />
    </section>
  );
}

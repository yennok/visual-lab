"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { improvePrompt } from "../actions";
import { ReferencePicker, type BrandRef } from "./reference-picker";

export function Composer({
  palette = [],
  tags = [],
  references = [],
}: {
  palette?: string[];
  tags?: string[];
  references?: BrandRef[];
}) {
  const router = useRouter();
  const [scene, setScene] = useState("");
  const [loading, setLoading] = useState(false);
  const [improving, startImprove] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Per-generation overrides — everything starts selected; deselecting affects
  // only this generation, never the saved brand.
  const [selectedPalette, setSelectedPalette] = useState<string[]>(palette);
  const [selectedTags, setSelectedTags] = useState<string[]>(tags);
  const [selectedRefIds, setSelectedRefIds] = useState<string[]>(
    references.map((r) => r.id),
  );
  const [tempRefUrls, setTempRefUrls] = useState<string[]>([]);

  const busy = loading || improving;

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  function handleImprove() {
    if (!scene.trim() || busy) return;
    setError(null);
    startImprove(async () => {
      const res = await improvePrompt(scene);
      if (res.ok && res.prompt) setScene(res.prompt);
      else setError(res.error ?? "Could not improve the prompt.");
    });
  }

  async function handleGenerate() {
    if (!scene.trim() || busy) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene,
          palette: selectedPalette,
          tags: selectedTags,
          referenceIds: selectedRefIds,
          extraReferenceUrls: tempRefUrls,
        }),
      });
      // Read the body as text first: a failing route can return an empty body,
      // and res.json() on "" throws "Unexpected end of JSON input", masking the
      // real status.
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;
      if (!res.ok) {
        throw new Error(
          data?.error ?? `Generation failed (HTTP ${res.status}).`,
        );
      }
      setScene("");
      setTempRefUrls([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-card border p-4">
      <textarea
        value={scene}
        onChange={(e) => setScene(e.target.value)}
        placeholder="Describe the scene… e.g. 'product on a sunlit marble counter, soft morning light'"
        rows={3}
        disabled={busy}
        className="w-full resize-none rounded-lg border p-3 text-sm outline-none focus:border-black disabled:opacity-50"
      />

      {palette.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-zinc-500">Palette</span>
          <div className="flex flex-wrap gap-2">
            {palette.map((hex) => {
              const on = selectedPalette.includes(hex);
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() =>
                    setSelectedPalette((p) => toggle(p, hex))
                  }
                  disabled={busy}
                  aria-pressed={on}
                  className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs ${
                    on ? "" : "opacity-35"
                  }`}
                >
                  <span
                    className="block h-5 w-5 rounded-full border"
                    style={{ backgroundColor: hex }}
                  />
                  {hex}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tags.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-zinc-500">Keywords</span>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const on = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTags((t) => toggle(t, tag))}
                  disabled={busy}
                  aria-pressed={on}
                  className={`rounded-full px-3 py-1 text-sm ${
                    on
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ReferencePicker
        references={references}
        selectedIds={selectedRefIds}
        onToggle={(id) => setSelectedRefIds((ids) => toggle(ids, id))}
        tempUrls={tempRefUrls}
        onAddTemp={(url) => setTempRefUrls((u) => [...u, url])}
        onRemoveTemp={(url) =>
          setTempRefUrls((u) => u.filter((x) => x !== url))
        }
        disabled={busy}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={busy || !scene.trim()}
          className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {loading ? "Generating…" : "Generate"}
        </button>
        <button
          type="button"
          onClick={handleImprove}
          disabled={busy || !scene.trim()}
          className="rounded-full border px-4 py-2.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-40"
        >
          {improving ? "Improving…" : "✨ Improve prompt"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}

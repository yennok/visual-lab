"use client";

import { useState, useTransition } from "react";
import { updateTags } from "./actions";

export function TagsEditor({ initial }: { initial: string[] }) {
  const [tags, setTags] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const dirty = JSON.stringify(tags) !== JSON.stringify(initial);

  function addTag(raw: string) {
    const v = raw.trim().slice(0, 40);
    if (!v) return;
    setSaved(false);
    setTags((prev) =>
      prev.some((t) => t.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v],
    );
    setDraft("");
  }

  function removeTag(i: number) {
    setSaved(false);
    setTags((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateTags(tags);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="flex items-center gap-1.5 rounded-full bg-zinc-100 py-1 pl-3 pr-2 text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="text-zinc-400 hover:text-zinc-700"
              aria-label={`Remove ${tag}`}
            >
              ✕
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-sm text-zinc-500">
            No tags yet — analyze your references or add highlights below.
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(draft);
            }
          }}
          placeholder="Add a tag…"
          className="w-44 rounded-lg border p-2 text-sm outline-none focus:border-black"
        />
        <button
          type="button"
          onClick={() => addTag(draft)}
          className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Add tag
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !dirty}
          className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save tags"}
        </button>
        {saved && !pending && !dirty && (
          <span className="text-sm text-green-600">Saved ✓</span>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import type { BrandSubject } from "@/lib/brand-prompt";
import { updateBrand } from "./actions";

const TEMPLATES = [
  "editorial",
  "studio-product",
  "retro-lab",
  "minimalist",
  "cinematic",
  "custom",
];

export function BrandForm({
  initial,
}: {
  initial: {
    name: string;
    styleTemplate: string;
    stylePrompt: string;
    subjects: BrandSubject[];
  };
}) {
  const [name, setName] = useState(initial.name);
  const [styleTemplate, setStyleTemplate] = useState(initial.styleTemplate);
  const [stylePrompt, setStylePrompt] = useState(initial.stylePrompt);
  const [subjects, setSubjects] = useState<BrandSubject[]>(initial.subjects);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function setSubject(i: number, patch: Partial<BrandSubject>) {
    setSubjects((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateBrand({ name, styleTemplate, stylePrompt, subjects });
      setSaved(true);
    });
  }

  return (
    <div className="max-w-2xl space-y-5">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Brand name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border p-2.5 text-sm outline-none focus:border-black"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Style template</span>
        <select
          value={styleTemplate}
          onChange={(e) => setStyleTemplate(e.target.value)}
          className="w-full rounded-lg border bg-white p-2.5 text-sm outline-none focus:border-black"
        >
          {TEMPLATES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Style prompt</span>
        <span className="block text-xs text-zinc-500">
          The look applied to every image — palette, lighting, mood, composition.
        </span>
        <textarea
          value={stylePrompt}
          onChange={(e) => setStylePrompt(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-lg border p-2.5 text-sm outline-none focus:border-black"
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm font-medium">Subjects</span>
        <span className="block text-xs text-zinc-500">
          Recurring people or products in your images (name + description).
        </span>
        {subjects.map((s, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={s.name}
              onChange={(e) => setSubject(i, { name: e.target.value })}
              placeholder="Name"
              className="w-1/3 rounded-lg border p-2 text-sm outline-none focus:border-black"
            />
            <input
              value={s.description}
              onChange={(e) => setSubject(i, { description: e.target.value })}
              placeholder="Description"
              className="flex-1 rounded-lg border p-2 text-sm outline-none focus:border-black"
            />
            <button
              type="button"
              onClick={() => setSubjects((prev) => prev.filter((_, idx) => idx !== i))}
              className="rounded-lg border px-3 text-sm text-zinc-500"
              aria-label="Remove subject"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSubjects((prev) => [...prev, { name: "", description: "" }])}
          className="text-sm text-zinc-600 underline"
        >
          + Add subject
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={pending}
          className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save brand"}
        </button>
        {saved && !pending && <span className="text-sm text-green-600">Saved ✓</span>}
      </div>
    </div>
  );
}

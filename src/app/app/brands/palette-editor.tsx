"use client";

import { useRef, useState, useTransition } from "react";
import { extractColorsFromImage, updatePalette } from "./actions";

const HEX6 = /^#[0-9a-f]{6}$/;

function toHex(raw: string): string | null {
  let v = raw.trim().replace(/^#?/, "#").toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(v)) {
    v = "#" + v.slice(1).split("").map((c) => c + c).join("");
  }
  return HEX6.test(v) ? v : null;
}

function readAsBase64(file: File): Promise<{ mimeType: string; dataBase64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve({ mimeType: file.type || "image/png", dataBase64: result.split(",")[1] ?? "" });
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export function PaletteEditor({ initial }: { initial: string[] }) {
  const [colors, setColors] = useState<string[]>(initial);
  const [draft, setDraft] = useState("#000000");
  const [pending, startTransition] = useTransition();
  const [extracting, setExtracting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(colors) !== JSON.stringify(initial);

  function addColors(incoming: string[]) {
    setSaved(false);
    setColors((prev) => {
      const seen = new Set(prev);
      const next = [...prev];
      for (const c of incoming) {
        const hex = toHex(c);
        if (hex && !seen.has(hex)) {
          seen.add(hex);
          next.push(hex);
        }
      }
      return next.slice(0, 12);
    });
  }

  function editColor(i: number, value: string) {
    const hex = toHex(value);
    if (!hex) return;
    setSaved(false);
    setColors((prev) => prev.map((c, idx) => (idx === i ? hex : c)));
  }

  function removeColor(i: number) {
    setSaved(false);
    setColors((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onExtractFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setExtracting(true);
    try {
      for (const file of Array.from(files)) {
        const img = await readAsBase64(file);
        const res = await extractColorsFromImage(img);
        if (res.ok && res.colors) addColors(res.colors);
        else if (res.error) setError(res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read colors.");
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updatePalette(colors);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {colors.map((hex, i) => (
          <div
            key={`${hex}-${i}`}
            className="flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2"
          >
            <label className="relative h-6 w-6 cursor-pointer">
              <span
                className="block h-6 w-6 rounded-full border"
                style={{ backgroundColor: hex }}
              />
              <input
                type="color"
                value={hex}
                onChange={(e) => editColor(i, e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label={`Edit color ${hex}`}
              />
            </label>
            <span className="text-xs text-zinc-600">{hex}</span>
            <button
              type="button"
              onClick={() => removeColor(i)}
              className="text-xs text-zinc-400 hover:text-zinc-700"
              aria-label={`Remove ${hex}`}
            >
              ✕
            </button>
          </div>
        ))}
        {colors.length === 0 && (
          <span className="text-sm text-zinc-500">
            No colors yet — analyze your references or add them below.
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          value={HEX6.test(draft) ? draft : "#000000"}
          onChange={(e) => setDraft(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded-lg border bg-white p-0.5"
          aria-label="Pick a color"
        />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="#rrggbb"
          className="w-28 rounded-lg border p-2 text-sm outline-none focus:border-black"
        />
        <button
          type="button"
          onClick={() => {
            if (toHex(draft)) {
              addColors([draft]);
              setDraft("#000000");
            } else setError("Enter a valid hex color.");
          }}
          className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Add color
        </button>
        <label className="cursor-pointer rounded-full border px-4 py-2 text-sm font-medium hover:bg-zinc-50">
          {extracting ? "Reading…" : "Extract from image"}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            disabled={extracting}
            onChange={(e) => onExtractFiles(e.currentTarget.files)}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !dirty}
          className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save palette"}
        </button>
        {saved && !pending && !dirty && (
          <span className="text-sm text-green-600">Saved ✓</span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}

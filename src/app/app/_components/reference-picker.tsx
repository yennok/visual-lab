"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";

export type BrandRef = { id: string; blobUrl: string; name: string };

// Reference picker for a single generation. Brand references (the shared library
// from Brand Studio) can be toggled on/off; uploads here are TEMPORARY — they
// feed only this generation and are never saved to the brand. The Composer owns
// the selection state and sends it with the generate request.
export function ReferencePicker({
  references,
  selectedIds,
  onToggle,
  tempUrls,
  onAddTemp,
  onRemoveTemp,
  disabled,
}: {
  references: BrandRef[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  tempUrls: string[];
  onAddTemp: (url: string) => void;
  onRemoveTemp: (url: string) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = new Set(selectedIds);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const blob = await upload(
          `references/${crypto.randomUUID()}-${file.name}`,
          file,
          { access: "public", handleUploadUrl: "/api/blob/upload" },
        );
        onAddTemp(blob.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">
          Reference images
        </span>
        <label className="cursor-pointer rounded-full border px-3 py-1 text-xs font-medium hover:bg-zinc-50">
          {uploading ? "Uploading…" : "Upload for this generation"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => onFiles(e.currentTarget.files)}
          />
        </label>
      </div>

      {references.length === 0 && tempUrls.length === 0 ? (
        <p className="text-xs text-zinc-500">
          No brand references yet — add some in Brand Studio, or upload one above
          just for this generation.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {references.map((ref) => {
            const on = selected.has(ref.id);
            return (
              <button
                key={ref.id}
                type="button"
                onClick={() => onToggle(ref.id)}
                disabled={disabled}
                title={ref.name}
                className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 ${
                  on ? "border-black" : "border-transparent opacity-40"
                }`}
                aria-pressed={on}
                aria-label={`${on ? "Deselect" : "Select"} ${ref.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ref.blobUrl}
                  alt={ref.name}
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
          {tempUrls.map((url) => (
            <div
              key={url}
              className="relative h-16 w-16 overflow-hidden rounded-lg border-2 border-blue-500"
              title="Temporary — used only for this generation"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="temporary reference" className="h-full w-full object-cover" />
              <span className="absolute bottom-0 left-0 right-0 bg-blue-500/90 text-center text-[9px] leading-3 text-white">
                temp
              </span>
              <button
                type="button"
                onClick={() => onRemoveTemp(url)}
                disabled={disabled}
                className="absolute right-0.5 top-0.5 rounded-full bg-white/90 px-1 text-xs leading-4"
                aria-label="Remove temporary reference"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

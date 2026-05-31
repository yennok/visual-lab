"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addReference,
  analyzeBrand,
  removeReference,
  setReferenceKind,
} from "./actions";

const KINDS = ["mood", "product", "turnaround", "other"];

type Ref = { id: string; blobUrl: string; name: string; kind: string };

export function ReferenceUploader({ references }: { references: Ref[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [analyzing, startAnalyze] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        await addReference({ blobUrl: blob.url, name: file.name, kind: "mood" });
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function onAnalyze() {
    setError(null);
    startAnalyze(async () => {
      const res = await analyzeBrand();
      if (!res.ok) setError(res.error ?? "Analysis failed.");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-full border px-4 py-2 text-sm font-medium hover:bg-zinc-50">
          {uploading ? "Uploading…" : "Upload images"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => onFiles(e.currentTarget.files)}
          />
        </label>
        <button
          onClick={onAnalyze}
          disabled={analyzing || references.length === 0}
          className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {analyzing ? "Analyzing…" : "Analyze my brand"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {references.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Upload a few brand or moodboard images, then let AI turn them into your
          style.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {references.map((ref) => (
            <div key={ref.id} className="space-y-1.5">
              <div className="relative overflow-hidden rounded-card border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ref.blobUrl}
                  alt={ref.name}
                  className="aspect-square w-full object-cover"
                />
                <button
                  onClick={() =>
                    removeReference(ref.id).then(() => router.refresh())
                  }
                  className="absolute right-1 top-1 rounded-full bg-white/90 px-2 text-sm leading-6"
                  aria-label="Remove reference"
                >
                  ✕
                </button>
              </div>
              <select
                value={ref.kind}
                onChange={(e) =>
                  setReferenceKind(ref.id, e.target.value).then(() =>
                    router.refresh(),
                  )
                }
                className="w-full rounded-lg border bg-white p-1.5 text-xs"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

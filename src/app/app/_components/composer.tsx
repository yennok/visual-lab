"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function Composer() {
  const router = useRouter();
  const [scene, setScene] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!scene.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      setScene("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-card border p-4">
      <textarea
        value={scene}
        onChange={(e) => setScene(e.target.value)}
        placeholder="Describe the scene… e.g. 'product on a sunlit marble counter, soft morning light'"
        rows={3}
        disabled={loading}
        className="w-full resize-none rounded-lg border p-3 text-sm outline-none focus:border-black disabled:opacity-50"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={loading || !scene.trim()}
          className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {loading ? "Generating…" : "Generate"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}

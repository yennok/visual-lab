// Scene-prompt improvement. Takes a user's rough scene description and rewrites
// it into a clearer, more concrete image-generation prompt. Uses the cheap
// Gemini text model (ANALYSIS_MODEL) — NOT the image-generation model — mirroring
// the structured-output pattern in brand-analysis.ts.
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { ANALYSIS_MODEL } from "./brand-analysis";

const improveSchema = z.object({ improvedPrompt: z.string() });

const INSTRUCTION = `You are a prompt engineer for an image-generation model. Rewrite the user's rough scene description into a single, clear, concrete scene prompt (1-3 sentences) that an image model can follow.
Rules:
- Preserve the user's intent and any concrete details they mention.
- Describe only the SCENE (setting, subject placement, action, lighting, mood, composition). Do NOT invent a brand, art style, or color story — those are supplied separately.
- Output prose, not a list. No preamble, no quotes.
The brand context below is for alignment only; do not copy it into the output.`;

// Returns an improved scene prompt. `stylePrompt`/`tags` are soft brand context
// so the rewrite leans toward the brand without duplicating its style text.
export async function improveScenePrompt({
  scene,
  stylePrompt,
  tags,
}: {
  scene: string;
  stylePrompt?: string;
  tags?: string[];
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  const trimmed = (scene || "").trim();
  if (!trimmed) throw new Error("A scene is required.");

  const ai = new GoogleGenAI({ apiKey });

  const cleanTags = (tags ?? []).map((t) => t.trim()).filter(Boolean);
  const context = [
    stylePrompt?.trim() ? `Brand style (context): ${stylePrompt.trim()}` : "",
    cleanTags.length ? `Brand keywords (context): ${cleanTags.join(", ")}` : "",
    `User scene: ${trimmed}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: [{ role: "user", parts: [{ text: `${INSTRUCTION}\n\n${context}` }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { improvedPrompt: { type: Type.STRING } },
        required: ["improvedPrompt"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Prompt improvement returned no content.");

  const { improvedPrompt } = improveSchema.parse(JSON.parse(text));
  const out = improvedPrompt.trim();
  if (!out) throw new Error("Prompt improvement returned no content.");
  return out;
}

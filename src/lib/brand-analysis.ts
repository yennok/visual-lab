// Brand visual-language analysis. Sends the brand's reference images to Gemini
// (a cheap vision model — NOT the expensive image-generation model) and gets
// back a structured profile we turn into the brand's stylePrompt + palette.
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

export const ANALYSIS_MODEL =
  process.env.GEMINI_ANALYSIS_MODEL || "gemini-2.5-flash";

export type BrandImage = { mimeType: string; dataBase64: string };

const analysisSchema = z.object({
  styleDescription: z.string(),
  palette: z.array(z.string()),
  lighting: z.string(),
  mood: z.string(),
  composition: z.string(),
  tags: z.array(z.string()).default([]),
});

export type BrandAnalysis = z.infer<typeof analysisSchema>;

const INSTRUCTION = `You are a brand art director. Analyze the attached reference images as a single brand's visual identity. Describe the consistent visual language so it can be reused to generate new on-brand images.
Return: a vivid styleDescription (one paragraph, concrete and reusable as an image prompt), a palette of the 4-6 dominant colors as hex codes, short lighting, mood, and composition notes, and tags: 5-8 short keyword highlights (1-3 words each, lowercase) capturing the brand's defining visual traits.`;

export async function analyzeBrandImages(
  images: BrandImage[],
): Promise<BrandAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  if (images.length === 0) throw new Error("No reference images to analyze.");

  const ai = new GoogleGenAI({ apiKey });

  const parts: Array<
    { inlineData: { mimeType: string; data: string } } | { text: string }
  > = images.map((img) => ({
    inlineData: { mimeType: img.mimeType, data: img.dataBase64 },
  }));
  parts.push({ text: INSTRUCTION });

  const response = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          styleDescription: { type: Type.STRING },
          palette: { type: Type.ARRAY, items: { type: Type.STRING } },
          lighting: { type: Type.STRING },
          mood: { type: Type.STRING },
          composition: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          "styleDescription",
          "palette",
          "lighting",
          "mood",
          "composition",
          "tags",
        ],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Analysis returned no content.");

  return analysisSchema.parse(JSON.parse(text));
}

// Read color codes that are written *as text* in an image (e.g. a brand
// guideline screenshot listing "#1a2b3c") and return them as normalized hex.
export async function extractPaletteFromImage(
  image: BrandImage,
): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: image.mimeType, data: image.dataBase64 } },
          {
            text: `Extract every color value in this image — both swatches and any color codes written as text (hex like #1a2b3c, or rgb(...)). Convert each to a 6-digit hex string. Return only the colors actually present.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
  });

  const text = response.text;
  if (!text) return [];
  const parsed = z.array(z.string()).safeParse(JSON.parse(text));
  return parsed.success ? normalizePalette(parsed.data, 12) : [];
}

// Normalize hex strings to "#rrggbb" and drop anything that isn't a valid hex.
// `limit` defaults to 6 (AI extraction); a hand-curated palette may hold more.
export function normalizePalette(palette: string[], limit = 6): string[] {
  const out: string[] = [];
  for (const raw of palette ?? []) {
    let v = raw.trim().replace(/^#?/, "#").toLowerCase();
    // Expand shorthand #abc → #aabbcc.
    if (/^#[0-9a-f]{3}$/.test(v)) {
      v = "#" + v.slice(1).split("").map((c) => c + c).join("");
    }
    if (/^#[0-9a-f]{6}$/.test(v)) out.push(v);
  }
  return Array.from(new Set(out)).slice(0, limit);
}

// Clean a tag list: trim, drop empties, dedupe (case-insensitive), cap length.
export function normalizeTags(tags: string[], limit = 20): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags ?? []) {
    const v = raw.trim().slice(0, 40);
    const key = v.toLowerCase();
    if (v && !seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out.slice(0, limit);
}

// Compose a single reusable style prompt from the structured analysis.
export function composeStylePrompt(a: BrandAnalysis): string {
  const palette = normalizePalette(a.palette);
  const lines = [
    a.styleDescription.trim(),
    `Lighting: ${a.lighting.trim()}.`,
    `Mood: ${a.mood.trim()}.`,
    `Composition: ${a.composition.trim()}.`,
  ];
  if (palette.length) lines.push(`Color palette: ${palette.join(", ")}.`);
  return lines.join(" ");
}

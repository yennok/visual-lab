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
});

export type BrandAnalysis = z.infer<typeof analysisSchema>;

const INSTRUCTION = `You are a brand art director. Analyze the attached reference images as a single brand's visual identity. Describe the consistent visual language so it can be reused to generate new on-brand images.
Return: a vivid styleDescription (one paragraph, concrete and reusable as an image prompt), a palette of the 4-6 dominant colors as hex codes, and short lighting, mood, and composition notes.`;

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
        },
        required: ["styleDescription", "palette", "lighting", "mood", "composition"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Analysis returned no content.");

  return analysisSchema.parse(JSON.parse(text));
}

// Normalize hex strings to "#rrggbb" and drop anything that isn't a valid hex.
export function normalizePalette(palette: string[]): string[] {
  const out: string[] = [];
  for (const raw of palette) {
    const v = raw.trim().replace(/^#?/, "#");
    if (/^#[0-9a-fA-F]{6}$/.test(v)) out.push(v.toLowerCase());
  }
  return Array.from(new Set(out)).slice(0, 6);
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

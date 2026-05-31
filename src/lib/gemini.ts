// Ports Lab2-Claude/tools/image-studio/server/gemini.js.
// Phase 0: compiles but is not called yet — /api/generate is wired in Phase 1.
import { GoogleGenAI } from "@google/genai";

export const DEFAULT_MODEL =
  process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";

export type GeneratedImage = { mimeType: string; dataBase64: string };

// `label` (when present) is emitted as a text part right before the image, so
// the model can tie a reference to a named subject ("Reference image of X:").
export type ReferenceImage = {
  mimeType: string;
  dataBase64: string;
  label?: string;
};

export async function generateImage(opts: {
  prompt: string;
  referenceImages?: ReferenceImage[];
  aspectRatio?: string;
  imageSize?: string;
}): Promise<{ image: GeneratedImage; text: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  const ai = new GoogleGenAI({ apiKey });

  const parts: Array<
    | { inlineData: { mimeType: string; data: string } }
    | { text: string }
  > = [];
  for (const ref of opts.referenceImages ?? []) {
    if (ref.label) parts.push({ text: ref.label });
    parts.push({
      inlineData: { mimeType: ref.mimeType, data: ref.dataBase64 },
    });
  }
  parts.push({ text: opts.prompt });

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      imageConfig: {
        aspectRatio: opts.aspectRatio ?? "3:2",
        imageSize: opts.imageSize ?? "2K",
      },
    },
  });

  const outParts = response?.candidates?.[0]?.content?.parts ?? [];
  let image: GeneratedImage | null = null;
  let text = "";
  for (const p of outParts) {
    if (p?.inlineData?.data) {
      image = {
        mimeType: p.inlineData.mimeType || "image/png",
        dataBase64: p.inlineData.data,
      };
    } else if (p?.text) {
      text += p.text;
    }
  }
  if (!image) {
    throw new Error(
      text ? `Model returned no image: ${text}` : "Model returned no image."
    );
  }
  return { image, text, model: DEFAULT_MODEL };
}

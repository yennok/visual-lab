// Parameterized port of Lab2-Claude/tools/image-studio/server/lab2mode.js.
// In LAB2 the brand is hardcoded; here every Brand row supplies its own pieces.
// `refIds` points at Reference rows that depict this subject; /api/generate feeds
// those images to the model so the same person/product stays consistent.
export type BrandSubject = {
  name: string;
  description: string;
  refIds?: string[];
};

export function buildBrandPrompt({
  stylePrompt,
  subjects,
  scene,
  tags,
}: {
  stylePrompt: string;
  subjects: BrandSubject[];
  scene: string;
  tags?: string[];
}) {
  const s = (scene || "").trim();
  const peopleLine = subjects.length
    ? subjects.map((sub) => `${sub.name}: ${sub.description}`).join(" ")
    : "";
  const subjectLine = subjects.length
    ? subjects.length === 1
      ? `Subject: ${subjects[0].name}.`
      : `Subjects: ${subjects.map((x) => x.name).join(", ")}.`
    : "";
  // When a subject carries reference images, nudge the model to honor them.
  const anchorLine = subjects.some((sub) => (sub.refIds ?? []).length > 0)
    ? "Keep each subject consistent with its labeled reference images."
    : "";
  // Brand keyword highlights (AI-suggested + hand-curated) steer the overall feel.
  const cleanTags = (tags ?? []).map((t) => t.trim()).filter(Boolean);
  const tagLine = cleanTags.length
    ? `Brand keywords: ${cleanTags.join(", ")}.`
    : "";
  return [
    stylePrompt,
    subjectLine,
    peopleLine,
    anchorLine,
    tagLine,
    `Scene: ${s || "the brand's signature setting"}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// Parameterized port of Lab2-Claude/tools/image-studio/server/lab2mode.js.
// In LAB2 the brand is hardcoded; here every Brand row supplies its own pieces.
export type BrandSubject = { name: string; description: string };

export function buildBrandPrompt({
  stylePrompt,
  subjects,
  scene,
}: {
  stylePrompt: string;
  subjects: BrandSubject[];
  scene: string;
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
  return `${stylePrompt}\n${subjectLine}\n${peopleLine}\nScene: ${
    s || "the brand's signature setting"
  }.`;
}

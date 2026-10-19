import { getSession } from "@/server/auth/session";
import { can } from "@/lib/permissions";
import { listQuestions } from "@/server/services/question-admin";
import { audit } from "@/server/audit";

export const dynamic = "force-dynamic";
const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;

/** Question bank export in the same column layout the importer reads (★ marks the correct options). */
export async function GET() {
  const s = await getSession();
  if (!s || !(can(s.user.role, "questions.write") || s.user.role === "teacher")) return new Response("Forbidden", { status: 403 });
  const qs = await listQuestions({ id: s.user.id, role: s.user.role, orgId: s.user.orgId });
  await audit({ id: s.user.id, label: s.user.fullName, role: s.user.role }, "export.questions", undefined, { rows: qs.length });
  const head = ["Question", "A", "B", "C", "D", "E", "Correct", "Explanation", "Reference", "Class", "Topic", "Difficulty", "Tags", "Type"];
  const letters = "abcde";
  const lines = [head.join(","), ...qs.map((q) => {
    const cells = [0, 1, 2, 3, 4].map((i) => (q.options[i] ? `${q.options[i].correct ? "★ " : ""}${q.options[i].text}` : ""));
    const correct = q.options.map((o, i) => (o.correct ? letters[i] : "")).filter(Boolean).join(",") || q.acceptedAnswers.join("|");
    return [q.text, ...cells, correct, q.explanation, q.ref, q.classLevelSlug, q.topic, q.difficulty, q.tags.join(";"), q.type].map(csv).join(",");
  })];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="question-bank.csv"`, "Cache-Control": "no-store" } });
}

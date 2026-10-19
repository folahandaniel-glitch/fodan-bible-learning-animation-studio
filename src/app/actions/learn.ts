"use server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireUser } from "@/server/guards";
import { setLessonProgress } from "@/server/services/content";
import { startAttempt } from "@/server/services/exams";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/forms";

export async function completeLessonAction(lessonId: string, slug: string, _: ActionResult, f: FormData): Promise<ActionResult> {
  void f;
  const u = await requireUser(["student"], { next: `/learn/${slug}` });
  try { await setLessonProgress(u, lessonId, "completed"); } catch (e) { return { error: (e as Error).message }; }
  revalidatePath(`/learn/${slug}`);
  return { ok: true, message: "Well done! Lesson marked as complete." };
}

/** Lesson quiz: a server-built practice test from the questions written for that lesson. Needs the quizzes entitlement. */
export async function startLessonQuizAction(lessonId: string, slug: string) {
  const u = await requireUser(["student"], { next: `/learn/${slug}` });
  const db = await getDb();
  const [l] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, lessonId));
  if (!l || l.status !== "published") redirect("/learn");
  let [exam] = await db.select().from(schema.exams).where(and(eq(schema.exams.kind, "quiz"), eq(schema.exams.title, `Quiz: ${l.title}`)));
  if (!exam) [exam] = await db.insert(schema.exams).values({ title: `Quiz: ${l.title}`, kind: "quiz", description: "Lesson quiz", status: "published", durationMin: 10, rules: [{ lessonId, count: 10 }], maxAttempts: 0, releaseResults: "immediate", showExplanations: true, isFree: l.isFree }).returning();
  const r = await startAttempt(u, exam.id);
  if (!r.ok) redirect(`/learn/${slug}?quiz=${encodeURIComponent(r.error)}`);
  redirect(`/student/exams/${r.attemptId}/take`);
}

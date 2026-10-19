"use server";
import { redirect } from "next/navigation";
import { requireUser, safeNext } from "@/server/guards";
import { saveResponse, startAttempt, submitAttempt } from "@/server/services/exams";
import { answerGame, startGame } from "@/server/services/games";
import type { ActionResult } from "@/components/forms";

export async function startExamAction(examId: string, _: ActionResult): Promise<ActionResult> {
  const u = await requireUser(["student"]);
  const r = await startAttempt(u, examId);
  if (!r.ok) return { error: r.error };
  redirect(`/student/exams/${r.attemptId}/take`);
}

/** Called by the exam screen while the learner works. The server validates the attempt, the deadline and the option ids. */
export async function saveAnswerAction(attemptId: string, qid: string, answer: string | string[] | null, flagged: boolean) {
  const u = await requireUser(["student"]);
  return saveResponse(u.id, attemptId, qid, answer, flagged);
}

export async function submitExamAction(attemptId: string) {
  const u = await requireUser(["student"]);
  await submitAttempt(u.id, attemptId);
  redirect(`/results/${attemptId}`);
}

export async function startGameAction(key: string, _: ActionResult): Promise<ActionResult> {
  const u = await requireUser(["student"]);
  const r = await startGame(u, key, u.classLevelSlug);
  if (!r.ok) return { error: r.error };
  redirect(`/student/games/${key}?s=${r.sessionId}`);
}

export async function answerGameAction(sessionId: string, index: number, answer: string | string[]) {
  const u = await requireUser(["student"]);
  return answerGame(u.id, sessionId, index, answer);
}

export async function goAction(to: string) { redirect(safeNext(to) ?? "/"); }

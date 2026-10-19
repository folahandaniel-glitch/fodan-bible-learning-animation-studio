import "server-only";
import { randomInt } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb, schema, type DB } from "../db";
import { audit, type Actor } from "../audit";
import { getEntitlement, hasFeature } from "./entitlements";
import { isStaffRole } from "@/lib/permissions";
import { CLASS_SLUGS } from "@/content/story-types";
import type { ExamRule, QOption, QuestionSlot } from "../db/schema";
import type { SessionUser } from "../auth/session";

type Q = typeof schema.questions.$inferSelect;
type Attempt = typeof schema.examAttempts.$inferSelect;
type Exam = typeof schema.exams.$inferSelect;
type User = Pick<SessionUser, "id" | "role" | "status" | "orgId" | "classLevelSlug">;

export const classSort = (slug: string | null | undefined) => (slug ? CLASS_SLUGS.indexOf(slug) + 1 : 0);
function shuffle<T>(a: T[]): T[] { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = randomInt(i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; }

export const normAnswer = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
export const isManual = (q: Pick<Q, "type" | "acceptedAnswers">) => q.type === "essay" || (q.type === "short" && !q.acceptedAnswers.length);

/** Marks one response against the private key. Returns null when it needs a person to mark it. */
export function markOne(q: Q, answer: string | string[] | null): { correct: boolean; marks: number } | null {
  if (isManual(q)) return null;
  const none = answer === null || answer === "" || (Array.isArray(answer) && !answer.length);
  if (none) return { correct: false, marks: 0 };
  let ok = false;
  if (q.type === "mcq" || q.type === "tf") ok = typeof answer === "string" && !!q.options.find((o) => o.id === answer)?.correct;
  else if (q.type === "multi") {
    const want = q.options.filter((o) => o.correct).map((o) => o.id).sort().join("|");
    const got = (Array.isArray(answer) ? answer : [answer]).slice().sort().join("|");
    ok = want === got;
  } else if (q.type === "fill" || q.type === "short") {
    const a = normAnswer(Array.isArray(answer) ? answer.join(" ") : answer);
    ok = q.acceptedAnswers.some((x) => normAnswer(x) === a);
  }
  return { correct: ok, marks: ok ? q.marks : 0 };
}

// ───────── question selection ─────────
export async function pickQuestions(db: DB, exam: Pick<Exam, "rules" | "fixedQuestionIds" | "classLevelSlug" | "orgId">): Promise<Q[]> {
  const chosen = new Map<string, Q>();
  if (exam.fixedQuestionIds.length) {
    const rows = await db.select().from(schema.questions).where(and(inArray(schema.questions.id, exam.fixedQuestionIds), eq(schema.questions.status, "published")));
    for (const r of rows) chosen.set(r.id, r);
  }
  for (const rule of exam.rules as ExamRule[]) {
    const rows = await db.select().from(schema.questions).where(and(eq(schema.questions.status, "published"), or(isNull(schema.questions.orgId), exam.orgId ? eq(schema.questions.orgId, exam.orgId) : isNull(schema.questions.orgId))));
    const slug = rule.classLevelSlug ?? exam.classLevelSlug ?? undefined;
    const idx = classSort(slug);
    const pool = rows.filter((q) => {
      if (chosen.has(q.id)) return false;
      if (rule.lessonId && q.lessonId !== rule.lessonId) return false;
      if (rule.topic && q.topic?.toLowerCase() !== rule.topic.toLowerCase()) return false;
      if (rule.tag && !q.tags.map((t) => t.toLowerCase()).includes(rule.tag.toLowerCase())) return false;
      if (rule.difficulty && q.difficulty !== rule.difficulty) return false;
      if (idx) {
        const inRange = q.classMin != null && q.classMax != null && idx >= q.classMin && idx <= q.classMax;
        if (!(q.classLevelSlug === slug || inRange || (q.classMin == null && !q.classLevelSlug))) return false;
      }
      return true;
    });
    for (const q of shuffle(pool).slice(0, rule.count)) chosen.set(q.id, q);
  }
  return [...chosen.values()];
}

// ───────── eligibility ─────────
export async function examGate(user: User, exam: Exam): Promise<{ ok: true } | { ok: false; reason: "plan" | "closed" | "notyet" | "draft" | "attempts" | "role" | "class" }> {
  if (exam.status !== "published") return { ok: false, reason: "draft" };
  if (user.role !== "student" && !isStaffRole(user.role)) return { ok: false, reason: "role" };
  const now = Date.now();
  if (exam.opensAt && exam.opensAt.getTime() > now) return { ok: false, reason: "notyet" };
  if (exam.closesAt && exam.closesAt.getTime() <= now) return { ok: false, reason: "closed" };
  if (user.role === "student") {
    if (exam.orgId && exam.orgId !== user.orgId) return { ok: false, reason: "class" }; // tenant isolation
    if (exam.groupId) {
      const m = await (await getDb()).select().from(schema.groupStudents).where(and(eq(schema.groupStudents.groupId, exam.groupId), eq(schema.groupStudents.studentId, user.id)));
      if (!m.length) return { ok: false, reason: "class" };
    }
    if (!exam.isFree) { const ent = await getEntitlement(user.id); if (!hasFeature(ent, exam.kind === "quiz" ? "quizzes" : "exams")) return { ok: false, reason: "plan" }; }
  }
  return { ok: true };
}

export async function listExamsFor(user: User) {
  const db = await getDb();
  const rows = await db.select().from(schema.exams).where(eq(schema.exams.status, "published")).orderBy(desc(schema.exams.createdAt));
  const mine = await db.select().from(schema.examAttempts).where(eq(schema.examAttempts.userId, user.id));
  const groups = await db.select({ g: schema.groupStudents.groupId }).from(schema.groupStudents).where(eq(schema.groupStudents.studentId, user.id));
  const gset = new Set(groups.map((g) => g.g));
  const ent = await getEntitlement(user.id);
  return rows
    .filter((e) => (e.orgId ? e.orgId === user.orgId : true) && (e.groupId ? gset.has(e.groupId) : true))
    .filter((e) => !e.classLevelSlug || user.role !== "student" || !user.classLevelSlug || Math.abs(classSort(e.classLevelSlug) - classSort(user.classLevelSlug)) <= 1 || !!e.groupId)
    .map((e) => {
      const att = mine.filter((a) => a.examId === e.id);
      return { exam: e, attempts: att, locked: !e.isFree && !hasFeature(ent, "exams") && !isStaffRole(user.role) };
    });
}

// ───────── attempt lifecycle ─────────
export async function startAttempt(user: User, examId: string): Promise<{ ok: true; attemptId: string } | { ok: false; error: string }> {
  const db = await getDb();
  const [exam] = await db.select().from(schema.exams).where(eq(schema.exams.id, examId));
  if (!exam) return { ok: false, error: "Examination not found." };
  const gate = await examGate(user, exam);
  if (!gate.ok) return { ok: false, error: { plan: "An active plan is needed to take this examination.", closed: "This examination has closed.", notyet: "This examination has not opened yet.", draft: "This examination is not available.", attempts: "No attempts left.", role: "Only students can take examinations.", class: "This examination is not assigned to you." }[gate.reason] };
  // Resume an unfinished attempt (finalising it first if its time has run out).
  const open = await db.select().from(schema.examAttempts).where(and(eq(schema.examAttempts.examId, examId), eq(schema.examAttempts.userId, user.id), eq(schema.examAttempts.status, "in_progress")));
  for (const a of open) {
    if (a.deadlineAt.getTime() > Date.now()) return { ok: true, attemptId: a.id };
    await submitAttempt(user.id, a.id, { auto: true });
  }
  const done = await db.select().from(schema.examAttempts).where(and(eq(schema.examAttempts.examId, examId), eq(schema.examAttempts.userId, user.id)));
  if (exam.maxAttempts > 0 && done.length >= exam.maxAttempts) return { ok: false, error: "You have used all your attempts for this examination." };
  const qs = await pickQuestions(db, exam);
  if (!qs.length) return { ok: false, error: "This examination has no questions yet." };
  const ordered = exam.shuffleQuestions ? shuffle(qs) : qs;
  const slots: QuestionSlot[] = ordered.map((q) => ({ qid: q.id, order: exam.shuffleOptions && q.type !== "tf" ? shuffle(q.options.map((o) => o.id)) : q.options.map((o) => o.id) }));
  const now = Date.now();
  const limit = now + exam.durationMin * 60_000;
  const deadline = new Date(exam.closesAt ? Math.min(limit, exam.closesAt.getTime()) : limit);
  const [att] = await db.insert(schema.examAttempts).values({ examId, userId: user.id, attemptNo: done.length + 1, deadlineAt: deadline, slots }).returning();
  return { ok: true, attemptId: att.id };
}

export interface TakeView {
  attemptId: string; examTitle: string; status: string; remainingMs: number; deadlineAt: string; showLogoPlacement: boolean;
  questions: { id: string; type: string; text: string; options: { id: string; text: string }[]; imageAssetId: string | null; answer: string | string[] | null; flagged: boolean; marks: number }[];
}

/** What the browser is allowed to see while the exam is running: question text and shuffled options, never the key. */
export async function getTakeView(userId: string, attemptId: string): Promise<TakeView | { finished: true } | null> {
  const db = await getDb();
  const [a] = await db.select().from(schema.examAttempts).where(and(eq(schema.examAttempts.id, attemptId), eq(schema.examAttempts.userId, userId)));
  if (!a) return null;
  if (a.status !== "in_progress") return { finished: true };
  if (a.deadlineAt.getTime() <= Date.now()) { await submitAttempt(userId, attemptId, { auto: true }); return { finished: true }; }
  const [exam] = await db.select().from(schema.exams).where(eq(schema.exams.id, a.examId));
  const qs = await db.select().from(schema.questions).where(inArray(schema.questions.id, a.slots.map((s) => s.qid)));
  const qm = new Map(qs.map((q) => [q.id, q]));
  const resp = await db.select().from(schema.examResponses).where(eq(schema.examResponses.attemptId, attemptId));
  const rm = new Map(resp.map((r) => [r.questionId, r]));
  return {
    attemptId, examTitle: exam.title, status: a.status, remainingMs: a.deadlineAt.getTime() - Date.now(), deadlineAt: a.deadlineAt.toISOString(), showLogoPlacement: true,
    questions: a.slots.map((slot) => {
      const q = qm.get(slot.qid)!;
      const byId = new Map(q.options.map((o) => [o.id, o]));
      return { id: q.id, type: q.type, text: q.text, options: slot.order.map((id) => ({ id, text: byId.get(id)!.text })), imageAssetId: q.imageAssetId, answer: rm.get(q.id)?.answer ?? null, flagged: rm.get(q.id)?.flagged ?? false, marks: q.marks };
    }),
  };
}

export async function saveResponse(userId: string, attemptId: string, qid: string, answer: string | string[] | null, flagged: boolean): Promise<{ ok: boolean; expired?: boolean; error?: string }> {
  const db = await getDb();
  const [a] = await db.select().from(schema.examAttempts).where(and(eq(schema.examAttempts.id, attemptId), eq(schema.examAttempts.userId, userId)));
  if (!a) return { ok: false, error: "Not found" };
  if (a.status !== "in_progress") return { ok: false, expired: true };
  if (a.deadlineAt.getTime() + 3000 <= Date.now()) { await submitAttempt(userId, attemptId, { auto: true }); return { ok: false, expired: true }; } // 3 s grace for network latency
  const slot = a.slots.find((s) => s.qid === qid);
  if (!slot) return { ok: false, error: "That question is not part of this attempt." };
  const [q] = await db.select().from(schema.questions).where(eq(schema.questions.id, qid));
  let clean: string | string[] | null = answer;
  if (q.type === "mcq" || q.type === "tf") { if (typeof answer !== "string" || !slot.order.includes(answer)) clean = null; }
  else if (q.type === "multi") clean = Array.isArray(answer) ? answer.filter((x) => slot.order.includes(x)) : null;
  else clean = typeof answer === "string" ? answer.slice(0, q.type === "essay" ? 8000 : 400) : null;
  await db.insert(schema.examResponses).values({ attemptId, questionId: qid, answer: clean, flagged }).onConflictDoUpdate({ target: [schema.examResponses.attemptId, schema.examResponses.questionId], set: { answer: clean, flagged, updatedAt: new Date() } });
  return { ok: true };
}

export async function submitAttempt(userId: string, attemptId: string, opts: { auto?: boolean } = {}): Promise<{ ok: boolean }> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM exam_attempts WHERE id = ${attemptId} FOR UPDATE`);
    const [a] = await tx.select().from(schema.examAttempts).where(and(eq(schema.examAttempts.id, attemptId), eq(schema.examAttempts.userId, userId)));
    if (!a) return { ok: false };
    if (a.status !== "in_progress") return { ok: true }; // already marked: idempotent
    const qs = await tx.select().from(schema.questions).where(inArray(schema.questions.id, a.slots.map((s) => s.qid)));
    const qm = new Map(qs.map((q) => [q.id, q]));
    const resp = await tx.select().from(schema.examResponses).where(eq(schema.examResponses.attemptId, attemptId));
    const rm = new Map(resp.map((r) => [r.questionId, r]));
    let score = 0, max = 0, needsManual = false;
    for (const slot of a.slots) {
      const q = qm.get(slot.qid)!; max += q.marks;
      const r = rm.get(q.id);
      const m = markOne(q, r?.answer ?? null);
      if (m === null) { needsManual = true; await tx.insert(schema.examResponses).values({ attemptId, questionId: q.id, answer: r?.answer ?? null, correct: null, marks: null }).onConflictDoUpdate({ target: [schema.examResponses.attemptId, schema.examResponses.questionId], set: { correct: null, marks: null } }); continue; }
      score += m.marks;
      await tx.insert(schema.examResponses).values({ attemptId, questionId: q.id, answer: r?.answer ?? null, correct: m.correct, marks: m.marks }).onConflictDoUpdate({ target: [schema.examResponses.attemptId, schema.examResponses.questionId], set: { correct: m.correct, marks: m.marks } });
    }
    const now = new Date();
    await tx.update(schema.examAttempts).set({ status: needsManual ? "submitted" : "marked", submittedAt: now, score, maxScore: max, percent: max ? Math.round((score / max) * 100) : 0, needsManual, autoSubmitted: !!opts.auto }).where(eq(schema.examAttempts.id, attemptId));
    return { ok: true };
  });
}

// ───────── results ─────────
export function resultsReleased(exam: Exam, a: Attempt, now = new Date()) {
  if (a.status === "in_progress") return false;
  if (a.needsManual) return false;
  if (exam.releaseResults === "immediate") return true;
  if (exam.releaseResults === "after_close") return exam.status === "closed" || (!!exam.closesAt && exam.closesAt <= now);
  return exam.resultsReleased;
}

export interface ResultView {
  attempt: Attempt; exam: Exam; released: boolean; pendingMarking: boolean; showExplanations: boolean; passed: boolean | null;
  items?: { qid: string; text: string; type: string; options: { id: string; text: string; correct?: boolean; chosen: boolean }[]; answer: string | string[] | null; correct: boolean | null; marks: number | null; maxMarks: number; explanation?: string; ref?: string | null; feedback?: string | null }[];
  topics?: { topic: string; correct: number; total: number }[];
}

/** Authorisation for reading a result: the learner, their linked parent, a teacher of the learner's class, staff, or the same organisation's admin. */
export async function canViewAttempt(viewer: User, a: Attempt, exam: Exam): Promise<boolean> {
  if (viewer.id === a.userId) return true;
  if (isStaffRole(viewer.role)) return true;
  const db = await getDb();
  if (viewer.role === "parent") { const l = await db.select().from(schema.parentLinks).where(and(eq(schema.parentLinks.parentId, viewer.id), eq(schema.parentLinks.studentId, a.userId), eq(schema.parentLinks.status, "active"))); return l.length > 0; }
  if (viewer.role === "teacher") {
    const rows = await db.select({ g: schema.groupTeachers.groupId }).from(schema.groupTeachers).innerJoin(schema.groupStudents, eq(schema.groupStudents.groupId, schema.groupTeachers.groupId)).where(and(eq(schema.groupTeachers.teacherId, viewer.id), eq(schema.groupStudents.studentId, a.userId)));
    return rows.length > 0 || exam.createdBy === viewer.id;
  }
  if (viewer.role === "org_admin") { const [u] = await db.select({ orgId: schema.users.orgId }).from(schema.users).where(eq(schema.users.id, a.userId)); return !!viewer.orgId && u?.orgId === viewer.orgId; }
  return false;
}

export async function getResult(viewer: User, attemptId: string): Promise<ResultView | null> {
  const db = await getDb();
  const [a] = await db.select().from(schema.examAttempts).where(eq(schema.examAttempts.id, attemptId));
  if (!a) return null;
  const [exam] = await db.select().from(schema.exams).where(eq(schema.exams.id, a.examId));
  if (!(await canViewAttempt(viewer, a, exam))) return null;
  const staffLike = viewer.id !== a.userId; // teachers/parents/staff see results as soon as marking is complete
  const released = a.status !== "in_progress" && !a.needsManual && (staffLike || resultsReleased(exam, a));
  const base: ResultView = { attempt: { ...a, slots: [] }, exam, released, pendingMarking: a.needsManual && a.status !== "in_progress", showExplanations: false, passed: null };
  if (!released) { base.attempt = { ...a, score: null, maxScore: null, percent: null, slots: [] }; return base; }
  base.passed = (a.percent ?? 0) >= exam.passMark;
  // Explanations are a paid feature of the learner (or free for free exams).
  let explain = exam.showExplanations;
  if (explain && viewer.role === "student" && !exam.isFree) explain = hasFeature(await getEntitlement(viewer.id), "explanations");
  base.showExplanations = explain;
  const qs = await db.select().from(schema.questions).where(inArray(schema.questions.id, a.slots.map((s) => s.qid)));
  const qm = new Map(qs.map((q) => [q.id, q]));
  const resp = await db.select().from(schema.examResponses).where(eq(schema.examResponses.attemptId, attemptId));
  const rm = new Map(resp.map((r) => [r.questionId, r]));
  const topics = new Map<string, { correct: number; total: number }>();
  base.items = a.slots.map((slot) => {
    const q = qm.get(slot.qid)!; const r = rm.get(q.id);
    const chosen = new Set(Array.isArray(r?.answer) ? r?.answer : r?.answer ? [r.answer] : []);
    const t = topics.get(q.topic ?? "General") ?? { correct: 0, total: 0 }; t.total++; if (r?.correct) t.correct++; topics.set(q.topic ?? "General", t);
    const byId = new Map(q.options.map((o) => [o.id, o]));
    return {
      qid: q.id, text: q.text, type: q.type, answer: r?.answer ?? null, correct: r?.correct ?? null, marks: r?.marks ?? null, maxMarks: q.marks, feedback: r?.feedback,
      options: slot.order.map((id) => ({ id, text: byId.get(id)!.text, chosen: chosen.has(id), ...(explain ? { correct: !!byId.get(id)!.correct } : {}) })),
      ...(explain ? { explanation: q.explanation, ref: q.ref } : {}),
    };
  });
  base.topics = [...topics].map(([topic, v]) => ({ topic, ...v }));
  base.attempt = { ...a, slots: [] };
  return base;
}

// ───────── teacher marking & analytics ─────────
export async function pendingManual(teacher: User) {
  const db = await getDb();
  const rows = await db.select({ a: schema.examAttempts, e: schema.exams, u: schema.users }).from(schema.examAttempts)
    .innerJoin(schema.exams, eq(schema.exams.id, schema.examAttempts.examId)).innerJoin(schema.users, eq(schema.users.id, schema.examAttempts.userId))
    .where(and(eq(schema.examAttempts.needsManual, true), eq(schema.examAttempts.status, "submitted"))).orderBy(asc(schema.examAttempts.submittedAt));
  const out = [];
  for (const r of rows) if (await canViewAttempt(teacher, r.a, r.e)) out.push(r);
  return out;
}

export async function manualMarkingView(teacher: User, attemptId: string) {
  const db = await getDb();
  const [a] = await db.select().from(schema.examAttempts).where(eq(schema.examAttempts.id, attemptId));
  if (!a) return null;
  const [exam] = await db.select().from(schema.exams).where(eq(schema.exams.id, a.examId));
  if (teacher.role === "student" || !(await canViewAttempt(teacher, a, exam))) return null;
  const qs = await db.select().from(schema.questions).where(inArray(schema.questions.id, a.slots.map((s) => s.qid)));
  const resp = await db.select().from(schema.examResponses).where(eq(schema.examResponses.attemptId, attemptId));
  return { attempt: a, exam, items: qs.filter((q) => isManual(q)).map((q) => ({ q, resp: resp.find((r) => r.questionId === q.id) })) };
}

export async function markManual(actor: Actor & { user: User }, attemptId: string, qid: string, marks: number, feedback: string) {
  const db = await getDb();
  const [a] = await db.select().from(schema.examAttempts).where(eq(schema.examAttempts.id, attemptId));
  if (!a) throw new Error("Attempt not found.");
  const [exam] = await db.select().from(schema.exams).where(eq(schema.exams.id, a.examId));
  if (actor.user.role === "student" || !(await canViewAttempt(actor.user, a, exam))) throw new Error("You are not allowed to mark this attempt.");
  const [q] = await db.select().from(schema.questions).where(eq(schema.questions.id, qid));
  if (!q || !isManual(q)) throw new Error("That question is marked automatically.");
  const m = Math.max(0, Math.min(q.marks, Math.round(marks)));
  await db.update(schema.examResponses).set({ marks: m, correct: m >= q.marks, feedback: feedback.slice(0, 1000) }).where(and(eq(schema.examResponses.attemptId, attemptId), eq(schema.examResponses.questionId, qid)));
  const resp = await db.select().from(schema.examResponses).where(eq(schema.examResponses.attemptId, attemptId));
  const qs = await db.select().from(schema.questions).where(inArray(schema.questions.id, a.slots.map((s) => s.qid)));
  const pending = qs.filter((x) => isManual(x)).some((x) => resp.find((r) => r.questionId === x.id)?.marks == null);
  if (!pending) {
    const score = resp.reduce((acc, r) => acc + (r.marks ?? 0), 0);
    const max = qs.reduce((acc, x) => acc + x.marks, 0);
    await db.update(schema.examAttempts).set({ status: "marked", needsManual: false, score, maxScore: max, percent: max ? Math.round((score / max) * 100) : 0 }).where(eq(schema.examAttempts.id, attemptId));
  }
  await audit(actor, "exam.manual_mark", { type: "attempt", id: attemptId }, { qid, marks: m });
}

export async function examAnalytics(examId: string) {
  const db = await getDb();
  const attempts = await db.select().from(schema.examAttempts).where(and(eq(schema.examAttempts.examId, examId), inArray(schema.examAttempts.status, ["submitted", "marked"])));
  const resp = attempts.length ? await db.select().from(schema.examResponses).where(inArray(schema.examResponses.attemptId, attempts.map((a) => a.id))) : [];
  const qs = resp.length ? await db.select().from(schema.questions).where(inArray(schema.questions.id, [...new Set(resp.map((r) => r.questionId))])) : [];
  const done = attempts.filter((a) => a.percent != null);
  const avg = done.length ? Math.round(done.reduce((s, a) => s + (a.percent ?? 0), 0) / done.length) : null;
  const perQ = qs.map((q) => {
    const rs = resp.filter((r) => r.questionId === q.id && r.correct !== null);
    return { id: q.id, text: q.text, topic: q.topic, attempted: rs.length, correctRate: rs.length ? Math.round((rs.filter((r) => r.correct).length / rs.length) * 100) : null };
  }).sort((a, b) => (a.correctRate ?? 101) - (b.correctRate ?? 101));
  const seconds = attempts.filter((a) => a.submittedAt).map((a) => (a.submittedAt!.getTime() - a.startedAt.getTime()) / 1000);
  return { attempts: attempts.length, average: avg, avgSeconds: seconds.length ? Math.round(seconds.reduce((s, x) => s + x, 0) / seconds.length) : null, perQuestion: perQ };
}

export async function studentHistory(userId: string) {
  const db = await getDb();
  return db.select({ a: schema.examAttempts, e: schema.exams }).from(schema.examAttempts).innerJoin(schema.exams, eq(schema.exams.id, schema.examAttempts.examId)).where(eq(schema.examAttempts.userId, userId)).orderBy(desc(schema.examAttempts.startedAt));
}

export type { QOption };

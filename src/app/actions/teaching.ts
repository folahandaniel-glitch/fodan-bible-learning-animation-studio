"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { actorOf, requireUser } from "@/server/guards";
import { approveTeacher, assignTeacher, completeTraining, createAssignment, createGroup, enrolStudent, removeStudent, takeAttendance, type TUser } from "@/server/services/teaching";
import { markManual } from "@/server/services/exams";
import { commitImport, parseUpload, type ImportOptions } from "@/server/services/question-admin";
import { createAccessKey } from "@/server/services/auth";
import { can } from "@/lib/permissions";
import type { ParsedQuestion } from "@/lib/question-import";
import type { ActionResult } from "@/components/forms";
import type { ExamRule } from "@/server/db/schema";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const wrap = async (fn: () => Promise<ActionResult | void>): Promise<ActionResult> => {
  try { return (await fn()) ?? { ok: true, message: "Saved." }; } catch (e) { if (e && typeof e === "object" && "digest" in e) throw e; return { error: (e as Error).message }; }
};
const staffish = ["teacher", "org_admin", "super_admin", "curriculum_admin"] as const;
const tuser = (u: Awaited<ReturnType<typeof requireUser>>): TUser => ({ id: u.id, role: u.role, orgId: u.orgId, status: u.status });

export async function attendanceAction(groupId: string, _: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser([...staffish]);
  return wrap(async () => {
    const marks: Record<string, string> = {};
    for (const [k, v] of f.entries()) if (k.startsWith("m_")) marks[k.slice(2)] = String(v);
    await takeAttendance(await actorOf(u), tuser(u), groupId, str(f, "date"), marks);
    revalidatePath(`/teacher/classes/${groupId}`);
    return { ok: true, message: "Attendance saved." };
  });
}

export async function assignmentAction(groupId: string, _: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser([...staffish]);
  return wrap(async () => {
    const kind = str(f, "kind") as "lesson" | "exam" | "story";
    const refId = str(f, "refId");
    if (!refId) throw new Error("Choose what to assign.");
    const title = str(f, "title");
    await createAssignment(await actorOf(u), tuser(u), { groupId, kind, refId, title: title || "Assignment", instructions: str(f, "instructions"), dueAt: str(f, "dueAt") ? new Date(str(f, "dueAt")) : null });
    revalidatePath(`/teacher/classes/${groupId}`);
    return { ok: true, message: "Assignment set. Learners were notified." };
  });
}

export async function createGroupAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser(["org_admin", "super_admin"]);
  return wrap(async () => { await createGroup(await actorOf(u), tuser(u), { name: str(f, "name"), classLevelSlug: str(f, "classLevelSlug"), termNo: Number(str(f, "termNo")) || 1, orgId: str(f, "orgId") || undefined }); revalidatePath("/church/classes"); return { ok: true, message: "Class created." }; });
}
export async function assignTeacherAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser(["org_admin", "super_admin"]);
  return wrap(async () => { await assignTeacher(await actorOf(u), tuser(u), str(f, "groupId"), str(f, "teacherId")); revalidatePath("/church/classes"); return { ok: true, message: "Teacher assigned." }; });
}
export async function enrolAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser([...staffish]);
  return wrap(async () => { await enrolStudent(await actorOf(u), tuser(u), str(f, "groupId"), str(f, "studentId")); revalidatePath("/church/classes"); revalidatePath(`/teacher/classes/${str(f, "groupId")}`); return { ok: true, message: "Learner added to the class." }; });
}
export async function removeStudentAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser([...staffish]);
  return wrap(async () => { await removeStudent(await actorOf(u), tuser(u), str(f, "groupId"), str(f, "studentId")); revalidatePath(`/teacher/classes/${str(f, "groupId")}`); return { ok: true, message: "Removed." }; });
}
export async function approveTeacherAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser(["org_admin", "super_admin"]);
  return wrap(async () => { await approveTeacher(await actorOf(u), tuser(u), str(f, "teacherId"), str(f, "decision") === "approve"); revalidatePath("/church/people"); revalidatePath("/admin/users"); return { ok: true, message: str(f, "decision") === "approve" ? "Teacher approved." : "Teacher declined." }; });
}
export async function trainingAction(moduleId: string, _: ActionResult): Promise<ActionResult> {
  const u = await requireUser(["teacher"]);
  await completeTraining(u.id, moduleId); revalidatePath("/teacher/training");
  return { ok: true, message: "Marked as completed." };
}

export async function manualMarkAction(attemptId: string, qid: string, _: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser([...staffish]);
  return wrap(async () => { await markManual({ ...(await actorOf(u)), user: { id: u.id, role: u.role, orgId: u.orgId, status: u.status, classLevelSlug: u.classLevelSlug } }, attemptId, qid, Number(str(f, "marks")), str(f, "feedback")); revalidatePath(`/teacher/marking/${attemptId}`); return { ok: true, message: "Marks saved." }; });
}

// ───────── exam builder ─────────
export async function createExamAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser(["teacher", "org_admin", "super_admin", "curriculum_admin"]);
  return wrap(async () => {
    if (!can(u.role, "exams.manage") && u.role !== "teacher" && u.role !== "org_admin") throw new Error("Not allowed.");
    const title = str(f, "title"); if (title.length < 3) throw new Error("Give the exam a title.");
    const count = Math.max(1, Math.min(100, Number(str(f, "count")) || 10));
    const rule: ExamRule = { classLevelSlug: str(f, "classLevelSlug") || undefined, topic: str(f, "topic") || undefined, tag: str(f, "tag") || undefined, count };
    const db = await getDb();
    const groupId = str(f, "groupId") || null;
    if (groupId) { const { canManageGroup } = await import("@/server/services/teaching"); if (!(await canManageGroup(tuser(u), groupId))) throw new Error("You are not assigned to that class."); }
    const [e] = await db.insert(schema.exams).values({
      title, kind: str(f, "kind") || "class_test", description: str(f, "description"), classLevelSlug: rule.classLevelSlug ?? null, orgId: u.orgId, groupId, createdBy: u.id, status: "draft",
      durationMin: Math.max(1, Math.min(240, Number(str(f, "durationMin")) || 20)), rules: [rule], shuffleQuestions: f.get("shuffleQuestions") === "on", shuffleOptions: f.get("shuffleOptions") === "on",
      maxAttempts: Math.max(0, Number(str(f, "maxAttempts")) || 1), opensAt: str(f, "opensAt") ? new Date(str(f, "opensAt")) : null, closesAt: str(f, "closesAt") ? new Date(str(f, "closesAt")) : null,
      releaseResults: ["immediate", "after_close", "manual"].includes(str(f, "release")) ? str(f, "release") : "immediate", showExplanations: f.get("explanations") === "on", passMark: Math.max(0, Math.min(100, Number(str(f, "passMark")) || 50)),
      isFree: can(u.role, "exams.manage") && f.get("isFree") === "on",
    }).returning();
    const { audit } = await import("@/server/audit"); await audit(await actorOf(u), "exam.create", { type: "exam", id: e.id }, { title });
    revalidatePath("/teacher/exams"); revalidatePath("/admin/exams");
    return { ok: true, message: "Exam created as a draft. Publish it when you are ready." };
  });
}

export async function examStatusAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser(["teacher", "org_admin", "super_admin", "curriculum_admin"]);
  return wrap(async () => {
    const db = await getDb(); const id = str(f, "id"); const to = str(f, "to");
    const [e] = await db.select().from(schema.exams).where(eq(schema.exams.id, id));
    if (!e) throw new Error("Exam not found.");
    if (!(can(u.role, "exams.manage") || e.createdBy === u.id || (u.role === "org_admin" && e.orgId === u.orgId))) throw new Error("Not allowed.");
    if (to === "published") { const { pickQuestions } = await import("@/server/services/exams"); const qs = await pickQuestions(db, e); if (!qs.length) throw new Error("No questions match this exam's rules yet, so it cannot be published."); }
    const set: Partial<typeof schema.exams.$inferInsert> = { status: to === "published" || to === "closed" || to === "draft" ? to : e.status, updatedAt: new Date() };
    if (to === "release") set.resultsReleased = true;
    await db.update(schema.exams).set(set).where(eq(schema.exams.id, id));
    const { audit } = await import("@/server/audit"); await audit(await actorOf(u), `exam.${to}`, { type: "exam", id });
    revalidatePath("/teacher/exams"); revalidatePath("/admin/exams");
    return { ok: true, message: to === "release" ? "Results released." : `Exam is now ${to}.` };
  });
}

// ───────── question import (preview, then confirm) ─────────
export async function previewImportAction(_: unknown, f: FormData): Promise<{ ok: boolean; error?: string; questions?: ParsedQuestion[]; duplicates?: number[]; filename?: string } | null> {
  const u = await requireUser(["teacher", "org_admin", "super_admin", "curriculum_admin", "content_editor"]);
  const file = f.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Choose a file to import." };
  const r = await parseUpload(await actorOf(u), { id: u.id, role: u.role, orgId: u.orgId }, { name: file.name, bytes: Buffer.from(await file.arrayBuffer()) });
  return r.ok ? { ok: true, questions: r.questions, duplicates: r.duplicates, filename: file.name } : { ok: false, error: r.error };
}

export async function commitImportAction(payload: string, opts: ImportOptions): Promise<{ ok: boolean; error?: string; saved?: number; skipped?: number; rejected?: number; errors?: string[] }> {
  const u = await requireUser(["teacher", "org_admin", "super_admin", "curriculum_admin", "content_editor"]);
  try {
    const list = JSON.parse(payload) as ParsedQuestion[];
    if (!Array.isArray(list) || list.length > 500) return { ok: false, error: "Invalid import." };
    // Re-validate on the server: the browser copy may have been edited.
    const clean: ParsedQuestion[] = list.map((q) => {
      const errs: string[] = [];
      const opts2 = (q.options ?? []).filter((o) => o.text?.trim()).map((o) => ({ text: String(o.text).trim(), correct: !!o.correct }));
      const type = q.type;
      if (!String(q.text ?? "").trim()) errs.push("Empty question.");
      if ((type === "mcq" || type === "tf" || type === "multi") && (opts2.length < 2 || !opts2.some((o) => o.correct))) errs.push("Needs at least two options and one correct answer.");
      if (type === "fill" && !(q.acceptedAnswers ?? []).length) errs.push("Needs an accepted answer.");
      return { ...q, options: opts2, errors: errs, warnings: [] };
    });
    const r = await commitImport(await actorOf(u), { id: u.id, role: u.role, orgId: u.orgId }, clean, opts);
    revalidatePath("/teacher/exams"); revalidatePath("/admin/questions");
    return { ok: true, ...r };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function orgKeyAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const u = await requireUser(["org_admin"]);
  return wrap(async () => {
    if (!u.orgId) throw new Error("Your account is not linked to an organisation.");
    const role = str(f, "role") === "teacher" ? "teacher" : "student";
    const key = await createAccessKey(await actorOf(u), { label: str(f, "label") || "Invitation", purpose: "registration", role, orgId: u.orgId, classLevelSlug: str(f, "classLevelSlug") || undefined, maxUses: Math.max(1, Math.min(500, Number(str(f, "maxUses")) || 1)), expiresAt: str(f, "expires") ? new Date(str(f, "expires")) : undefined });
    return { ok: true, message: `Invitation code (shown once, copy it now): ${key}` };
  });
}

export async function redirectAction(to: string) { redirect(to); }

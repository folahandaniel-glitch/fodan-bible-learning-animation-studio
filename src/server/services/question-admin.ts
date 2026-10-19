import "server-only";
import ExcelJS from "exceljs";
import mammoth from "mammoth";
import { and, desc, eq, or, isNull } from "drizzle-orm";
import { getDb, schema } from "../db";
import { audit, type Actor } from "../audit";
import { parseCsv, parseQuestionText, questionsFromRows, type ParsedQuestion } from "@/lib/question-import";
import { checkDocx } from "./media";
import { parseRange } from "@/lib/bible";
import { can } from "@/lib/permissions";
import { normAnswer } from "./exams";
import { CLASS_SLUGS } from "@/content/story-types";
import type { Role } from "../db/schema";

export interface QUser { id: string; role: Role; orgId: string | null }
export const canWriteQuestions = (u: QUser) => can(u.role, "questions.write") || (u.role === "teacher") || u.role === "org_admin";

const MAX = 5 * 1024 * 1024;

export async function parseUpload(actor: Actor, user: QUser, file: { name: string; bytes: Buffer }): Promise<{ ok: true; questions: ParsedQuestion[]; duplicates: number[] } | { ok: false; error: string }> {
  if (!canWriteQuestions(user)) return { ok: false, error: "You are not allowed to import questions." };
  if (file.bytes.length === 0 || file.bytes.length > MAX) return { ok: false, error: "Files must be between 1 byte and 5 MB." };
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  let questions: ParsedQuestion[];
  try {
    if (ext === "docx") { const bad = checkDocx(file.bytes); if (bad) return { ok: false, error: bad }; questions = parseQuestionText((await mammoth.extractRawText({ buffer: file.bytes })).value); }
    else if (ext === "xlsx") {
      if (file.bytes[0] !== 0x50 || file.bytes[1] !== 0x4b) return { ok: false, error: "That does not look like an Excel (.xlsx) file." };
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(file.bytes as unknown as ArrayBuffer);
      const ws = wb.worksheets[0]; if (!ws) return { ok: false, error: "The workbook has no sheets." };
      const rows: string[][] = [];
      ws.eachRow({ includeEmpty: false }, (r) => { const vals = (r.values as unknown[]).slice(1).map((v) => (v == null ? "" : typeof v === "object" ? ((v as { text?: string; result?: unknown }).text ?? String((v as { result?: unknown }).result ?? "")) : String(v))); rows.push(vals); });
      questions = questionsFromRows(rows);
    }
    else if (ext === "csv") questions = questionsFromRows(parseCsv(file.bytes.toString("utf8")));
    else if (ext === "txt" || ext === "md") questions = parseQuestionText(file.bytes.toString("utf8"));
    else return { ok: false, error: "Use a .docx, .xlsx, .csv or .txt file." };
  } catch { return { ok: false, error: "The file could not be read. Check that it is not damaged or password protected." }; }
  if (!questions.length) return { ok: false, error: "No questions were found. Check the format guide below." };
  if (questions.length > 500) return { ok: false, error: "Please import at most 500 questions at a time." };
  const db = await getDb();
  const existing = await db.select({ text: schema.questions.text }).from(schema.questions).where(or(isNull(schema.questions.orgId), user.orgId ? eq(schema.questions.orgId, user.orgId) : isNull(schema.questions.orgId)));
  const seen = new Set(existing.map((e) => normAnswer(e.text)));
  const duplicates = questions.map((q, i) => (seen.has(normAnswer(q.text)) ? i : -1)).filter((i) => i >= 0);
  await audit(actor, "questions.import_preview", undefined, { filename: file.name, count: questions.length, errors: questions.filter((q) => q.errors.length).length });
  return { ok: true, questions, duplicates };
}

export interface ImportOptions { classLevelSlug?: string; topic?: string; status: "draft" | "review" | "published"; skipDuplicates: boolean; filename?: string }

/** Saves only what the user confirmed, and never overwrites an existing question. */
export async function commitImport(actor: Actor, user: QUser, list: ParsedQuestion[], opts: ImportOptions) {
  if (!canWriteQuestions(user)) throw new Error("Not allowed.");
  const db = await getDb();
  const staff = can(user.role, "questions.write");
  const status = staff ? opts.status : "published";
  const IDS = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const existing = await db.select({ text: schema.questions.text }).from(schema.questions).where(or(isNull(schema.questions.orgId), user.orgId ? eq(schema.questions.orgId, user.orgId) : isNull(schema.questions.orgId)));
  const seen = new Set(existing.map((e) => normAnswer(e.text)));
  let saved = 0, skipped = 0, rejected = 0;
  const errors: string[] = [];
  for (const q of list) {
    if (q.errors.length) { rejected++; errors.push(`Line ${q.line}: ${q.errors[0]}`); continue; }
    if (opts.skipDuplicates && seen.has(normAnswer(q.text))) { skipped++; continue; }
    const cl = (q.classLevelSlug && CLASS_SLUGS.includes(q.classLevelSlug) ? q.classLevelSlug : opts.classLevelSlug) ?? null;
    const idx = cl ? CLASS_SLUGS.indexOf(cl) + 1 : null;
    await db.insert(schema.questions).values({
      type: q.type, text: q.text.trim().slice(0, 2000), options: q.options.map((o, i) => ({ id: IDS[i], text: o.text.slice(0, 500), correct: o.correct })), acceptedAnswers: q.acceptedAnswers,
      explanation: q.explanation ?? "", ref: q.ref && parseRange(q.ref.split(";")[0]) ? q.ref : null, classLevelSlug: cl, classMin: idx, classMax: idx, topic: q.topic ?? opts.topic ?? null,
      difficulty: q.difficulty ?? 2, tags: q.tags ?? [], marks: q.marks ?? 1, status, authorId: user.id, orgId: staff ? null : user.orgId, source: `Imported${opts.filename ? " from " + opts.filename : ""}`,
    });
    seen.add(normAnswer(q.text)); saved++;
  }
  await db.insert(schema.importLogs).values({ kind: "questions", filename: opts.filename ?? null, userId: user.id, summary: { saved, skipped, rejected, errors: errors.slice(0, 50) } });
  await audit(actor, "questions.import", undefined, { saved, skipped, rejected, filename: opts.filename });
  return { saved, skipped, rejected, errors };
}

export async function listQuestions(user: QUser, filter: { q?: string; classLevelSlug?: string; status?: string } = {}) {
  const db = await getDb();
  const rows = await db.select().from(schema.questions).where(can(user.role, "questions.write") ? undefined : or(eq(schema.questions.orgId, user.orgId ?? "00000000-0000-0000-0000-000000000000"), eq(schema.questions.authorId, user.id))).orderBy(desc(schema.questions.createdAt)).limit(400);
  return rows.filter((r) => (filter.q ? r.text.toLowerCase().includes(filter.q.toLowerCase()) : true) && (filter.classLevelSlug ? r.classLevelSlug === filter.classLevelSlug || (r.classMin != null && CLASS_SLUGS.indexOf(filter.classLevelSlug) + 1 >= r.classMin && CLASS_SLUGS.indexOf(filter.classLevelSlug) + 1 <= (r.classMax ?? 12)) : true) && (filter.status ? r.status === filter.status : true));
}

export async function setQuestionStatus(actor: Actor, user: QUser, id: string, status: "draft" | "review" | "published" | "archived") {
  if (!can(user.role, "questions.write")) throw new Error("Not allowed.");
  if ((status === "published") && !can(user.role, "content.review") && user.role !== "content_editor" && user.role !== "curriculum_admin" && user.role !== "super_admin") throw new Error("Only a reviewer can publish.");
  const db = await getDb();
  await db.update(schema.questions).set({ status, reviewerId: user.id, updatedAt: new Date() }).where(eq(schema.questions.id, id));
  await audit(actor, `question.${status}`, { type: "question", id });
}

void and;

import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { audit, type Actor } from "../audit";
import { sendTemplate, appUrl } from "./email";
import { isStaffRole } from "@/lib/permissions";
import type { Role } from "../db/schema";

export interface TUser { id: string; role: Role; orgId: string | null; status: string }

/** The only way teachers (and org admins) get to a class: assignment by their own organisation. */
export async function canManageGroup(u: TUser, groupId: string): Promise<boolean> {
  const db = await getDb();
  const [g] = await db.select().from(schema.classGroups).where(eq(schema.classGroups.id, groupId));
  if (!g) return false;
  if (u.role === "super_admin" || u.role === "curriculum_admin") return true;
  if (u.status !== "active") return false;
  if (u.role === "org_admin") return !!u.orgId && g.orgId === u.orgId;
  if (u.role === "teacher") {
    if (!u.orgId || g.orgId !== u.orgId) return false; // never across organisations
    const m = await db.select().from(schema.groupTeachers).where(and(eq(schema.groupTeachers.groupId, groupId), eq(schema.groupTeachers.teacherId, u.id)));
    return m.length > 0;
  }
  return false;
}

export async function myGroups(u: TUser) {
  const db = await getDb();
  if (u.role === "teacher") {
    return db.select({ g: schema.classGroups }).from(schema.groupTeachers).innerJoin(schema.classGroups, eq(schema.classGroups.id, schema.groupTeachers.groupId)).where(and(eq(schema.groupTeachers.teacherId, u.id), eq(schema.classGroups.active, true))).then((r) => r.map((x) => x.g));
  }
  if (u.role === "org_admin" && u.orgId) return db.select().from(schema.classGroups).where(eq(schema.classGroups.orgId, u.orgId)).orderBy(asc(schema.classGroups.name));
  if (isStaffRole(u.role)) return db.select().from(schema.classGroups).orderBy(asc(schema.classGroups.name));
  return [];
}

export async function createGroup(actor: Actor, u: TUser, input: { name: string; classLevelSlug: string; termNo?: number; orgId?: string }) {
  const orgId = u.role === "org_admin" ? u.orgId : input.orgId;
  if (!orgId) throw new Error("Choose the organisation.");
  if (u.role !== "org_admin" && u.role !== "super_admin") throw new Error("Only an organisation administrator can create classes.");
  if (u.role === "org_admin" && u.orgId !== orgId) throw new Error("Not your organisation.");
  const db = await getDb();
  const [g] = await db.insert(schema.classGroups).values({ orgId, name: input.name.trim().slice(0, 80), classLevelSlug: input.classLevelSlug, termNo: input.termNo ?? 1 }).returning();
  await audit(actor, "group.create", { type: "group", id: g.id }, { name: g.name });
  return g;
}

async function sameOrg(db: Awaited<ReturnType<typeof getDb>>, groupId: string, userId: string) {
  const [g] = await db.select().from(schema.classGroups).where(eq(schema.classGroups.id, groupId));
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  return !!g && !!u && g.orgId === u.orgId;
}

export async function assignTeacher(actor: Actor, u: TUser, groupId: string, teacherId: string) {
  if (!(await canManageGroup(u, groupId)) || u.role === "teacher") throw new Error("Not allowed.");
  const db = await getDb();
  const [t] = await db.select().from(schema.users).where(eq(schema.users.id, teacherId));
  if (!t || t.role !== "teacher" || t.status !== "active") throw new Error("Only approved teachers can be assigned.");
  if (!(await sameOrg(db, groupId, teacherId))) throw new Error("That teacher belongs to another organisation.");
  await db.insert(schema.groupTeachers).values({ groupId, teacherId }).onConflictDoNothing();
  await audit(actor, "group.assign_teacher", { type: "group", id: groupId }, { teacherId });
}

export async function enrolStudent(actor: Actor, u: TUser, groupId: string, studentId: string) {
  if (!(await canManageGroup(u, groupId))) throw new Error("Not allowed.");
  const db = await getDb();
  const [s] = await db.select().from(schema.users).where(eq(schema.users.id, studentId));
  if (!s || s.role !== "student") throw new Error("Student not found.");
  if (!(await sameOrg(db, groupId, studentId))) throw new Error("That student belongs to another organisation.");
  await db.insert(schema.groupStudents).values({ groupId, studentId }).onConflictDoNothing();
  await audit(actor, "group.enrol", { type: "group", id: groupId }, { studentId });
}

export async function removeStudent(actor: Actor, u: TUser, groupId: string, studentId: string) {
  if (!(await canManageGroup(u, groupId))) throw new Error("Not allowed.");
  const db = await getDb();
  await db.delete(schema.groupStudents).where(and(eq(schema.groupStudents.groupId, groupId), eq(schema.groupStudents.studentId, studentId)));
  await audit(actor, "group.remove_student", { type: "group", id: groupId }, { studentId });
}

/** Roster privacy: first name + surname initial and the nickname; no contact details, no birth data. */
export async function roster(u: TUser, groupId: string) {
  if (!(await canManageGroup(u, groupId))) return null;
  const db = await getDb();
  const rows = await db.select({ id: schema.users.id, fullName: schema.users.fullName, displayName: schema.users.displayName, username: schema.users.username }).from(schema.groupStudents).innerJoin(schema.users, eq(schema.users.id, schema.groupStudents.studentId)).where(eq(schema.groupStudents.groupId, groupId)).orderBy(asc(schema.users.fullName));
  return rows.map((r) => { const p = r.fullName.trim().split(/\s+/); return { id: r.id, label: p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0], username: r.username }; });
}

export async function orgUsers(orgId: string, role: Role) {
  const db = await getDb();
  return db.select({ id: schema.users.id, fullName: schema.users.fullName, username: schema.users.username, email: schema.users.email, status: schema.users.status, classLevelSlug: schema.users.classLevelSlug, createdAt: schema.users.createdAt })
    .from(schema.users).where(and(eq(schema.users.orgId, orgId), eq(schema.users.role, role))).orderBy(desc(schema.users.createdAt));
}

/** Approve a pending teacher: by their own organisation's admin (or the super admin). */
export async function approveTeacher(actor: Actor, u: TUser, teacherId: string, approve: boolean) {
  const db = await getDb();
  const [t] = await db.select().from(schema.users).where(eq(schema.users.id, teacherId));
  if (!t || t.role !== "teacher") throw new Error("Teacher not found.");
  const allowed = u.role === "super_admin" || (u.role === "org_admin" && u.status === "active" && !!u.orgId && t.orgId === u.orgId);
  if (!allowed) throw new Error("Only your own organisation's administrator can approve this teacher.");
  await db.update(schema.users).set({ status: approve ? "active" : "deactivated" }).where(eq(schema.users.id, teacherId));
  await audit(actor, approve ? "teacher.approve" : "teacher.reject", { type: "user", id: teacherId });
  if (approve && t.email) await sendTemplate("teacher_approved", t.email, { name: t.displayName, loginUrl: `${appUrl()}/login` }).catch(() => undefined);
}

// ───────── attendance & assignments ─────────
export async function takeAttendance(actor: Actor, u: TUser, groupId: string, date: string, marks: Record<string, string>) {
  if (!(await canManageGroup(u, groupId))) throw new Error("Not allowed.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a valid date.");
  const db = await getDb();
  const members = (await db.select({ id: schema.groupStudents.studentId }).from(schema.groupStudents).where(eq(schema.groupStudents.groupId, groupId))).map((m) => m.id);
  const [sess] = await db.insert(schema.attendanceSessions).values({ groupId, date, takenBy: u.id }).onConflictDoUpdate({ target: [schema.attendanceSessions.groupId, schema.attendanceSessions.date], set: { takenBy: u.id } }).returning();
  for (const [sid, st] of Object.entries(marks)) {
    if (!members.includes(sid) || !["present", "absent", "late", "excused"].includes(st)) continue;
    await db.insert(schema.attendanceMarks).values({ sessionId: sess.id, studentId: sid, status: st }).onConflictDoUpdate({ target: [schema.attendanceMarks.sessionId, schema.attendanceMarks.studentId], set: { status: st } });
  }
  await audit(actor, "attendance.take", { type: "group", id: groupId }, { date });
}

export async function attendanceSummary(u: TUser, groupId: string) {
  if (!(await canManageGroup(u, groupId))) return null;
  const db = await getDb();
  const sessions = await db.select().from(schema.attendanceSessions).where(eq(schema.attendanceSessions.groupId, groupId)).orderBy(desc(schema.attendanceSessions.date));
  const marks = sessions.length ? await db.select().from(schema.attendanceMarks).where(inArray(schema.attendanceMarks.sessionId, sessions.map((s) => s.id))) : [];
  return { sessions, marks };
}

export async function createAssignment(actor: Actor, u: TUser, input: { groupId: string; kind: "lesson" | "exam" | "story"; refId: string; title: string; instructions?: string; dueAt?: Date | null }) {
  if (!(await canManageGroup(u, input.groupId))) throw new Error("Not allowed.");
  const db = await getDb();
  const [a] = await db.insert(schema.assignments).values({ groupId: input.groupId, kind: input.kind, refId: input.refId, title: input.title.slice(0, 160), instructions: input.instructions ?? "", dueAt: input.dueAt ?? null, createdBy: u.id }).returning();
  const kids = await db.select({ id: schema.users.id, email: schema.users.email, name: schema.users.displayName }).from(schema.groupStudents).innerJoin(schema.users, eq(schema.users.id, schema.groupStudents.studentId)).where(eq(schema.groupStudents.groupId, input.groupId));
  for (const k of kids) await db.insert(schema.notifications).values({ userId: k.id, title: `New assignment: ${a.title}`, body: input.instructions ?? "", href: input.kind === "exam" ? `/student/exams` : input.kind === "lesson" ? `/learn` : `/stories` });
  await audit(actor, "assignment.create", { type: "assignment", id: a.id }, { groupId: input.groupId, kind: input.kind });
  return a;
}

export async function assignmentsForStudent(studentId: string) {
  const db = await getDb();
  return db.select({ a: schema.assignments, g: schema.classGroups }).from(schema.groupStudents).innerJoin(schema.assignments, eq(schema.assignments.groupId, schema.groupStudents.groupId)).innerJoin(schema.classGroups, eq(schema.classGroups.id, schema.assignments.groupId)).where(eq(schema.groupStudents.studentId, studentId)).orderBy(desc(schema.assignments.createdAt));
}

export async function groupProgress(u: TUser, groupId: string) {
  if (!(await canManageGroup(u, groupId))) return null;
  const db = await getDb();
  const [g] = await db.select().from(schema.classGroups).where(eq(schema.classGroups.id, groupId));
  const kids = await db.select({ id: schema.users.id, fullName: schema.users.fullName }).from(schema.groupStudents).innerJoin(schema.users, eq(schema.users.id, schema.groupStudents.studentId)).where(eq(schema.groupStudents.groupId, groupId));
  if (!kids.length) return { rows: [], className: g.classLevelSlug };
  const ids = kids.map((k) => k.id);
  const [cls] = await db.select().from(schema.classLevels).where(eq(schema.classLevels.slug, g.classLevelSlug));
  const lessonRows = cls ? await db.select({ id: schema.lessons.id }).from(schema.lessons).where(and(eq(schema.lessons.classLevelId, cls.id), eq(schema.lessons.status, "published"), eq(schema.lessons.contentLevel, "complete"))) : [];
  const prog = await db.select().from(schema.lessonProgress).where(and(inArray(schema.lessonProgress.userId, ids), eq(schema.lessonProgress.status, "completed")));
  const atts = await db.select().from(schema.examAttempts).where(and(inArray(schema.examAttempts.userId, ids), inArray(schema.examAttempts.status, ["marked", "submitted"])));
  const att = await db.select({ studentId: schema.attendanceMarks.studentId, status: schema.attendanceMarks.status, n: sql<number>`count(*)::int` }).from(schema.attendanceMarks).innerJoin(schema.attendanceSessions, eq(schema.attendanceSessions.id, schema.attendanceMarks.sessionId)).where(eq(schema.attendanceSessions.groupId, groupId)).groupBy(schema.attendanceMarks.studentId, schema.attendanceMarks.status);
  const lessonSet = new Set(lessonRows.map((l) => l.id));
  return {
    className: g.classLevelSlug,
    rows: kids.map((k) => {
      const p = k.fullName.trim().split(/\s+/);
      const done = prog.filter((x) => x.userId === k.id && lessonSet.has(x.lessonId)).length;
      const scores = atts.filter((a) => a.userId === k.id && a.percent != null).map((a) => a.percent as number);
      const present = att.filter((a) => a.studentId === k.id && (a.status === "present" || a.status === "late")).reduce((s, a) => s + a.n, 0);
      const total = att.filter((a) => a.studentId === k.id).reduce((s, a) => s + a.n, 0);
      return { id: k.id, label: p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0], lessonsDone: done, lessonsTotal: lessonRows.length, examAvg: scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : null, exams: scores.length, attendance: total ? Math.round((present / total) * 100) : null };
    }),
  };
}

// ───────── teacher training ─────────
export async function trainingStatus(userId: string) {
  const db = await getDb();
  const mods = await db.select().from(schema.trainingModules).where(eq(schema.trainingModules.status, "published")).orderBy(asc(schema.trainingModules.sort));
  const done = await db.select().from(schema.trainingProgress).where(eq(schema.trainingProgress.userId, userId));
  const set = new Set(done.map((d) => d.moduleId));
  return mods.map((m) => ({ ...m, done: set.has(m.id) }));
}
export async function completeTraining(userId: string, moduleId: string) {
  const db = await getDb();
  await db.insert(schema.trainingProgress).values({ userId, moduleId }).onConflictDoNothing();
}

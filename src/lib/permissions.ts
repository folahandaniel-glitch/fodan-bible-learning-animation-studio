import type { Role } from "@/server/db/schema";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin", curriculum_admin: "Curriculum Administrator", content_editor: "Content Editor", teacher: "Sunday School Teacher",
  parent: "Parent / Guardian", student: "Student", org_admin: "Church / School Administrator", finance_admin: "Finance / Subscription Administrator",
  media_admin: "Media Administrator", developer_admin: "Developer Administrator",
};

export type Perm =
  | "admin.access" | "users.manage" | "orgs.manage" | "keys.manage" | "curriculum.write" | "content.review" | "stories.write" | "questions.write"
  | "exams.manage" | "timeline.write" | "site.edit" | "branding.edit" | "media.manage" | "plans.manage" | "finance.view" | "entitlements.manage"
  | "audit.view" | "integrations.view" | "emails.edit" | "privacy.handle" | "training.write";

const ALL: Perm[] = ["admin.access", "users.manage", "orgs.manage", "keys.manage", "curriculum.write", "content.review", "stories.write", "questions.write", "exams.manage", "timeline.write", "site.edit", "branding.edit", "media.manage", "plans.manage", "finance.view", "entitlements.manage", "audit.view", "integrations.view", "emails.edit", "privacy.handle", "training.write"];

export const PERMS: Record<Role, Perm[]> = {
  super_admin: ALL,
  curriculum_admin: ["admin.access", "curriculum.write", "content.review", "stories.write", "questions.write", "exams.manage", "timeline.write", "training.write", "media.manage"],
  content_editor: ["admin.access", "curriculum.write", "stories.write", "questions.write", "media.manage"],
  media_admin: ["admin.access", "media.manage", "branding.edit"],
  finance_admin: ["admin.access", "plans.manage", "finance.view", "entitlements.manage"],
  org_admin: [], teacher: [], parent: [], student: [], developer_admin: [],
};

/** Permissions the Super Admin may hand to an individual administrator. Account, organisation and privacy control stay with the Super Admin. */
export const GRANTABLE: { perm: Perm; group: string; label: string }[] = [
  { perm: "site.edit", group: "Website", label: "Edit homepage, pages, page text, menus, FAQs, events, wings, testimonies" },
  { perm: "branding.edit", group: "Website", label: "Change logos and branding" },
  { perm: "emails.edit", group: "Website", label: "Edit e-mail templates" },
  { perm: "curriculum.write", group: "Courses", label: "Write and edit courses, topics and lessons" },
  { perm: "content.review", group: "Courses", label: "Review, approve and publish content (Approve all)" },
  { perm: "stories.write", group: "Courses", label: "Write and edit Bible stories" },
  { perm: "timeline.write", group: "Courses", label: "Edit the timeline" },
  { perm: "training.write", group: "Courses", label: "Edit teacher training" },
  { perm: "questions.write", group: "Assessment", label: "Create, import and edit questions" },
  { perm: "exams.manage", group: "Assessment", label: "Create and manage exams" },
  { perm: "media.manage", group: "Media", label: "Manage media and animation" },
  { perm: "plans.manage", group: "Finance", label: "Edit plans and prices" },
  { perm: "finance.view", group: "Finance", label: "View payments and access" },
  { perm: "entitlements.manage", group: "Finance", label: "Grant, correct and refund access" },
  { perm: "audit.view", group: "Oversight", label: "View the audit log" },
  { perm: "keys.manage", group: "Oversight", label: "Manage access codes" },
];
export const GRANTABLE_PERMS = GRANTABLE.map((g) => g.perm);
type Subject = Role | { role: Role; extraPerms?: readonly string[] };
/** Role defaults plus any permissions the Super Admin granted to this person. Learners and the developer role can never hold extra permissions. */
export function can(subject: Subject | undefined | null, perm: Perm): boolean {
  if (!subject) return false;
  const role = typeof subject === "string" ? subject : subject.role;
  if (PERMS[role]?.includes(perm)) return true;
  if (typeof subject === "string" || role === "student" || role === "parent" || role === "developer_admin") return false;
  const extra = subject.extraPerms ?? [];
  if (perm === "admin.access") return extra.some((p) => GRANTABLE_PERMS.includes(p as Perm));
  return GRANTABLE_PERMS.includes(perm) && extra.includes(perm);
}
/** True when the person can open the admin area (by role or by a granted permission). */
export const hasAdminAccess = (s: Subject | undefined | null) => can(s, "admin.access") || (!!s && typeof s !== "string" && s.role !== "student" && s.role !== "parent" && s.role !== "developer_admin" && (s.extraPerms ?? []).some((p) => GRANTABLE_PERMS.includes(p as Perm)));
export const isAdminRole = (role: Role) => PERMS[role]?.includes("admin.access");
/** Staff roles may preview all content without a learner subscription. */
export const isStaffRole = (role: Role) => role === "super_admin" || role === "curriculum_admin" || role === "content_editor" || role === "media_admin";

export function homeFor(role: Role): string {
  switch (role) {
    case "student": return "/student";
    case "parent": return "/parent";
    case "teacher": return "/teacher";
    case "org_admin": return "/church";
    case "developer_admin": return "/softnet";
    default: return "/admin";
  }
}

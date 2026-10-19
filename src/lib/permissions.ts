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

export const can = (role: Role | undefined | null, perm: Perm) => !!role && PERMS[role]?.includes(perm);
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

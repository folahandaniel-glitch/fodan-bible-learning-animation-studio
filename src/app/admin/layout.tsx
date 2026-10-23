import type { ReactNode } from "react";
import { requireAdmin } from "@/server/guards";
import { PortalShell, type NavItem } from "@/components/shell";
import { can, type Perm } from "@/lib/permissions";

const ITEMS: (NavItem & { perm: Perm })[] = [
  { href: "/admin", label: "Dashboard", perm: "admin.access" },
  { href: "/admin/curriculum", label: "Curriculum", perm: "curriculum.write" },
  { href: "/admin/review", label: "Review queue", perm: "content.review" },
  { href: "/admin/stories", label: "Stories", perm: "stories.write" },
  { href: "/studio", label: "Story studio", perm: "stories.write" },
  { href: "/admin/questions", label: "Question bank", perm: "questions.write" },
  { href: "/admin/exams", label: "Exams", perm: "exams.manage" },
  { href: "/admin/data/timeline", label: "Timeline", perm: "timeline.write" },
  { href: "/admin/site", label: "Homepage and pages", perm: "site.edit" },
  { href: "/admin/data/wings", label: "Ministry wings", perm: "site.edit" },
  { href: "/admin/data/faqs", label: "FAQs", perm: "site.edit" },
  { href: "/admin/data/events", label: "Events", perm: "site.edit" },
  { href: "/admin/data/testimonials", label: "Testimonies", perm: "site.edit" },
  { href: "/admin/data/enquiries", label: "Enquiries", perm: "site.edit" },
  { href: "/admin/brand", label: "Branding and logos", perm: "branding.edit" },
  { href: "/admin/settings", label: "Settings and menus", perm: "site.edit" },
  { href: "/admin/page-text", label: "Page text", perm: "site.edit" },
  { href: "/admin/emails", label: "E-mail templates", perm: "emails.edit" },
  { href: "/admin/users", label: "Users and roles", perm: "users.manage" },
  { href: "/admin/orgs", label: "Churches and schools", perm: "orgs.manage" },
  { href: "/admin/keys", label: "Access codes", perm: "keys.manage" },
  { href: "/admin/plans", label: "Plans", perm: "plans.manage" },
  { href: "/admin/finance", label: "Payments and access", perm: "finance.view" },
  { href: "/admin/video", label: "Animation (optional)", perm: "media.manage" },
  { href: "/admin/integrations", label: "Integrations", perm: "integrations.view" },
  { href: "/admin/privacy", label: "Privacy requests", perm: "privacy.handle" },
  { href: "/admin/audit", label: "Audit log", perm: "audit.view" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();
  return <PortalShell user={user} nav={ITEMS.filter((i) => can(user.role, i.perm))}>{children}</PortalShell>;
}

import type { ReactNode } from "react";
import { requireUser } from "@/server/guards";
import { CHURCH_NAV, PARENT_NAV, PortalShell, STUDENT_NAV, TEACHER_NAV, type NavItem } from "@/components/shell";

export const navFor = (role: string): NavItem[] =>
  role === "student" ? STUDENT_NAV : role === "parent" ? PARENT_NAV : role === "teacher" ? TEACHER_NAV : role === "org_admin" ? CHURCH_NAV : role === "developer_admin" ? [{ href: "/softnet", label: "Control plane" }] : [{ href: "/admin", label: "Dashboard" }, { href: "/account/billing", label: "Billing" }];

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(undefined, { allowPending: true, allowPasswordChange: true });
  return <PortalShell user={user} nav={navFor(user.role)}>{children}</PortalShell>;
}

import type { ReactNode } from "react";
import { requireUser } from "@/server/guards";
import { PortalShell, TEACHER_NAV } from "@/components/shell";
import { navFor } from "@/app/account/layout";

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(["teacher", "super_admin", "curriculum_admin", "content_editor"]);
  return <PortalShell user={user} nav={user.role === "teacher" ? TEACHER_NAV : navFor(user.role)}>{children}</PortalShell>;
}

import type { ReactNode } from "react";
import { requireUser } from "@/server/guards";
import { PortalShell, TEACHER_NAV } from "@/components/shell";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(["teacher"]);
  return <PortalShell user={user} nav={TEACHER_NAV}>{children}</PortalShell>;
}

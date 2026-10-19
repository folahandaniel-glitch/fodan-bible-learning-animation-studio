import type { ReactNode } from "react";
import { requireUser } from "@/server/guards";
import { PortalShell, STUDENT_NAV } from "@/components/shell";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(["student"]);
  return <PortalShell user={user} nav={STUDENT_NAV}>{children}</PortalShell>;
}

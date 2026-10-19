import type { ReactNode } from "react";
import { requireUser } from "@/server/guards";
import { CHURCH_NAV, PortalShell } from "@/components/shell";

export default async function ChurchLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(["org_admin"]);
  return <PortalShell user={user} nav={CHURCH_NAV}>{children}</PortalShell>;
}

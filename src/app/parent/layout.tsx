import type { ReactNode } from "react";
import { requireUser } from "@/server/guards";
import { PARENT_NAV, PortalShell } from "@/components/shell";

export default async function ParentLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(["parent"]);
  return <PortalShell user={user} nav={PARENT_NAV}>{children}</PortalShell>;
}

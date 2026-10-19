import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/shell";
import { getSetting } from "@/server/settings";
import { optionalUser } from "@/server/guards";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const m = await getSetting("maintenance");
  const u = await optionalUser();
  if (m.suspended && u?.role !== "developer_admin") {
    return <main className="grid min-h-screen place-items-center p-6 text-center"><div className="card card-pad max-w-md"><h1 className="text-2xl font-bold">Service temporarily unavailable</h1><p className="mt-2 text-mist">{m.message}</p></div></main>;
  }
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}

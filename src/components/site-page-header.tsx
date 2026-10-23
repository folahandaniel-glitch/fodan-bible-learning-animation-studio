import type { ReactNode } from "react";
import { getPageText } from "@/server/page-text";
import { PageHeader } from "@/components/ui";

/** A public page heading whose words can be edited in Admin → Page text. */
export async function SitePageHeader({ id, vars, fallbackSubtitle, actions }: { id: string; vars?: Record<string, string | number>; fallbackSubtitle?: string; actions?: ReactNode }) {
  const t = await getPageText(id, vars, fallbackSubtitle);
  return <PageHeader kicker={t.kicker} title={t.title} subtitle={t.subtitle || undefined} actions={actions} />;
}

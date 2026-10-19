import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/guards";
import { pageWithDraft } from "@/server/services/site";
import { Crumbs } from "@/components/ui";

export const metadata = { title: "Responsive preview", robots: { index: false } };
const SIZES = [{ k: "phone", w: 390, label: "Phone (390 px)" }, { k: "tablet", w: 820, label: "Tablet (820 px)" }, { k: "desktop", w: 1280, label: "Desktop (1280 px)" }];

export default async function Preview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ d?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  await requireAdmin("site.edit");
  const data = await pageWithDraft(id);
  if (!data) notFound();
  const size = SIZES.find((s) => s.k === sp.d) ?? SIZES[0];
  const src = data.page.kind === "home" ? "/?preview=draft" : `/p/${data.page.slug}?preview=draft`;
  return (
    <div className="space-y-4">
      <Crumbs items={[{ href: "/admin/site", label: "Pages" }, { href: `/admin/site/${id}`, label: data.page.title }, { label: "Preview" }]} />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Device size">{SIZES.map((s) => <Link key={s.k} href={`/admin/site/${id}/preview?d=${s.k}`} aria-current={s.k === size.k ? "true" : undefined} className={`btn btn-sm ${s.k === size.k ? "btn-navy" : "btn-ghost"}`}>{s.label}</Link>)}</div>
      <div className="overflow-x-auto rounded-2xl border-4 border-navy bg-white p-2">
        <iframe title={`Draft preview at ${size.label}`} src={src} style={{ width: size.w, height: 760, border: 0, display: "block", margin: "0 auto", maxWidth: "none" }} />
      </div>
      <p className="text-sm text-mist">This shows your <strong>draft</strong>, exactly as visitors will see it after you publish.</p>
    </div>
  );
}

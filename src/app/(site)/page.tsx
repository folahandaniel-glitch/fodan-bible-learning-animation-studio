import type { Metadata } from "next";
import { loadPage } from "@/server/services/site";
import { optionalUser } from "@/server/guards";
import { Section } from "@/components/sections";
import { can } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const p = await loadPage("home");
  return { title: p?.seoTitle ? { absolute: p.seoTitle } : undefined, description: p?.seoDescription ?? undefined };
}

export default async function Home({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const user = await optionalUser();
  const sp = await searchParams;
  const preview = sp.preview === "draft" && can(user?.role, "site.edit"); // only editors can see unpublished changes
  const page = await loadPage("home", { preview, role: user?.role ?? null });
  if (!page) return <p className="container-page py-20 text-center">The homepage has not been published yet.</p>;
  return (
    <>
      {preview && <div className="bg-gold px-4 py-2 text-center text-sm font-bold text-navy">Draft preview: visitors do not see this until you publish.</div>}
      {page.sections.map((s) => <Section key={s.id} sec={s} />)}
    </>
  );
}

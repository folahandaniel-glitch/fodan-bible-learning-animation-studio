import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPage } from "@/server/services/site";
import { optionalUser } from "@/server/guards";
import { Section } from "@/components/sections";
import { can } from "@/lib/permissions";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const p = await loadPage(slug);
  return { title: p?.seoTitle ?? p?.title, description: p?.seoDescription ?? undefined };
}

export default async function CustomPage({ params, searchParams }: P) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await optionalUser();
  const preview = sp.preview === "draft" && can(user?.role, "site.edit");
  const page = await loadPage(slug, { preview, role: user?.role ?? null });
  if (!page || page.slug === "home") notFound();
  return (
    <>
      {preview && <div className="bg-gold px-4 py-2 text-center text-sm font-bold text-navy">Draft preview</div>}
      {!page.sections.length && <div className="container-page py-16"><h1 className="text-3xl font-bold">{page.title}</h1></div>}
      {page.sections.map((s) => <Section key={s.id} sec={s} />)}
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { bookBySlug, hasText, isTranslation, TRANSLATIONS, BOOKS } from "@/lib/bible";
import { chapterCount, chapterVerses } from "@/server/bible-data";
import { Crumbs } from "@/components/ui";
import { getSetting } from "@/server/settings";
import { optionalUser } from "@/server/guards";

type P = { params: Promise<{ book: string; chapter: string }>; searchParams: Promise<{ t?: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { book, chapter } = await params;
  const b = bookBySlug(book);
  return { title: b ? `${b.name} ${chapter}` : "Bible" };
}

export default async function Chapter({ params, searchParams }: P) {
  const { book, chapter } = await params;
  const sp = await searchParams;
  const features = await getSetting("features");
  const user = await optionalUser();
  const b = bookBySlug(book);
  const ch = Number(chapter);
  if (!b || !Number.isInteger(ch) || ch < 1 || ch > chapterCount(b.i)) notFound();
  const tr = isTranslation(sp.t) ? sp.t : "kjv";
  if (!features.bibleReaderPublic && !user) notFound();
  const usable = hasText(tr, b.i);
  const verses = usable ? chapterVerses(tr, b.i, ch) : [];
  const total = chapterCount(b.i);
  const meta = TRANSLATIONS.find((t) => t.id === tr)!;
  const q = tr === "kjv" ? "" : `?t=${tr}`;
  const prev = ch > 1 ? `/bible/${b.slug}/${ch - 1}${q}` : b.i > 0 ? `/bible/${BOOKS[b.i - 1].slug}/${chapterCount(b.i - 1)}${q}` : null;
  const next = ch < total ? `/bible/${b.slug}/${ch + 1}${q}` : b.i < 65 ? `/bible/${BOOKS[b.i + 1].slug}/1${q}` : null;
  return (
    <div className="container-page max-w-3xl py-10">
      <Crumbs items={[{ href: "/bible", label: "Bible" }, { label: `${b.name} ${ch}` }]} />
      <h1 className="text-3xl font-bold">{b.name} {ch}</h1>
      <p className="text-sm text-mist">{b.genre} · {meta.full} · {meta.licence}</p>
      <div className="my-4 flex flex-wrap gap-1" role="group" aria-label="Translation">{TRANSLATIONS.filter((t) => hasText(t.id, b.i)).map((t) => <Link key={t.id} href={`/bible/${b.slug}/${ch}?t=${t.id}`} aria-current={t.id === tr ? "true" : undefined} className={`btn btn-sm ${t.id === tr ? "btn-navy" : "btn-ghost"}`}>{t.name}</Link>)}</div>
      <nav aria-label="Chapters" className="mb-4 flex flex-wrap gap-1">{Array.from({ length: total }, (_, i) => <Link key={i} href={`/bible/${b.slug}/${i + 1}${q}`} aria-current={i + 1 === ch ? "page" : undefined} className={`grid h-8 min-w-8 place-items-center rounded-md px-1 text-xs font-bold no-underline ${i + 1 === ch ? "bg-navy text-white" : "bg-sand text-navy"}`}>{i + 1}</Link>)}</nav>
      {!usable ? <p className="alert alert-info">The {meta.name} text is not available for this book.</p> : (
        <div className="scripture !text-lg leading-8" lang={meta.lang} dir={meta.lang === "he" ? "rtl" : undefined}>
          {verses.map((v, i) => <span key={i} id={`v${i + 1}`}><sup className="mx-1 text-xs font-bold text-gold-700">{i + 1}</sup>{v} </span>)}
        </div>
      )}
      <div className="mt-6 flex justify-between">{prev ? <Link href={prev} className="btn btn-ghost">◀ Previous</Link> : <span />}{next && <Link href={next} className="btn btn-primary">Next ▶</Link>}</div>
    </div>
  );
}

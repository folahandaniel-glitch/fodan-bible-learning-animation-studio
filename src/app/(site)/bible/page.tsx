import type { Metadata } from "next";
import Link from "next/link";
import { BOOKS, isTranslation, parseRanges, TRANSLATIONS, type TranslationId } from "@/lib/bible";
import { getPassages, searchBible } from "@/server/bible-data";
import { getSetting } from "@/server/settings";
import { BibleText } from "@/components/bible-text";
import { SitePageHeader } from "@/components/site-page-header";
import { optionalUser } from "@/server/guards";

export const metadata: Metadata = { title: "Read the Bible" };

export default async function BibleIndex({ searchParams }: { searchParams: Promise<{ t?: string; q?: string; ref?: string }> }) {
  const sp = await searchParams;
  const features = await getSetting("features");
  const user = await optionalUser();
  const tr: TranslationId = isTranslation(sp.t) ? sp.t : "kjv";
  if (!features.bibleReaderPublic && !user) return <div className="container-page py-16 text-center"><p>Please <Link href="/login?next=/bible">sign in</Link> to use the Bible reader.</p></div>;
  const refResult = sp.ref ? getPassages(sp.ref, tr) : [];
  const found = sp.q ? searchBible(sp.q, tr === "wlc" || tr === "tr" ? "kjv" : tr, 30) : [];
  return (
    <div className="container-page py-10">
      <SitePageHeader id="bible" />
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Translation">{TRANSLATIONS.map((t) => <Link key={t.id} href={`/bible?t=${t.id}`} aria-current={t.id === tr ? "true" : undefined} className={`btn btn-sm ${t.id === tr ? "btn-navy" : "btn-ghost"}`} title={`${t.full}: ${t.licence}`}>{t.name}</Link>)}</div>
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <form className="card card-pad" role="search"><input type="hidden" name="t" value={tr} /><label className="label" htmlFor="ref">Go to a passage</label><div className="flex gap-2"><input id="ref" name="ref" defaultValue={sp.ref} className="input" placeholder="John 3:16-21" /><button className="btn btn-primary" type="submit">Go</button></div>{sp.ref && !parseRanges(sp.ref).length && <p className="mt-2 text-sm text-danger">That is not a recognised reference. Try &ldquo;Romans 8:1-11&rdquo;.</p>}</form>
        <form className="card card-pad" role="search"><input type="hidden" name="t" value={tr} /><label className="label" htmlFor="q">Search for a word or phrase</label><div className="flex gap-2"><input id="q" name="q" defaultValue={sp.q} className="input" placeholder="light of the world" minLength={3} /><button className="btn btn-primary" type="submit">Search</button></div></form>
      </div>
      {refResult.length > 0 && <div className="mb-8"><BibleText passages={refResult} /></div>}
      {found.length > 0 && <ul className="mb-8 space-y-2">{found.map((f) => <li key={f.ref} className="card p-3"><p className="text-sm font-bold text-navy">{f.ref}</p><p>{f.text}</p></li>)}</ul>}
      {sp.q && !found.length && <p className="mb-8 text-mist">No verses found for that search.</p>}
      {(["Law", "History", "Wisdom & Poetry", "Major Prophets", "Minor Prophets", "Gospels & Acts", "Pauline Letters", "General Letters & Revelation"]).map((g) => (
        <section key={g} className="mb-6"><h2 className="mb-2 text-lg font-bold">{g}</h2><ul className="flex flex-wrap gap-2">{BOOKS.filter((b) => b.group === g && (tr === "wlc" ? b.ot : tr === "tr" ? !b.ot : true)).map((b) => <li key={b.slug}><Link href={`/bible/${b.slug}/1?t=${tr}`} className="btn btn-ghost btn-sm">{b.name}</Link></li>)}</ul></section>
      ))}
      <p className="mt-6 text-xs text-mist">All translations shown are in the public domain. Additional translations can be added only after their licence has been verified.</p>
    </div>
  );
}

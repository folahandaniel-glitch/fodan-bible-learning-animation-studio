import type { Metadata } from "next";
import Link from "next/link";
import { publishedWings } from "@/server/services/site";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Ministry wings and programmes" };

export default async function Wings() {
  const wings = await publishedWings();
  return (
    <div className="container-page py-10">
      <PageHeader kicker="Fodan Gospel Outreach" title="Ministry wings and programmes" subtitle="CROP (Child Rescue Operation Programmes) is the children's wing of Fodan Gospel Outreach. Other wings and institutions are listed with the details the ministry has supplied." />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wings.map((w) => <li key={w.id}><Link href={`/wings/${w.slug}`} className="card card-hover block h-full p-5 no-underline"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-navy text-sm font-bold text-gold">{w.code}</span><div><h2 className="text-lg font-bold leading-tight">{w.name}</h2><p className="text-xs uppercase text-mist">{w.kind === "institution" ? "Institution" : "Wing"}{w.constituency ? ` · ${w.constituency}` : ""}</p></div></div><p className="mt-3 text-sm">{w.tagline}</p></Link></li>)}
      </ul>
    </div>
  );
}

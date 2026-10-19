import { asc, desc, isNull } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { getSetting, rawSetting } from "@/server/settings";
import { ActionForm, Check, Field, InlineAction, Select } from "@/components/forms";
import { logoPlacementAction, logoToggleAction, saveSettingAction, uploadLogoAction } from "@/app/actions/admin";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Branding and logos", robots: { index: false } };
const PLACES = ["homepage", "login", "register", "dashboard", "certificate", "exam", "printable", "report", "email"];
const TOKENS = [["favicon-svg", "Browser favicon (SVG)"], ["favicon-32", "Browser favicon 32x32 (PNG)"], ["favicon-ico", "Browser favicon (ICO)"], ["apple-180", "Apple touch icon 180x180"], ["pwa-192", "App icon 192x192"], ["pwa-512", "App icon 512x512"], ["pwa-maskable", "Maskable app icon 512x512"]];

export default async function Brand() {
  await requireAdmin("branding.edit");
  const db = await getDb();
  const [logos, brand, map, assets] = await Promise.all([
    db.select().from(schema.logos).orderBy(asc(schema.logos.collection), asc(schema.logos.kind), asc(schema.logos.variant)),
    getSetting("brand"), rawSetting<Record<string, { light?: string; dark?: string }>>("logoPlacements", {}),
    db.select({ id: schema.mediaAssets.id, filename: schema.mediaAssets.filename, kind: schema.mediaAssets.kind, size: schema.mediaAssets.size }).from(schema.mediaAssets).where(isNull(schema.mediaAssets.deletedAt)).orderBy(desc(schema.mediaAssets.createdAt)).limit(20),
  ]);
  const wings = await db.select({ slug: schema.ministryWings.slug, name: schema.ministryWings.name }).from(schema.ministryWings);
  const opt = (v: "light" | "dark") => [{ value: "", label: v === "dark" ? "Same as light" : "None" }, ...logos.filter((l) => l.active && l.kind !== "favicon" && l.kind !== "favicon-ico" && !l.kind.startsWith("app-icon")).map((l) => ({ value: l.id, label: l.name }))];
  return (
    <div className="space-y-8">
      <PageHeader title="Branding and logos" subtitle="Change logos, colours, names and icons here. Changes apply immediately; no code or redeploy is needed. (Phones that already installed the app may keep the old home-screen icon until it is reinstalled.)" />
      <section><h2 className="mb-2 text-xl font-bold">Logo library</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{logos.map((l) => (
          <li key={l.id} className="card card-pad">
            <div className="mb-2 grid grid-cols-3 gap-1"><div className="grid h-20 place-items-center rounded-lg bg-white p-1"><LogoImg id={l.id} /></div><div className="grid h-20 place-items-center rounded-lg bg-navy p-1"><LogoImg id={l.id} /></div><div className="grid h-20 place-items-center rounded-lg bg-[#fff8e7] p-1"><LogoImg id={l.id} small /></div></div>
            <p className="font-sans text-sm font-bold">{l.name}</p><p className="text-xs text-mist">{l.collection}{l.ministrySlug ? ` · ${l.ministrySlug}` : ""} · {l.kind} · {l.variant}</p>
            <div className="mt-1 flex flex-wrap gap-1">{!l.active && <StatusBadge status="deactivated" />}{l.isPrimary && <span className="badge badge-ok">Primary</span>}{l.isDefaultCrop && <span className="badge badge-ok">Default CROP</span>}{l.placements.map((p) => <span key={p} className="badge">{p}</span>)}</div>
            <div className="mt-2 flex flex-wrap gap-1"><InlineAction action={logoToggleAction} label={l.active ? "Deactivate" : "Activate"} hidden={{ id: l.id, action: l.active ? "deactivate" : "activate" }} confirm={l.active ? "Deactivate this logo? Pages fall back safely." : undefined} />{l.active && <InlineAction action={logoToggleAction} label="Make primary" hidden={{ id: l.id, action: "primary" }} />}{l.active && l.collection === "CROP" && <InlineAction action={logoToggleAction} label="Default CROP" hidden={{ id: l.id, action: "defaultcrop" }} />}</div>
          </li>))}</ul></section>
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Upload a logo or icon</h2>
        <ActionForm action={uploadLogoAction} submit="Upload" submitClass="btn btn-gold">
          <div><label className="label" htmlFor="logofile">File (SVG, PNG, JPEG or WebP, up to 2 MB)</label><input id="logofile" name="file" type="file" accept=".svg,.png,.jpg,.jpeg,.webp,image/*" required className="input" /><p className="hint">SVG files are cleaned automatically: scripts, event handlers and external references are removed.</p></div>
          <div className="grid gap-3 md:grid-cols-3"><Field label="Name" name="name" required /><Field label="Collection" name="collection" defaultValue="CROP" hint="Group logos, for example CROP or TLYI." /><Select label="Belongs to" name="ministrySlug" options={[{ value: "", label: "(none)" }, { value: "fodan-gospel-outreach", label: "Fodan Gospel Outreach" }, ...wings.map((w) => ({ value: w.slug, label: w.name }))]} />
            <Select label="Kind" name="kind" options={["horizontal", "stacked", "emblem", "compact", "print", "parent", "favicon", "app-icon"].map((k) => ({ value: k, label: k }))} /><Select label="Version" name="variant" options={[{ value: "light", label: "For light backgrounds" }, { value: "dark", label: "For dark backgrounds" }, { value: "mono", label: "Monochrome print" }, { value: "transparent", label: "Transparent background" }]} /></div>
          <fieldset><legend className="label">Replaces icon (newest active upload wins)</legend><div className="flex flex-wrap gap-4">{TOKENS.map(([t, n]) => <Check key={t} name="placements" value={t} label={n} />)}</div></fieldset>
          <p className="hint">Favicons should use the simplified emblem, not the full logo with text, so they stay readable at 16, 32 and 48 pixels.</p>
        </ActionForm></section>
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Where each logo appears</h2>
        <ActionForm action={logoPlacementAction} submit="Save placements" submitClass="btn btn-primary"><div className="grid gap-3 md:grid-cols-2">{PLACES.map((p) => <div key={p} className="rounded-xl bg-sand p-3"><p className="mb-2 font-bold capitalize">{p === "exam" ? "Examination screens" : p}</p><div className="grid gap-2 sm:grid-cols-2"><Select label="Light background" name={`${p}_light`} options={opt("light")} defaultValue={map[p]?.light ?? ""} /><Select label="Dark background" name={`${p}_dark`} options={opt("dark")} defaultValue={map[p]?.dark ?? ""} /></div></div>)}</div></ActionForm></section>
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Names and colours</h2>
        <ActionForm action={saveSettingAction.bind(null, "brand")} submit="Save" submitClass="btn btn-primary"><div className="grid gap-3 md:grid-cols-2"><Field label="Site name" name="siteName" defaultValue={brand.siteName} /><Field label="Short name" name="shortName" defaultValue={brand.shortName} /><Field label="Tagline" name="tagline" defaultValue={brand.tagline} /><Field label="Ministry" name="ministry" defaultValue={brand.ministry} /><Field label="Children's wing line" name="wing" defaultValue={brand.wing} /></div>
          <div className="grid gap-3 sm:grid-cols-5">{(["primary", "secondary", "accent", "leaf", "ivory"] as const).map((k) => <div key={k}><label className="label" htmlFor={`c-${k}`}>{k}</label><input id={`c-${k}`} name={k} type="color" defaultValue={brand[k]} className="h-11 w-full rounded-lg border border-line" /></div>)}</div>
          <p className="hint">Check that text stays readable on your colours: dark text on light backgrounds and light text on dark ones.</p></ActionForm></section>
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Recent uploaded files</h2><ul className="text-sm">{assets.map((a) => <li key={a.id} className="font-mono">{a.id} · {a.filename} · {a.kind} · {(a.size / 1024).toFixed(0)} KB</li>)}{!assets.length && <li className="text-mist">None yet.</li>}</ul><p className="hint mt-2">Use a file ID in an Image section of a page.</p></section>
    </div>
  );
}

function LogoImg({ id, small }: { id: string; small?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/api/logo/${id}`} alt="" className={small ? "max-h-6 max-w-full" : "max-h-full max-w-full"} loading="lazy" />;
}

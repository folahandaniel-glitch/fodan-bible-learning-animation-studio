import Link from "next/link";
import { requireAdmin } from "@/server/guards";
import { getSetting } from "@/server/settings";
import { PAGE_TEXT, UI_TEXT } from "@/server/page-text";
import { ActionForm, Field, TextArea } from "@/components/forms";
import { saveSettingAction } from "@/app/actions/admin";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Page text", robots: { index: false } };

export default async function PageTextAdmin() {
  await requireAdmin("site.edit");
  const saved = await getSetting("pageText");
  const ui = (await getSetting("uiText")) as Record<string, string>;
  const groups = [...new Set(Object.values(UI_TEXT).map((v) => v.group))];
  return (
    <div className="space-y-6">
      <PageHeader title="Page text" subtitle="The small heading, title and introduction at the top of each built-in public page. Leave a box empty to use the original wording." />
      <ActionForm action={saveSettingAction.bind(null, "pageText")} submit="Save page text">
        {Object.entries(PAGE_TEXT).map(([id, r]) => (
          <section key={id} className="card card-pad space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-bold">{r.label}</h2><Link href={r.path} className="text-sm" target="_blank">View page</Link></div>
            <div className="grid gap-3 md:grid-cols-2"><Field label="Small heading above the title" name={`${id}.kicker`} defaultValue={saved[id]?.kicker ?? ""} placeholder={r.defaults.kicker ?? ""} /><Field label="Title" name={`${id}.title`} defaultValue={saved[id]?.title ?? ""} placeholder={r.defaults.title} /></div>
            <TextArea label="Introduction" name={`${id}.subtitle`} rows={3} defaultValue={saved[id]?.subtitle ?? ""} placeholder={r.defaults.subtitle ?? ""} hint={r.vars} />
          </section>
        ))}
      </ActionForm>
      <PageHeader title="Buttons and short labels" subtitle="The words on the site header buttons and the sign-in screen. Leave a box empty to use the original wording." />
      <ActionForm action={saveSettingAction.bind(null, "uiText")} submit="Save labels">
        {groups.map((g) => (
          <section key={g} className="card card-pad space-y-3"><h2 className="text-lg font-bold">{g}</h2><div className="grid gap-3 md:grid-cols-2">{Object.entries(UI_TEXT).filter(([, v]) => v.group === g).map(([k, v]) => <Field key={k} label={v.label} name={k} defaultValue={ui[k] ?? ""} placeholder={v.def} />)}</div></section>
        ))}
      </ActionForm>
    </div>
  );
}

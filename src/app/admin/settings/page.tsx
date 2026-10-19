import { requireAdmin } from "@/server/guards";
import { getSetting } from "@/server/settings";
import { ActionForm, Check, Field, Select, TextArea } from "@/components/forms";
import { saveSettingAction } from "@/app/actions/admin";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Settings and menus", robots: { index: false } };

export default async function Settings() {
  await requireAdmin("site.edit");
  const [nav, footer, contact, social, f, terms, doctrine] = await Promise.all([getSetting("nav"), getSetting("footer"), getSetting("contact"), getSetting("social"), getSetting("features"), getSetting("terms"), getSetting("doctrine")]);
  return (
    <div className="space-y-6">
      <PageHeader title="Settings and menus" subtitle="Menus, footer, contact details, registration and access rules." />
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Main menu</h2><ActionForm action={saveSettingAction.bind(null, "nav")} submit="Save menu"><TextArea label="One link per line: Label | /address" name="lines" rows={8} defaultValue={nav.map((n) => `${n.label} | ${n.href}`).join("\n")} hint="Pages you create can be added to the menu from their own settings." /></ActionForm></section>
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Footer</h2><ActionForm action={saveSettingAction.bind(null, "footer")} submit="Save footer"><TextArea label="About text" name="about" rows={3} defaultValue={footer.about} /><TextArea label="Links: Label | /address (privacy, safeguarding, terms, subscription terms)" name="lines" rows={6} defaultValue={footer.links.map((l) => `${l.label} | ${l.href}`).join("\n")} /><Field label="Copyright holder" name="copyright" defaultValue={footer.copyright} /></ActionForm></section>
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Contact and social links</h2><ActionForm action={saveSettingAction.bind(null, "contact")} submit="Save contact"><div className="grid gap-3 md:grid-cols-2">{Object.entries(contact).map(([k, v]) => <Field key={k} label={k[0].toUpperCase() + k.slice(1)} name={k} defaultValue={String(v)} />)}</div></ActionForm>
        <div className="mt-6"><ActionForm action={saveSettingAction.bind(null, "social")} submit="Save social links"><div className="grid gap-3 md:grid-cols-2">{Object.entries(social).map(([k, v]) => <Field key={k} label={k[0].toUpperCase() + k.slice(1)} name={k} defaultValue={String(v)} placeholder="https://" />)}</div></ActionForm></div></section>
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Registration, sign-in and access rules</h2>
        <ActionForm action={saveSettingAction.bind(null, "features")} submit="Save rules"><fieldset><legend className="label">Registration open for</legend><div className="flex flex-wrap gap-4"><Check name="r_student" label="Students" defaultChecked={f.registrationOpen.student} /><Check name="r_parent" label="Parents" defaultChecked={f.registrationOpen.parent} /><Check name="r_teacher" label="Teachers" defaultChecked={f.registrationOpen.teacher} /><Check name="r_org_admin" label="Churches and schools" defaultChecked={f.registrationOpen.org_admin} /></div></fieldset>
          <div className="grid gap-3 md:grid-cols-2"><Select label="Sign in with" name="loginMode" defaultValue={f.loginMode} options={[{ value: "both", label: "Username or email" }, { value: "email", label: "Email only" }, { value: "username", label: "Username only" }]} /><Field label="Grace period after a plan ends (days)" name="graceDays" type="number" defaultValue={f.graceDays} hint="0 locks paid features the moment the plan ends." /></div>
          <Check name="bibleReaderPublic" label="Anyone can read the Bible text without signing in" defaultChecked={f.bibleReaderPublic} />
          <Check name="teacherRequiresSubscription" label="Approved teachers also need a plan to use teaching content" defaultChecked={f.teacherRequiresSubscription} />
          <Check name="requireReviewBeforePublish" label="Lessons can be published only after the theological review is approved" defaultChecked={f.requireReviewBeforePublish} /></ActionForm></section>
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Terms of the school year</h2><ActionForm action={saveSettingAction.bind(null, "terms")} submit="Save terms"><TextArea label="One term per line (up to 6)" name="lines" rows={4} defaultValue={terms.map((t) => t.name).join("\n")} hint="Topics already keep their term number." /></ActionForm></section>
      <section className="card card-pad"><h2 className="mb-2 text-lg font-bold">Doctrinal position</h2><ActionForm action={saveSettingAction.bind(null, "doctrine")} submit="Save"><TextArea label="The ministry's approved doctrinal position (shown to reviewers)" name="position" rows={5} defaultValue={doctrine.position} /></ActionForm></section>
    </div>
  );
}

import { desc } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { emailConfigured } from "@/server/services/email";
import { EMAIL_DEFAULTS } from "@/content/email-defaults";
import { ActionForm, Field, TextArea } from "@/components/forms";
import { saveEmailTemplateAction, testEmailAction } from "@/app/actions/admin";
import { Alert, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "E-mail templates", robots: { index: false } };

export default async function Emails() {
  await requireAdmin("emails.edit");
  const db = await getDb();
  const [tpl, outbox] = await Promise.all([db.select().from(schema.emailTemplates), db.select({ id: schema.emailOutbox.id, to: schema.emailOutbox.toEmail, key: schema.emailOutbox.templateKey, subject: schema.emailOutbox.subject, status: schema.emailOutbox.status, error: schema.emailOutbox.error, at: schema.emailOutbox.createdAt }).from(schema.emailOutbox).orderBy(desc(schema.emailOutbox.createdAt)).limit(25)]);
  return (
    <div className="space-y-6">
      <PageHeader title="E-mail templates" subtitle="Branded messages for registration, password reset, payments, teacher approval and notices. Use {{variable}} placeholders." />
      {!emailConfigured() ? <Alert tone="warn">E-mail is <strong>not configured</strong>. Messages are held in the outbox below and are never reported as sent. Set RESEND_API_KEY and RESEND_FROM_EMAIL (a sending address on a domain verified in Resend), then send a test.</Alert> : <Alert tone="info">Keys are present. Delivery is only proven when a test message reaches an inbox. Send one now.</Alert>}
      <section className="card card-pad max-w-xl"><h2 className="mb-2 text-lg font-bold">Send a test message</h2><ActionForm action={testEmailAction} submit="Send test" submitClass="btn btn-primary btn-sm"><Field label="Send to" name="to" type="email" required /></ActionForm></section>
      {tpl.map((t) => (
        <details key={t.key} className="card card-pad"><summary className="cursor-pointer font-bold text-navy">{t.name} <span className="font-normal text-mist">({t.key})</span></summary>
          <div className="mt-3"><ActionForm action={saveEmailTemplateAction} submit="Save template" submitClass="btn btn-primary btn-sm"><input type="hidden" name="key" value={t.key} /><Field label="Subject" name="subject" defaultValue={t.subject} /><TextArea label="Message" name="body" rows={7} defaultValue={t.body} hint={`Variables: ${(EMAIL_DEFAULTS.find((d) => d.key === t.key)?.vars ?? []).map((v) => `{{${v}}}`).join(", ")}, {{siteName}}`} /></ActionForm></div></details>
      ))}
      <section><h2 className="mb-2 text-lg font-bold">Outbox (latest 25)</h2><div className="card overflow-x-auto"><table className="table"><thead><tr><th>When</th><th>To</th><th>Template</th><th>Status</th></tr></thead><tbody>{outbox.map((o) => <tr key={o.id}><td>{o.at.toLocaleString()}</td><td>{o.to}</td><td>{o.key}</td><td><StatusBadge status={o.status} />{o.error && <div className="text-xs text-danger">{o.error}</div>}</td></tr>)}{!outbox.length && <tr><td colSpan={4} className="text-mist">No messages yet.</td></tr>}</tbody></table></div><p className="mt-2 text-xs text-mist">Messages containing one-time links (password reset, verification) are never stored here, so administrators cannot read them.</p></section>
    </div>
  );
}

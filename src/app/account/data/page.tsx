import Link from "next/link";
import { requireUser } from "@/server/guards";
import { ActionForm, TextArea } from "@/components/forms";
import { requestDataAction } from "@/app/actions/auth";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "My data and privacy" };

export default async function DataPage() {
  await requireUser(undefined, { allowPending: true });
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="My data and privacy" subtitle="You can see what we hold, take a copy and ask us to delete your account." />
      <section className="card card-pad"><h2 className="text-lg font-bold">Download my data</h2><p className="mb-3 text-sm text-mist">A JSON file with your account details, consents, progress, results and payments. It never includes your password.</p><Link className="btn btn-primary" href="/account/data/export" prefetch={false}>Download my data</Link></section>
      <section className="card card-pad"><h2 className="text-lg font-bold">Ask for my account to be deleted</h2><p className="mb-3 text-sm text-mist">An administrator will confirm with you. Payment records may be kept as the law requires; children&apos;s learning records are removed.</p><ActionForm action={requestDataAction.bind(null, "deletion")} submit="Request deletion" submitClass="btn btn-danger" confirm="Ask for your account to be deleted?"><TextArea label="Anything we should know? (optional)" name="note" rows={3} maxLength={500} /></ActionForm></section>
      <p className="text-sm text-mist">Read the <Link href="/p/privacy">privacy notice</Link> and the <Link href="/p/safeguarding">child safeguarding policy</Link>.</p>
    </div>
  );
}

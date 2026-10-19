import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUser } from "@/server/guards";
import { getDb, schema } from "@/server/db";
import { getResult } from "@/server/services/exams";
import { Logo } from "@/components/ui";
import { getSetting } from "@/server/settings";

export const metadata = { title: "Certificate", robots: { index: false } };

export default async function Certificate({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireUser(["student"]);
  const r = await getResult(user, attemptId);
  if (!r || !r.released || !r.passed || r.attempt.userId !== user.id || r.exam.kind === "quiz") notFound();
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
  const brand = await getSetting("brand");
  return (
    <main className="mx-auto max-w-3xl p-4">
      <div className="print-page border-[10px] border-double border-gold bg-ivory p-8 text-center">
        <Logo placement="certificate" className="mx-auto h-24 w-auto" />
        <p className="mt-4 text-xs font-bold uppercase tracking-[.3em] text-gold-700">Certificate of achievement</p>
        <h1 className="mt-2 text-4xl font-bold">{u.fullName}</h1>
        <p className="mt-3">has successfully completed</p>
        <h2 className="mt-1 text-2xl font-bold">{r.exam.title}</h2>
        <p className="mt-3">with a score of <strong>{r.attempt.percent}%</strong></p>
        <p className="mt-6 text-sm text-mist">{brand.siteName} · {brand.ministry} · {r.attempt.submittedAt?.toDateString()}</p>
        <p className="mt-1 text-xs text-mist">Certificate reference: {attemptId.slice(0, 8).toUpperCase()}</p>
      </div>
      <p className="no-print mt-4 text-center text-sm text-mist">Use your browser&apos;s Print command (Ctrl+P) to print or save as PDF.</p>
    </main>
  );
}

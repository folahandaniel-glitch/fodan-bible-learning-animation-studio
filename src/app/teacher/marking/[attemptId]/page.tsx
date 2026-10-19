import { notFound } from "next/navigation";
import { requireUser } from "@/server/guards";
import { manualMarkingView } from "@/server/services/exams";
import { ActionForm, Field, TextArea } from "@/components/forms";
import { manualMarkAction } from "@/app/actions/teaching";
import { Crumbs, PageHeader } from "@/components/ui";

export const metadata = { title: "Mark answers", robots: { index: false } };

export default async function MarkOne({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireUser(["teacher", "org_admin", "super_admin", "curriculum_admin"]);
  const v = await manualMarkingView({ id: user.id, role: user.role, orgId: user.orgId, status: user.status, classLevelSlug: null }, attemptId);
  if (!v) notFound();
  return (
    <div className="max-w-3xl space-y-5">
      <Crumbs items={[{ href: "/teacher/marking", label: "Marking" }, { label: v.exam.title }]} />
      <PageHeader title={v.exam.title} subtitle="Mark each written answer. The learner sees the total once every answer is marked." />
      {v.items.map(({ q, resp }) => (
        <section key={q.id} className="card card-pad">
          <h2 className="font-sans text-base font-bold">{q.text}</h2>
          {q.rubric && <p className="mt-1 rounded-lg bg-sand p-2 text-sm"><strong>Marking guide:</strong> {q.rubric}</p>}
          <p className="mt-2 whitespace-pre-line rounded-lg border border-line bg-white p-3">{(Array.isArray(resp?.answer) ? resp?.answer.join(", ") : resp?.answer) || "(no answer given)"}</p>
          <ActionForm action={manualMarkAction.bind(null, attemptId, q.id)} submit="Save marks" className="mt-3 space-y-2">
            <Field label={`Marks (out of ${q.marks})`} name="marks" type="number" defaultValue={resp?.marks ?? 0} required />
            <TextArea label="Feedback to the learner (optional)" name="feedback" rows={2} defaultValue={resp?.feedback ?? ""} />
          </ActionForm>
        </section>
      ))}
      {!v.items.length && <p className="text-mist">No written answers in this attempt.</p>}
    </div>
  );
}

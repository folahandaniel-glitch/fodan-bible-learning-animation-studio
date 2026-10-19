import { requireUser } from "@/server/guards";
import { trainingStatus } from "@/server/services/teaching";
import { InlineAction } from "@/components/forms";
import { trainingAction } from "@/app/actions/teaching";
import { Markdown } from "@/components/markdown";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Teacher training" };

export default async function Training() {
  const user = await requireUser(["teacher"]);
  const mods = await trainingStatus(user.id);
  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="Teacher training" subtitle="Short modules for Sunday School teachers. Complete the safeguarding module before working with learners." />
      {mods.map((m) => (
        <details key={m.id} className="card px-4 py-3" open={m.slug === "safeguarding" && !m.done}>
          <summary className="flex cursor-pointer items-center justify-between gap-2 font-bold text-navy"><span>{m.title}</span>{m.done ? <span className="badge badge-ok">✓ Completed</span> : <span className="badge badge-warn">To do</span>}</summary>
          <p className="mt-1 text-sm text-mist">{m.summary}</p>
          <div className="mt-3"><Markdown source={m.body} /></div>
          {!m.done && <div className="mt-3"><InlineAction action={trainingAction.bind(null, m.id)} label="I have read this: mark complete" className="btn btn-primary btn-sm" /></div>}
        </details>
      ))}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";
import { ENTITIES } from "@/lib/admin-entities";
import { DeleteRecord, RecordForm } from "@/components/record-form";
import { PageHeader } from "@/components/ui";
import { money } from "@/server/services/payments";

type Rec = Record<string, unknown>;
export const metadata = { title: "Manage records", robots: { index: false } };

async function load(table: string, order?: string): Promise<Rec[]> {
  const db = await getDb();
  const t = (schema as unknown as Record<string, Record<string, never>>)[table];
  const col = order ? t[order] : t.createdAt ?? t.id;
  const dir = order ? asc : desc;
  return (await db.select().from(t as never).orderBy(dir(col as never))) as Rec[];
}

const show = (v: unknown, key: string, rec: Rec) => {
  if (v instanceof Date) return v.toLocaleString();
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (key === "priceMinor") return Number(v) > 0 ? money(Number(v), String(rec.currency ?? "NGN")) : "No price yet";
  if (Array.isArray(v)) return v.join(", ");
  return v == null ? "" : String(v).slice(0, 90);
};

export default async function DataPage({ params, searchParams }: { params: Promise<{ entity: string }>; searchParams: Promise<{ edit?: string; new?: string }> }) {
  const { entity } = await params;
  const sp = await searchParams;
  const spec = ENTITIES[entity];
  if (!spec) notFound();
  await requireAdmin(spec.perm);
  const rows = await load(spec.table, spec.order);
  const editing = sp.edit ? rows.find((r) => r.id === sp.edit) : undefined;
  void eq;
  return (
    <div className="space-y-6">
      <PageHeader title={spec.label} subtitle={spec.intro} actions={spec.create ? <Link className="btn btn-gold" href={`/admin/data/${entity}?new=1`}>New</Link> : undefined} />
      {(sp.new || editing) && (
        <section className="card card-pad"><h2 className="mb-3 text-lg font-bold">{editing ? "Edit" : "Create"}</h2>
          <RecordForm spec={spec} record={editing} id={editing ? String(editing.id) : null} />
          <p className="mt-3"><Link href={`/admin/data/${entity}`} className="text-sm">Close</Link></p></section>
      )}
      <div className="card overflow-x-auto"><table className="table"><thead><tr>{spec.columns.map((c) => <th key={c}>{c.replace(/([A-Z])/g, " $1")}</th>)}<th /></tr></thead>
        <tbody>{rows.map((r) => <tr key={String(r.id)}>{spec.columns.map((c) => <td key={c}>{show(r[c], c, r)}</td>)}<td className="space-x-2 whitespace-nowrap"><Link className="btn btn-ghost btn-sm" href={`/admin/data/${entity}?edit=${r.id}`}>Edit</Link>{spec.remove !== "none" && <DeleteRecord entity={entity} id={String(r.id)} label={spec.remove === "archive" ? "Hide" : "Delete"} />}</td></tr>)}
          {!rows.length && <tr><td colSpan={spec.columns.length + 1} className="text-mist">Nothing here yet.</td></tr>}</tbody></table></div>
    </div>
  );
}

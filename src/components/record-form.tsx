"use client";
import { ActionForm, Check, Field, InlineAction, Select, TextArea } from "./forms";
import { deleteRecordAction, saveRecordAction } from "@/app/actions/records";
import type { EntitySpec } from "@/lib/admin-entities";
import { useId } from "react";

type Rec = Record<string, unknown>;

export function RecordForm({ spec, record, id }: { spec: EntitySpec; record?: Rec; id?: string | null }) {
  const uid = useId();
  return (
    <ActionForm action={saveRecordAction.bind(null, spec.key, id ?? null)} submit={id ? "Save changes" : "Create"} submitClass="btn btn-primary">
      <div className="grid gap-4 md:grid-cols-2">
        {spec.fields.map((f) => {
          const v = record?.[f.name];
          const full = f.kind === "textarea" || f.kind === "lines" || f.kind === "multi";
          const wrap = (n: React.ReactNode) => <div key={f.name} className={full ? "md:col-span-2" : ""}>{n}</div>;
          if (f.kind === "bool") return wrap(<Check name={f.name} label={f.label} defaultChecked={id ? !!v : f.name === "active"} />);
          if (f.kind === "textarea") return wrap(<TextArea label={f.label} name={f.name} defaultValue={v == null ? "" : String(v)} rows={f.name === "body" ? 8 : 4} hint={f.hint} required={f.required} />);
          if (f.kind === "lines") return wrap(<TextArea label={f.label} name={f.name} defaultValue={Array.isArray(v) ? (v as string[]).join("\n") : ""} rows={4} hint={f.hint} />);
          if (f.kind === "select") return wrap(<Select label={f.label} name={f.name} options={f.options ?? []} defaultValue={v == null ? undefined : String(v)} hint={f.hint} />);
          if (f.kind === "multi") return wrap(<fieldset><legend className="label">{f.label}</legend><div className="flex flex-wrap gap-4">{(f.options ?? []).map((o) => <Check key={o.value} name={f.name} value={o.value} label={o.label} defaultChecked={Array.isArray(v) ? (v as string[]).includes(o.value) : !id} />)}</div></fieldset>);
          if (f.kind === "money") return wrap(<Field label={f.label} name={f.name} type="number" required={f.required} defaultValue={typeof v === "number" ? v / 100 : 0} hint={f.hint} />);
          if (f.kind === "number") return wrap(<Field label={f.label} name={f.name} type="number" required={f.required} defaultValue={v == null ? "" : Number(v)} hint={f.hint} />);
          if (f.kind === "datetime") return wrap(<Field label={f.label} name={f.name} type="datetime-local" defaultValue={v instanceof Date ? new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : typeof v === "string" ? v.slice(0, 16) : ""} />);
          return wrap(<Field label={f.label} name={f.name} required={f.required} defaultValue={v == null ? "" : String(v)} hint={f.hint} />);
        })}
      </div>
      <span id={uid} className="sr-only">Form</span>
    </ActionForm>
  );
}

export function DeleteRecord({ entity, id, label }: { entity: string; id: string; label: string }) {
  return <InlineAction action={deleteRecordAction.bind(null, entity)} label={label} hidden={{ id }} confirm="Are you sure?" />;
}

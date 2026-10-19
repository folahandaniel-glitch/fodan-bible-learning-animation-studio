"use client";
import { useActionState, useId, useMemo, useState, type ReactNode } from "react";

export type ActionResult = { ok?: boolean; error?: string; message?: string } | null;
type Action = (prev: ActionResult, form: FormData) => Promise<ActionResult>;

export function ActionForm({ action, children, submit = "Save", className = "space-y-4", submitClass = "btn btn-primary", footer, confirm }: { action: Action; children: ReactNode; submit?: string; className?: string; submitClass?: string; footer?: ReactNode; confirm?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={className} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {state?.error && <div role="alert" className="alert alert-error">{state.error}</div>}
      {state?.ok && state.message && <div role="status" className="alert alert-ok">{state.message}</div>}
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={submitClass} disabled={pending} aria-busy={pending}>{pending ? "Please wait…" : submit}</button>
        {footer}
      </div>
    </form>
  );
}

/** Small inline form button for table actions (approve, revoke, delete …). */
export function InlineAction({ action, label, className = "btn btn-ghost btn-sm", confirm, hidden = {}, children }: { action: Action; label: string; className?: string; confirm?: string; hidden?: Record<string, string>; children?: ReactNode }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="inline-flex flex-wrap items-center gap-2" onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      <button type="submit" className={className} disabled={pending}>{pending ? "…" : label}</button>
      {state?.error && <span role="alert" className="text-xs text-danger">{state.error}</span>}
      {state?.ok && state.message && <span role="status" className="text-xs text-leaf">{state.message}</span>}
    </form>
  );
}

export function Field({ label, name, type = "text", required, hint, defaultValue, autoComplete, placeholder, maxLength, pattern, inputMode, minLength }: { label: string; name: string; type?: string; required?: boolean; hint?: string; defaultValue?: string | number; autoComplete?: string; placeholder?: string; maxLength?: number; pattern?: string; inputMode?: "text" | "numeric" | "email" | "tel"; minLength?: number }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">{label}{required && <span aria-hidden className="text-danger"> *</span>}</label>
      <input id={id} name={name} type={type} required={required} defaultValue={defaultValue} autoComplete={autoComplete} placeholder={placeholder} maxLength={maxLength} pattern={pattern} inputMode={inputMode} minLength={minLength} className="input" aria-describedby={hint ? `${id}-h` : undefined} />
      {hint && <p id={`${id}-h`} className="hint">{hint}</p>}
    </div>
  );
}

export function TextArea({ label, name, defaultValue, rows = 5, hint, required, maxLength }: { label: string; name: string; defaultValue?: string; rows?: number; hint?: string; required?: boolean; maxLength?: number }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <textarea id={id} name={name} rows={rows} defaultValue={defaultValue} required={required} maxLength={maxLength} className="input" aria-describedby={hint ? `${id}-h` : undefined} />
      {hint && <p id={`${id}-h`} className="hint">{hint}</p>}
    </div>
  );
}

export function Select({ label, name, options, defaultValue, required, hint }: { label: string; name: string; options: { value: string; label: string }[]; defaultValue?: string; required?: boolean; hint?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} name={name} defaultValue={defaultValue} required={required} className="input">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function Check({ name, label, defaultChecked, required, value = "on" }: { name: string; label: ReactNode; defaultChecked?: boolean; required?: boolean; value?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-start gap-3 text-sm">
      <input id={id} type="checkbox" name={name} value={value} defaultChecked={defaultChecked} required={required} className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-royal)]" />
      <span>{label}</span>
    </label>
  );
}

/** Score 0-4 for the strength hint only. The server is the authority on what is acceptable. */
function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export function PasswordInput({ label = "Password", name = "password", autoComplete = "current-password", showStrength = false, hint, required = true, minLength }: { label?: string; name?: string; autoComplete?: "current-password" | "new-password"; showStrength?: boolean; hint?: string; required?: boolean; minLength?: number }) {
  const id = useId();
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");
  const sc = useMemo(() => strength(value), [value]);
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  const colours = ["#b42318", "#b42318", "#c98a12", "#14877a", "#0b6b5d"];
  return (
    <div>
      <label htmlFor={id} className="label">{label}{required && <span aria-hidden className="text-danger"> *</span>}</label>
      <div className="relative">
        <input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required={required} minLength={minLength} value={value} onChange={(e) => setValue(e.target.value)} className="input pr-24" aria-describedby={`${id}-h`} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-controls={id} aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} className="absolute right-1 top-1 h-10 rounded-lg px-3 text-sm font-semibold text-royal hover:bg-[#eef3ff]">
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {showStrength && value && (
        <div className="mt-2" aria-live="polite">
          <div className="flex gap-1" aria-hidden>{[0, 1, 2, 3].map((i) => <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < sc ? colours[sc] : "#e8e1c8" }} />)}</div>
          <p className="hint" style={{ color: colours[sc] }}>Strength: {labels[sc]}</p>
        </div>
      )}
      <p id={`${id}-h`} className="hint">{hint ?? (showStrength ? "Use a mix of letters and numbers. Longer is stronger." : "")}</p>
    </div>
  );
}

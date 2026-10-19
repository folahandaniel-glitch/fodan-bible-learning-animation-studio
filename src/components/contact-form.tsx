"use client";
import { ActionForm, Field, TextArea } from "./forms";
import { contactAction } from "@/app/actions/public";

export function ContactForm() {
  return (
    <ActionForm action={contactAction} submit="Send message">
      <Field label="Your name" name="name" required autoComplete="name" maxLength={100} />
      <Field label="Email address" name="email" type="email" required autoComplete="email" maxLength={160} />
      <Field label="Subject" name="subject" maxLength={160} />
      <TextArea label="Message" name="message" required maxLength={3000} rows={5} />
      <div className="hidden" aria-hidden><label>Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <p className="hint">We use your details only to reply. Please do not include a child&apos;s private information.</p>
    </ActionForm>
  );
}

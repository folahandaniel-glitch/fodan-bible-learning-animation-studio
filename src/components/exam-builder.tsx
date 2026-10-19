"use client";
import { ActionForm, Check, Field, Select, TextArea } from "./forms";
import { createExamAction } from "@/app/actions/teaching";

export function ExamBuilder({ classes, groups, admin }: { classes: { slug: string; name: string }[]; groups: { id: string; name: string }[]; admin: boolean }) {
  return (
    <ActionForm action={createExamAction} submit="Create exam (draft)" submitClass="btn btn-primary">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" name="title" required maxLength={120} />
        <Select label="Type" name="kind" options={[{ value: "practice", label: "Practice test" }, { value: "topic_quiz", label: "Topic quiz" }, { value: "class_test", label: "Class test" }, { value: "term_exam", label: "Term examination" }, { value: "mock", label: "Mock examination" }, { value: "competition", label: "Bible knowledge competition" }, { value: "revision", label: "Timed revision" }, { value: "comprehensive", label: "Genesis-to-Revelation exam" }]} />
        <Select label="Class level of questions" name="classLevelSlug" options={[{ value: "", label: "Any class" }, ...classes.map((c) => ({ value: c.slug, label: c.name }))]} />
        <Select label="Assign to one of your classes (optional)" name="groupId" options={[{ value: "", label: "Not restricted to one class" }, ...groups.map((g) => ({ value: g.id, label: g.name }))]} />
        <Field label="Topic filter (optional)" name="topic" hint="Matches the topic or tag on questions, e.g. Gospels, Genesis." />
        <Field label="Tag filter (optional)" name="tag" />
        <Field label="Number of questions" name="count" type="number" defaultValue={10} />
        <Field label="Time allowed (minutes)" name="durationMin" type="number" defaultValue={20} />
        <Field label="Attempts allowed (0 = unlimited)" name="maxAttempts" type="number" defaultValue={1} />
        <Field label="Pass mark (%)" name="passMark" type="number" defaultValue={50} />
        <Field label="Opens (optional)" name="opensAt" type="datetime-local" />
        <Field label="Closes (optional)" name="closesAt" type="datetime-local" />
        <Select label="Release results" name="release" options={[{ value: "immediate", label: "Immediately after marking" }, { value: "after_close", label: "After the exam closes" }, { value: "manual", label: "When I release them" }]} />
      </div>
      <TextArea label="Instructions for learners (optional)" name="description" rows={2} />
      <div className="flex flex-wrap gap-5">
        <Check name="shuffleQuestions" label="Shuffle question order" defaultChecked />
        <Check name="shuffleOptions" label="Shuffle answer options" defaultChecked />
        <Check name="explanations" label="Show explanations after results" defaultChecked />
        {admin && <Check name="isFree" label="Free for everyone (no plan needed)" />}
      </div>
    </ActionForm>
  );
}

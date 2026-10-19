import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "CBT examinations and competitions" };

export default function ExamsInfo() {
  return (
    <div className="container-page max-w-3xl py-10">
      <PageHeader kicker="CBT Centre" title="CBT examinations and competitions" subtitle="A computer-based testing centre built for Bible knowledge." />
      <div className="prose-fbl">
        <h2>How exams work</h2>
        <ul><li>Timed exams with a server-controlled clock and an on-screen countdown.</li><li>Questions and answer options can be shuffled; the answer key never reaches the browser while you take the exam.</li><li>Answers save automatically and survive a short loss of connection.</li><li>Objective questions are marked by the server; essays and short answers are marked by teachers.</li><li>Explanations and results appear according to the teacher&apos;s release settings.</li></ul>
        <h2>Exam types</h2>
        <p>Practice tests, topic quizzes, class tests, term and mock examinations, Bible knowledge competitions, church-level competitions, timed revision and comprehensive Genesis-to-Revelation exams.</p>
        <h2>Question types</h2>
        <p>Multiple choice, true or false, multiple select, fill in the blank, short answer and essay. Teachers can import questions from Word, CSV or Excel files, including the ★ marker for correct answers.</p>
      </div>
      <p className="mt-6 flex gap-3"><Link className="btn btn-gold" href="/register/student">Register</Link><Link className="btn btn-ghost" href="/plans">Plans</Link></p>
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/guards";
import { getTakeView } from "@/server/services/exams";
import { ExamRunner } from "@/components/exam-runner";

export const metadata = { title: "Examination", robots: { index: false } };

export default async function Take({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireUser(["student"]);
  const v = await getTakeView(user.id, attemptId);
  if (!v) notFound();
  if ("finished" in v) redirect(`/results/${attemptId}`);
  return <ExamRunner attemptId={v.attemptId} title={v.examTitle} questions={v.questions} remainingMs={v.remainingMs} />;
}

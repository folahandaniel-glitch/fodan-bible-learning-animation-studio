import { asc } from "drizzle-orm";
import { requireUser } from "@/server/guards";
import { getDb, schema } from "@/server/db";
import { QuestionImporter } from "@/components/question-importer";
import { Crumbs, PageHeader } from "@/components/ui";

export const metadata = { title: "Import questions" };

export default async function ImportQuestions() {
  await requireUser(["teacher", "org_admin"]);
  const db = await getDb();
  const classes = await db.select({ slug: schema.classLevels.slug, name: schema.classLevels.name }).from(schema.classLevels).orderBy(asc(schema.classLevels.sort));
  return (
    <div className="max-w-4xl">
      <Crumbs items={[{ href: "/teacher/exams", label: "Exams" }, { label: "Import questions" }]} />
      <PageHeader title="Import questions" subtitle="Upload a Word, Excel, CSV or text file. You will see a preview and can correct anything before saving. Questions you import are visible only to your own church or school." />
      <QuestionImporter classes={classes} admin={false} />
    </div>
  );
}

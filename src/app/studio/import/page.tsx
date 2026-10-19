import { requireUser } from "@/server/guards";
import { DocxImporter } from "@/components/docx-importer";
import { Crumbs, PageHeader } from "@/components/ui";

export const metadata = { title: "Import a Word document" };

export default async function ImportPage() {
  await requireUser(["teacher", "super_admin", "curriculum_admin", "content_editor"]);
  return (
    <div className="max-w-4xl">
      <Crumbs items={[{ href: "/studio", label: "Studio" }, { label: "Import" }]} />
      <PageHeader title="Import a Word document" subtitle="Headings become scenes. Paragraphs, lists, tables, images, captions and Bible references are kept where possible. You always see a preview first." />
      <DocxImporter />
    </div>
  );
}

import type { Metadata } from "next";
import { publishedFaqs } from "@/server/services/site";
import { SitePageHeader } from "@/components/site-page-header";

export const metadata: Metadata = { title: "Frequently asked questions" };

export default async function Faq() {
  const faqs = await publishedFaqs();
  const cats = [...new Set(faqs.map((f) => f.category))];
  return (
    <div className="container-page max-w-3xl py-10">
      <SitePageHeader id="faq" />
      {cats.map((c) => (
        <section key={c} className="mb-6"><h2 className="mb-2 text-xl font-bold">{c}</h2>
          <div className="space-y-2">{faqs.filter((f) => f.category === c).map((f) => <details key={f.id} className="card px-4 py-3"><summary className="cursor-pointer font-semibold text-navy">{f.question}</summary><p className="mt-2">{f.answer}</p></details>)}</div>
        </section>
      ))}
    </div>
  );
}

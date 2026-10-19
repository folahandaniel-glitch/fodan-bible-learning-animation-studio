import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { PageHeader } from "@/components/ui";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Contact and support" };

export default async function Contact() {
  const c = await getSetting("contact");
  return (
    <div className="container-page max-w-3xl py-10">
      <PageHeader title="Contact and support" subtitle="Questions about registration, payment, teaching or safeguarding? Write to us. For an urgent child-protection concern, contact your church's safeguarding lead and local authorities first." />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card card-pad"><ContactForm /></div>
        <div className="card card-pad space-y-2 text-sm"><h2 className="text-lg font-bold">Other ways to reach us</h2>{c.email && <p>Email: <a href={`mailto:${c.email}`}>{c.email}</a></p>}{c.phone && <p>Phone: {c.phone}</p>}{c.whatsapp && <p><a href={`https://wa.me/${c.whatsapp}`} rel="noopener noreferrer" target="_blank">Message on WhatsApp</a></p>}{c.hours && <p>Hours: {c.hours}</p>}{c.address && <p>{c.address}</p>}</div>
      </div>
    </div>
  );
}

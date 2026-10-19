import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requireUser } from "@/server/guards";
import { getDb, schema } from "@/server/db";
import { Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Notifications" };

export default async function Notifications() {
  const user = await requireUser(undefined, { allowPending: true });
  const db = await getDb();
  const rows = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, user.id)).orderBy(desc(schema.notifications.createdAt)).limit(50);
  await db.update(schema.notifications).set({ readAt: new Date() }).where(and(eq(schema.notifications.userId, user.id), isNull(schema.notifications.readAt)));
  return (
    <div className="max-w-2xl">
      <PageHeader title="Notifications" />
      {rows.length ? <ul className="space-y-2">{rows.map((n) => <li key={n.id} className={`card p-4 ${n.readAt ? "" : "border-gold bg-ivory"}`}><p className="font-bold">{n.title}</p>{n.body && <p className="text-sm text-mist">{n.body}</p>}<p className="mt-1 text-xs text-mist">{n.createdAt.toLocaleString()}{n.href && <> · <Link href={n.href}>Open</Link></>}</p></li>)}</ul> : <Empty title="No notifications yet">Payment confirmations, assignments and reminders will appear here.</Empty>}
    </div>
  );
}

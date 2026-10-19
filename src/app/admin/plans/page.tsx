import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/guards";

export default async function PlansRedirect() {
  await requireAdmin("plans.manage");
  redirect("/admin/data/plans");
}

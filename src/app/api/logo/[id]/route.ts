import { logoById, serveLogoRow } from "@/server/logo-serve";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const l = await logoById(id);
  if (!l) return new Response("Not found", { status: 404 });
  return serveLogoRow(l);
}

import { iconByToken, serveLogoRow } from "@/server/logo-serve";

export const dynamic = "force-dynamic";
const TOKENS = new Set(["favicon-svg", "favicon-32", "favicon-ico", "apple-180", "pwa-192", "pwa-512", "pwa-maskable"]);

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!TOKENS.has(token)) return new Response("Not found", { status: 404 });
  const l = await iconByToken(token);
  if (!l) return new Response("Not found", { status: 404 });
  return serveLogoRow(l);
}

import { handleWebhook } from "@/server/services/payments";

export const dynamic = "force-dynamic";

/** Payment provider webhook. Authenticity comes from the provider's signature over the raw body, never from the URL. */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const raw = await req.text();
  if (raw.length > 200_000) return new Response("too large", { status: 413 });
  const res = await handleWebhook(provider, raw, req.headers);
  return new Response(res.body, { status: res.status });
}

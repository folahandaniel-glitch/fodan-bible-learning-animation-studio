import { getAsset } from "@/server/services/media";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const a = await getAsset(id);
  if (!a) return new Response("Not found", { status: 404 });
  if (!a.isPublic) {
    const s = await getSession();
    if (!s) return new Response("Sign in to view this file.", { status: 401 });
  }
  return new Response(new Uint8Array(a.data), {
    headers: {
      "Content-Type": a.mime, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": a.isPublic ? "public, max-age=3600" : "private, max-age=600", "Content-Disposition": "inline",
    },
  });
}

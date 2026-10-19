import { iconByToken, serveLogoRow } from "@/server/logo-serve";

export const dynamic = "force-dynamic";

export async function GET() {
  const l = (await iconByToken("favicon-ico")) ?? (await iconByToken("favicon-32"));
  if (!l) return new Response("Not found", { status: 404 });
  return serveLogoRow(l);
}

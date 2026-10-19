import type { ReactNode } from "react";
import Link from "next/link";

/** Small, safe Markdown renderer: no raw HTML is ever emitted, links are limited to http(s), mailto and relative paths. */
const SAFE = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i;

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2]) out.push(<strong key={`${key}b${i}`}>{m[2]}</strong>);
    else if (m[3]) out.push(<em key={`${key}i${i}`}>{m[3]}</em>);
    else if (m[4]) {
      const href = m[5];
      out.push(SAFE.test(href) ? (href.startsWith("/") ? <Link key={`${key}l${i}`} href={href}>{m[4]}</Link> : <a key={`${key}l${i}`} href={href} rel="noopener noreferrer nofollow" target={href.startsWith("http") ? "_blank" : undefined}>{m[4]}</a>) : m[4]);
    }
    last = m.index + m[0].length; i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source, className = "prose-fbl" }: { source: string; className?: string }) {
  const lines = (source ?? "").replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = []; let list: { ordered: boolean; items: string[] } | null = null; let quote: string[] = [];
  const flush = () => {
    const k = blocks.length;
    if (para.length) { blocks.push(<p key={k}>{inline(para.join(" "), `p${k}`)}</p>); para = []; }
    if (list) { const L = list; blocks.push(L.ordered ? <ol key={k}>{L.items.map((x, j) => <li key={j}>{inline(x, `o${k}${j}`)}</li>)}</ol> : <ul key={k}>{L.items.map((x, j) => <li key={j}>{inline(x, `u${k}${j}`)}</li>)}</ul>); list = null; }
    if (quote.length) { blocks.push(<blockquote key={k}>{inline(quote.join(" "), `q${k}`)}</blockquote>); quote = []; }
  };
  for (const raw of lines) {
    const ln = raw.trimEnd();
    if (!ln.trim()) { flush(); continue; }
    let m: RegExpMatchArray | null;
    if ((m = ln.match(/^(#{1,3})\s+(.*)$/))) { flush(); const k = blocks.length; blocks.push(m[1].length === 1 ? <h2 key={k}>{inline(m[2], `h${k}`)}</h2> : m[1].length === 2 ? <h2 key={k}>{inline(m[2], `h${k}`)}</h2> : <h3 key={k}>{inline(m[2], `h${k}`)}</h3>); continue; }
    if ((m = ln.match(/^\s*[-*•]\s+(.*)$/))) { if (!list || list.ordered) { flush(); list = { ordered: false, items: [] }; } list.items.push(m[1]); continue; }
    if ((m = ln.match(/^\s*\d+[.)]\s+(.*)$/))) { if (!list || !list.ordered) { flush(); list = { ordered: true, items: [] }; } list.items.push(m[1]); continue; }
    if ((m = ln.match(/^>\s?(.*)$/))) { if (para.length || list) flush(); quote.push(m[1]); continue; }
    if (list || quote.length) flush();
    para.push(ln.trim());
  }
  flush();
  return <div className={className}>{blocks}</div>;
}

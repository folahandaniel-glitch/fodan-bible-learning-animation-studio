import type { Passage } from "@/server/bible-data";
import { TRANSLATIONS } from "@/lib/bible";

export function BibleText({ passages, compact = false }: { passages: Passage[]; compact?: boolean }) {
  if (!passages.length) return null;
  return (
    <div className="space-y-3">
      {passages.map((p, i) => {
        const tr = TRANSLATIONS.find((t) => t.id === p.translation);
        const multi = new Set(p.verses.map((v) => v.chapter)).size > 1;
        return (
          <figure key={i} className="scripture" lang={tr?.lang}>
            <div className={compact ? "text-[1rem]" : ""}>
              {p.verses.map((v) => (
                <span key={`${v.chapter}:${v.n}`}>
                  <sup className="mr-1 text-xs font-bold text-gold-700">{multi && v.n === 1 ? `${v.chapter}:${v.n}` : v.n}</sup>{v.text}{" "}
                </span>
              ))}
            </div>
            <figcaption className="mt-2 text-sm font-sans text-mist">{p.label} ({tr?.name}). {tr?.licence}.</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

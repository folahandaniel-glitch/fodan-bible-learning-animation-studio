export interface StoryDetail {
  bg?: string; chars?: string; places?: string; themes?: string; link?: string; cross?: string; prophetic?: string; apostolic?: string; literary?: string; words?: string;
}
export interface StorySeed {
  slug: string; title: string; ref: string; testament: "OT" | "NT"; cl: string; art: string; genre?: string;
  summary: string; memory: string; discuss: string[]; app: string; activity?: string; d?: StoryDetail; free?: boolean;
}
const ORDER = ["p1", "p2", "p3", "p4", "p5", "p6", "j1", "j2", "j3", "s1", "s2", "s3"];
export const CLASS_SLUGS = ["primary-1", "primary-2", "primary-3", "primary-4", "primary-5", "primary-6", "jss-1", "jss-2", "jss-3", "sss-1", "sss-2", "sss-3"];
/** "p1-p6" or "j1-s3" or "p4" or "p1,p3" to class slugs. */
export function expandClasses(cl: string): string[] {
  const out: string[] = [];
  for (const part of cl.split(",")) {
    const [a, b] = part.split("-");
    const i = ORDER.indexOf(a), j = b ? ORDER.indexOf(b) : i;
    for (let k = i; k <= j; k++) out.push(CLASS_SLUGS[k]);
  }
  return out;
}
export interface SceneSeed { title: string; text: string; ref?: string; art: string }
export interface TemplateSeed extends StorySeed { scenes: SceneSeed[] }

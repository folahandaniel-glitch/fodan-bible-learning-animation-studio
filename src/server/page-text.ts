import "server-only";
import { getSetting } from "./settings";

export type PageText = { kicker?: string; title: string; subtitle?: string };

/** Every public page heading and intro that Admin can edit. The text here is the default until an admin saves a change. */
export const PAGE_TEXT: Record<string, { label: string; path: string; defaults: PageText; vars?: string }> = {
  bible: { label: "Read the Bible", path: "/bible", defaults: { title: "Read the Bible", subtitle: "Public-domain translations loaded for offline-friendly reading: King James Version, Berean Standard Bible, American Standard Version, the Hebrew Old Testament (WLC) and the Greek New Testament (Textus Receptus)." } },
  classes: { label: "Classes and curriculum", path: "/classes", defaults: { kicker: "Bible Learning Centre", title: "Classes and curriculum", subtitle: "A progressive pathway from picture stories in Primary 1 to exegesis and ministry preparation in SSS 3. Every topic is tied to a Bible passage, and a topic shows as a ready lesson only when its full lesson exists." } },
  contact: { label: "Contact and support", path: "/contact", defaults: { title: "Contact and support", subtitle: "Questions about registration, payment, teaching or safeguarding? Write to us. For an urgent child-protection concern, contact your church's safeguarding lead and local authorities first." } },
  exams: { label: "CBT examinations", path: "/exams-info", defaults: { kicker: "CBT Centre", title: "CBT examinations and competitions", subtitle: "A computer-based testing centre built for Bible knowledge." } },
  faq: { label: "Frequently asked questions", path: "/faq", defaults: { title: "Frequently asked questions" } },
  games: { label: "Bible games", path: "/games-info", defaults: { kicker: "Games centre", title: "Bible games and trivia", subtitle: "Every game has a learning goal, explanations after each answer and a Bible reference. Leaderboards show friendly nicknames only." } },
  lessons: { label: "Lessons", path: "/learn", defaults: { title: "Lessons", subtitle: "Choose a class to see its ready lessons." } },
  coverage: { label: "Coverage of all 66 books", path: "/library/coverage", vars: "{covered} becomes the number of books that have a story today.", defaults: { title: "Coverage of all 66 books", subtitle: "{covered} of 66 books have a story or teaching unit today. Books of law, poetry, prophecy and letters are taught in formats that suit them, not as forced stories. Books with no unit yet are still being developed." } },
  plans: { label: "Plans and prices", path: "/plans", defaults: { kicker: "Subscriptions", title: "Plans and prices", subtitle: "All prices and conditions are shown here before you pay. Protected lessons, quizzes, examinations and games open only after the server has confirmed your payment." } },
  stories: { label: "Bible story library", path: "/stories", defaults: { kicker: "Genesis to Revelation", title: "Bible story library", subtitle: "Stories and teaching units across the whole Bible, with passage-based background, discussion questions and memory verses. Books of law, poetry, prophecy and letters are taught in formats that suit them." } },
  timeline: { label: "Interactive Bible timeline", path: "/timeline", defaults: { kicker: "Genesis to Revelation", title: "Interactive Bible timeline", subtitle: "" } },
  wings: { label: "Ministry wings", path: "/wings", defaults: { kicker: "Fodan Gospel Outreach", title: "Ministry wings and programmes", subtitle: "CROP (Child Rescue Operation Programmes) is the children's wing of Fodan Gospel Outreach. Other wings and institutions are listed with the details the ministry has supplied." } },
};

/** Saved text wins; a blank field falls back to the default. `fallbackSubtitle` is for pages whose default intro comes from other data. */
export async function getPageText(id: string, vars: Record<string, string | number> = {}, fallbackSubtitle?: string): Promise<PageText> {
  const reg = PAGE_TEXT[id];
  const saved = ((await getSetting("pageText")) as Record<string, Partial<PageText>>)[id] ?? {};
  const pick = (k: keyof PageText, d: string | undefined) => (typeof saved[k] === "string" && saved[k]!.trim() ? saved[k]! : d);
  const fill = (s?: string) => s?.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return {
    kicker: fill(pick("kicker", reg?.defaults.kicker)),
    title: fill(pick("title", reg?.defaults.title)) ?? "",
    subtitle: fill(pick("subtitle", reg?.defaults.subtitle || fallbackSubtitle)),
  };
}

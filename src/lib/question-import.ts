/** Pure parsers for question imports (Word text, CSV rows, spreadsheet rows). Recognises the star marker used in Fodan CBT: ★ before or after the correct option. */
export interface ParsedQuestion {
  line: number; text: string; type: "mcq" | "tf" | "multi" | "fill" | "short" | "essay";
  options: { text: string; correct: boolean }[]; acceptedAnswers: string[];
  explanation?: string; ref?: string; classLevelSlug?: string; topic?: string; difficulty?: number; tags?: string[]; marks?: number;
  errors: string[]; warnings: string[];
}

export const STAR = /★/g;
const hasStar = (s: string) => /★/.test(s);
export const stripStar = (s: string) => s.replace(STAR, "").replace(/\s{2,}/g, " ").trim();

const OPT = /^\s*\(?([A-Ha-h])[.)]\s*(.*\S.*)$/;
const QSTART = /^\s*(?:Q(?:uestion)?\s*)?(\d{1,4})\s*[.):\-]\s+(.+)$/i;
const META = /^\s*(answer|ans|correct|explanation|reason|ref|reference|passage|topic|class|level|difficulty|tags?|marks?|type)\s*[:=]\s*(.*)$/i;

function finish(q: ParsedQuestion): ParsedQuestion {
  const correct = q.options.filter((o) => o.correct);
  if (!q.text.trim()) q.errors.push("The question text is empty.");
  if (q.type === "essay" || q.type === "short" && !q.acceptedAnswers.length) return q;
  if (q.type === "fill") { if (!q.acceptedAnswers.length) q.errors.push("A fill-in-the-blank question needs at least one accepted answer."); return q; }
  if (q.options.length < 2) { q.errors.push("A choice question needs at least two options."); return q; }
  if (q.options.length > 8) q.errors.push("Too many options (maximum 8).");
  const texts = q.options.map((o) => o.text.toLowerCase());
  if (new Set(texts).size !== texts.length) q.errors.push("Two options have identical text.");
  if (correct.length === 0) q.errors.push("No correct answer is marked. Put ★ on the correct option or add an Answer: line.");
  else if (correct.length > 1) { q.type = "multi"; q.warnings.push(`${correct.length} options are marked correct; it will be imported as a multiple-select question. Check this is intended.`); }
  if (q.type === "mcq" && q.options.length === 2 && texts.sort().join("|") === "false|true") q.type = "tf";
  return q;
}

/** Parses plain text (for example text extracted from a .docx). */
export function parseQuestionText(raw: string): ParsedQuestion[] {
  const lines = raw.replace(/\r/g, "").split("\n");
  const out: ParsedQuestion[] = [];
  let cur: ParsedQuestion | null = null;
  let answerLetters: string[] = [];
  const flush = () => {
    if (!cur) return;
    if (answerLetters.length) {
      const L = "abcdefgh";
      cur.options.forEach((o, i) => { if (answerLetters.includes(L[i])) o.correct = true; });
      if (!cur.options.length) cur.acceptedAnswers.push(...answerLetters);
    }
    out.push(finish(cur)); cur = null; answerLetters = [];
  };
  const blank = (line: number, text: string): ParsedQuestion => ({ line, text, type: "mcq", options: [], acceptedAnswers: [], errors: [], warnings: [] });
  lines.forEach((ln, i) => {
    if (!ln.trim()) return;
    const qm = ln.match(QSTART);
    const om = ln.match(OPT);
    const mm = ln.match(META);
    if (qm) {
      flush(); cur = blank(i + 1, qm[2].trim()); return;
    }
    if (!cur) { if (!om && !mm) { cur = blank(i + 1, ln.trim()); } return; }
    if (om) {
      const t = om[2];
      cur.options.push({ text: stripStar(t), correct: hasStar(t) });
    } else if (mm) {
      const key = mm[1].toLowerCase(), val = mm[2].trim();
      if (key === "answer" || key === "ans" || key === "correct") {
        const letters = val.toLowerCase().split(/[\s,;&]+|and/).map((x) => x.replace(/[^a-h]/g, "")).filter(Boolean);
        if (letters.length && letters.every((x) => x.length === 1)) answerLetters.push(...letters);
        else if (val) cur.acceptedAnswers.push(...val.split("|").map((x) => x.trim()).filter(Boolean));
      } else if (key === "explanation" || key === "reason") cur.explanation = val;
      else if (key === "ref" || key === "reference" || key === "passage") cur.ref = val;
      else if (key === "topic") cur.topic = val;
      else if (key === "class" || key === "level") cur.classLevelSlug = val;
      else if (key === "difficulty") cur.difficulty = Math.max(1, Math.min(3, Number(val) || 2));
      else if (key.startsWith("tag")) cur.tags = val.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
      else if (key.startsWith("mark")) cur.marks = Math.max(1, Number(val) || 1);
      else if (key === "type") { const t = val.toLowerCase(); if (["mcq", "tf", "multi", "fill", "short", "essay"].includes(t)) cur.type = t as ParsedQuestion["type"]; }
    } else if (!cur.options.length) {
      cur.text += " " + ln.trim(); // wrapped question text
    } else if (cur.options.length) {
      const last = cur.options[cur.options.length - 1]; // wrapped option text
      last.text = stripStar(last.text + " " + ln.trim()); if (hasStar(ln)) last.correct = true;
    }
  });
  flush();
  // Fill-in-the-blank: a question containing ____ with accepted answers and no options
  for (const q of out) if (!q.options.length && q.acceptedAnswers.length && q.type === "mcq") { q.type = "fill"; q.errors = q.errors.filter((e) => !/option|correct answer/i.test(e)); }
  return out;
}

// ───────── CSV ─────────
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && src[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((x) => x.trim())) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell); if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

/** Maps tabular rows (first row = header) to questions. Columns: question, option a..h (or a,b,c,d), correct, explanation, reference, class, topic, difficulty, tags, type, marks. */
export function questionsFromRows(rows: string[][]): ParsedQuestion[] {
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ""));
  const idx = (names: string[]) => head.findIndex((h) => names.includes(h));
  const iq = idx(["question", "questiontext", "q", "text"]);
  const optCols = "abcdefgh".split("").map((l) => idx([`option${l}`, `${l}`, `choice${l}`, `opt${l}`]));
  const ic = idx(["correct", "answer", "correctanswer", "key"]);
  const ie = idx(["explanation", "reason"]), ir = idx(["reference", "ref", "passage", "bibleref"]), icl = idx(["class", "level", "classlevel"]), it = idx(["topic"]), idf = idx(["difficulty"]), itg = idx(["tags", "tag"]), ity = idx(["type", "questiontype"]), im = idx(["marks", "mark"]);
  const out: ParsedQuestion[] = [];
  if (iq < 0) return [{ line: 1, text: "", type: "mcq", options: [], acceptedAnswers: [], errors: ["The sheet needs a 'Question' column."], warnings: [] }];
  rows.slice(1).forEach((r, k) => {
    const text = (r[iq] ?? "").trim();
    if (!text) return;
    const q: ParsedQuestion = { line: k + 2, text, type: "mcq", options: [], acceptedAnswers: [], errors: [], warnings: [] };
    optCols.forEach((c) => { if (c >= 0 && (r[c] ?? "").trim()) q.options.push({ text: stripStar(r[c]), correct: hasStar(r[c]) }); });
    const corr = ic >= 0 ? (r[ic] ?? "").trim() : "";
    if (corr) {
      const letters = corr.toLowerCase().split(/[\s,;&|]+/).filter((x) => /^[a-h]$/.test(x));
      if (letters.length && q.options.length) { const L = "abcdefgh"; q.options.forEach((o, i) => { if (letters.includes(L[i])) o.correct = true; }); }
      else if (q.options.length) { const m = q.options.find((o) => o.text.toLowerCase() === corr.toLowerCase()); if (m) m.correct = true; else q.errors.push(`The correct answer '${corr}' does not match any option.`); }
      else q.acceptedAnswers.push(...corr.split("|").map((x) => x.trim()).filter(Boolean));
    }
    const ty = ity >= 0 ? (r[ity] ?? "").trim().toLowerCase() : "";
    if (["mcq", "tf", "multi", "fill", "short", "essay"].includes(ty)) q.type = ty as ParsedQuestion["type"];
    else if (!q.options.length && q.acceptedAnswers.length) q.type = "fill";
    else if (!q.options.length && !q.acceptedAnswers.length) q.type = "essay";
    if (ie >= 0 && r[ie]?.trim()) q.explanation = r[ie].trim();
    if (ir >= 0 && r[ir]?.trim()) q.ref = r[ir].trim();
    if (icl >= 0 && r[icl]?.trim()) q.classLevelSlug = r[icl].trim().toLowerCase().replace(/\s+/g, "-");
    if (it >= 0 && r[it]?.trim()) q.topic = r[it].trim();
    if (idf >= 0 && r[idf]?.trim()) q.difficulty = Math.max(1, Math.min(3, Number(r[idf]) || 2));
    if (itg >= 0 && r[itg]?.trim()) q.tags = r[itg].split(/[,;]/).map((x) => x.trim()).filter(Boolean);
    if (im >= 0 && r[im]?.trim()) q.marks = Math.max(1, Number(r[im]) || 1);
    out.push(finish(q));
  });
  return out;
}

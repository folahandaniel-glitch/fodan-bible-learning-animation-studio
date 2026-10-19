import { describe, expect, it } from "vitest";
import { parseCsv, parseQuestionText, questionsFromRows, stripStar } from "@/lib/question-import";
import { markOne, normAnswer } from "@/server/services/exams";

describe("star-marked question import", () => {
  const text = `1. Who built the ark?
A. Moses
B. ★ Noah
C. Abraham
D. David
Explanation: Genesis 6
Ref: Genesis 6:14

2. Jesus was born in Bethlehem. True or false?
A. True ★
B. False

3. Two correct answers here
A. ★ One
B. ★ Two
C. Three

4. Nothing marked
A. Yes
B. No

5. Answer-line style
A. Red
B. Blue
C. Green
Answer: C`;
  const qs = parseQuestionText(text);
  it("detects the star and removes it from the displayed text", () => {
    expect(qs).toHaveLength(5);
    expect(qs[0].options.map((o) => o.text)).toEqual(["Moses", "Noah", "Abraham", "David"]);
    expect(qs[0].options.find((o) => o.correct)?.text).toBe("Noah");
    expect(qs[0].explanation).toBe("Genesis 6");
    expect(qs[0].ref).toBe("Genesis 6:14");
    expect(qs[0].errors).toEqual([]);
    for (const q of qs) for (const o of q.options) expect(o.text).not.toContain("★");
  });
  it("recognises true/false, flags ambiguity and missing answers, and accepts Answer lines", () => {
    expect(qs[1].type).toBe("tf");
    expect(qs[2].type).toBe("multi");
    expect(qs[2].warnings.length).toBeGreaterThan(0);
    expect(qs[3].errors.join(" ")).toMatch(/No correct answer/);
    expect(qs[4].options.find((o) => o.correct)?.text).toBe("Green");
    expect(qs[4].errors).toEqual([]);
  });
  it("parses CSV with quotes and maps columns", () => {
    const rows = parseCsv('Question,A,B,C,D,Correct,Reference,Class\n"Who wrote Romans, traditionally?",Peter,Paul,John,James,B,Romans 1:1,JSS 1\nWhat is ★ here?,x ★,y,,,,,');
    const qs2 = questionsFromRows(rows);
    expect(qs2[0].text).toBe("Who wrote Romans, traditionally?");
    expect(qs2[0].options.find((o) => o.correct)?.text).toBe("Paul");
    expect(qs2[0].classLevelSlug).toBe("jss-1");
    expect(qs2[1].options.find((o) => o.correct)?.text).toBe("x");
    expect(stripStar("★ Noah")).toBe("Noah");
  });
});

describe("server-side marking", () => {
  const base = { id: "q", type: "mcq", text: "", options: [{ id: "a", text: "A", correct: false }, { id: "b", text: "B", correct: true }], acceptedAnswers: [], rubric: null, explanation: "", ref: null, classLevelSlug: null, classMin: null, classMax: null, topic: null, lessonId: null, storyId: null, difficulty: 1, objective: null, tags: [], marks: 2, status: "published", imageAssetId: null, source: null, licence: null, authorId: null, reviewerId: null, orgId: null, isFree: false, createdAt: new Date(), updatedAt: new Date() } as unknown as Parameters<typeof markOne>[0];
  it("marks mcq, multi, fill and leaves essays for a teacher", () => {
    expect(markOne(base, "b")).toEqual({ correct: true, marks: 2 });
    expect(markOne(base, "a")).toEqual({ correct: false, marks: 0 });
    expect(markOne(base, null)).toEqual({ correct: false, marks: 0 });
    const multi = { ...base, type: "multi", options: [{ id: "a", text: "A", correct: true }, { id: "b", text: "B", correct: true }, { id: "c", text: "C", correct: false }] } as typeof base;
    expect(markOne(multi, ["b", "a"])?.correct).toBe(true);
    expect(markOne(multi, ["a"])?.correct).toBe(false);
    const fill = { ...base, type: "fill", options: [], acceptedAnswers: ["Adam"] } as typeof base;
    expect(markOne(fill, "  adam. ")?.correct).toBe(true);
    expect(markOne({ ...base, type: "essay", options: [] } as typeof base, "text")).toBeNull();
    expect(normAnswer("  The  Ark! ")).toBe("the ark");
  });
});

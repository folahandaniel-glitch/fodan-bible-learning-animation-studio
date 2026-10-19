import { describe, expect, it } from "vitest";
import { sanitizeSvg, UnsafeSvgError } from "@/lib/svg";
import { sniff, checkDocx } from "@/server/services/media";
import { passwordProblem } from "@/server/auth/password";
import { parseRange, parseRanges, rangeLabel } from "@/lib/bible";
import { findRefs } from "@/server/services/studio";

describe("SVG sanitiser", () => {
  it("removes scripts, handlers, foreignObject and external references", () => {
    const dirty = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><foreignObject><div>x</div></foreignObject><circle cx="5" cy="5" r="4" fill="red" onclick="x()"/><a href="javascript:alert(1)"><path d="M0 0"/></a><image href="https://evil.example/x.png"/><use href="https://evil.example/s.svg#a"/><rect width="4" height="4" style="fill:url(https://evil.example/a)"/></svg>`;
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toMatch(/script|onload|onclick|foreignObject|javascript:|evil\.example|<image|<a /i);
    expect(clean).toContain("<circle");
  });
  it("rejects non-SVG and entity tricks", () => {
    expect(() => sanitizeSvg("<html></html>")).toThrow(UnsafeSvgError);
    expect(() => sanitizeSvg(`<!DOCTYPE svg [<!ENTITY x "y">]><svg xmlns="http://www.w3.org/2000/svg"/>`)).toThrow(UnsafeSvgError);
  });
  it("the shipped logo files survive sanitising", async () => {
    const fs = await import("node:fs");
    for (const f of fs.readdirSync("public/brand").filter((x) => x.endsWith(".svg"))) {
      const out = sanitizeSvg(fs.readFileSync(`public/brand/${f}`, "utf8"));
      expect(out.length).toBeGreaterThan(200);
    }
  });
});

describe("upload sniffing", () => {
  it("identifies files by content, not name", () => {
    expect(sniff(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0, 0]))?.mime).toBe("image/png");
    expect(sniff(Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff"))).toBeNull(); // Windows executable
    expect(sniff(Buffer.from("<script>alert(1)</script>   ")) ).toBeNull();
  });
  it("refuses macro-enabled Word packages", () => {
    expect(checkDocx(Buffer.from("PK word/document.xml word/vbaProject.bin"))).toMatch(/Macro/);
    expect(checkDocx(Buffer.from("PK word/document.xml fine"))).toBeNull();
  });
});

describe("password policy", () => {
  it("is stricter for adults than for students and rejects common or personal passwords", () => {
    expect(passwordProblem("abc12345", "student")).toBeNull();
    expect(passwordProblem("abc12345", "parent")).not.toBeNull();
    expect(passwordProblem("password1", "student")).not.toBeNull();
    expect(passwordProblem("Daniel2026xyz", "parent", ["daniel"])).not.toBeNull();
    expect(passwordProblem("onlyletters", "student")).not.toBeNull();
  });
});

describe("Bible references", () => {
  it("parses verses, ranges, chapters and cross-chapter ranges", () => {
    expect(rangeLabel(parseRange("John 3:16")!)).toBe("John 3:16");
    expect(rangeLabel(parseRange("Gen 1:1-2:3")!)).toBe("Genesis 1:1-2:3");
    expect(rangeLabel(parseRange("Psalm 23")!)).toBe("Psalms 23");
    expect(parseRange("Jude 3")).toMatchObject({ book: 64, c1: 1, v1: 3 });
    expect(parseRanges("Luke 2:1-20; John 3:16")).toHaveLength(2);
    expect(parseRange("Hezekiah 4:4")).toBeNull();
  });
  it("finds only valid references in imported text", () => {
    expect(findRefs("Read Genesis 6:9-22 and also Fakebook 4:4.")).toEqual(["Genesis 6:9-22"]);
  });
});

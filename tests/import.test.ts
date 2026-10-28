import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { convertFile, FILE_ERROR, importTitle, MAX_FILE_BYTES, validateImportFile } from "../src/lib/import";
import { contentSchema } from "../src/lib/validation";

function flatten(node: JSONContent): JSONContent[] { return [node, ...(node.content ?? []).flatMap(flatten)]; }
describe("file import", () => {
  it("preserves Markdown headings, emphasis and both list types", async () => {
    const { content } = await convertFile("meeting-notes.md", await readFile("samples/meeting-notes.md"));
    const nodes = flatten(content);
    expect(nodes.filter(n => n.type === "heading").map(n => n.attrs?.level)).toEqual([1, 2, 3]);
    expect(nodes.some(n => n.marks?.some(m => m.type === "bold"))).toBe(true);
    expect(nodes.some(n => n.marks?.some(m => m.type === "italic"))).toBe(true);
    expect(nodes.map(n => n.type)).toEqual(expect.arrayContaining(["bulletList", "orderedList"]));
    expect(contentSchema.safeParse(content).success).toBe(true);
  });
  it("keeps text paragraphs and single-line hard breaks, without interpreting HTML", async () => {
    const { content } = await convertFile("plain.txt", new TextEncoder().encode("<b>First</b>\nSecond\n\nThird"));
    expect(content.content).toHaveLength(2);
    expect(content.content?.[0].content).toEqual([{type:"text",text:"<b>First</b>"},{type:"hardBreak"},{type:"text",text:"Second"}]);
    expect(contentSchema.safeParse(content).success).toBe(true);
  });
  it("converts the Word sample with headings", async () => {
    const { content } = await convertFile("project-brief.docx", await readFile("samples/project-brief.docx"));
    expect(flatten(content).some(n => n.type === "heading")).toBe(true);
    expect(contentSchema.safeParse(content).success).toBe(true);
  });
  it("rejects invalid uploads and corrupt Word files", async () => {
    expect(validateImportFile("x.pdf", 20)).toBe(FILE_ERROR);
    expect(validateImportFile("x.txt", MAX_FILE_BYTES + 1)).toBe(FILE_ERROR);
    expect(validateImportFile("x.txt", 0)).toMatch(/empty/);
    await expect(convertFile("x.docx", new TextEncoder().encode("not a zip"))).rejects.toThrow(/corrupt/);
    await expect(convertFile("x.txt", new TextEncoder().encode("  \n\n "))).rejects.toThrow(/no editable text/);
  });
  it("uses bounded titles and rejects content beyond the editor limit", async () => {
    expect(importTitle(" .md")).toBe("Imported document");
    expect(importTitle("a".repeat(220) + ".TXT")).toHaveLength(200);
    await expect(convertFile("large.txt", new Uint8Array(1_100_000).fill(65))).rejects.toThrow(/too large/);
  });
});

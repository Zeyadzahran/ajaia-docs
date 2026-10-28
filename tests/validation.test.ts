import { describe, expect, it } from "vitest";
import { contentSchema, titleSchema } from "@/lib/validation";

const text = (value: string) => ({ type: "text", text: value });

describe("contentSchema", () => {
  it("accepts every format the toolbar can produce", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [text("Agenda")] },
        {
          type: "paragraph",
          content: [
            { ...text("bold"), marks: [{ type: "bold" }] },
            { ...text("italic"), marks: [{ type: "italic" }] },
            { ...text("underline"), marks: [{ type: "underline" }] },
          ],
        },
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [text("one")] }] }] },
        { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [text("two")] }] }] },
      ],
    };
    expect(contentSchema.safeParse(doc).success).toBe(true);
  });

  // The editor opens these as an empty document, so saving them would wipe the doc.
  it.each([
    ["a null child", { type: "doc", content: [null] }],
    ["an unknown node type", { type: "doc", content: [{ type: "script" }] }],
    ["an unknown mark", { type: "doc", content: [{ type: "paragraph", content: [{ ...text("x"), marks: [{ type: "evil" }] }] }] }],
    ["text directly under the doc", { type: "doc", content: [text("loose text")] }],
    ["a non-doc root", { type: "paragraph" }],
    ["not an object", "hello"],
  ])("rejects %s", (_, doc) => {
    expect(contentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects documents over the size limit", () => {
    const big = { type: "doc", content: [{ type: "paragraph", content: [text("x".repeat(1_000_001))] }] };
    expect(contentSchema.safeParse(big).success).toBe(false);
  });
});

describe("titleSchema", () => {
  it("trims whitespace", () => {
    expect(titleSchema.parse("  Plan  ")).toBe("Plan");
  });

  it("rejects empty and over-long titles", () => {
    expect(titleSchema.safeParse("   ").success).toBe(false);
    expect(titleSchema.safeParse("x".repeat(201)).success).toBe(false);
  });
});

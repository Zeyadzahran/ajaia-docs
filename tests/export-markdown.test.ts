import { expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { exportMarkdown } from "../src/lib/export-markdown";
const text = (value: string, mark?: string): JSONContent => ({ type:"text", text:value, ...(mark ? {marks:[{type:mark}]} : {}) });
const paragraph = (value: string): JSONContent => ({type:"paragraph",content:[text(value)]});
it("exports all supported blocks, marks and nested lists", () => {
  const doc: JSONContent = {type:"doc",content:[
    {type:"heading",attrs:{level:2},content:[text("Title")]},
    {type:"paragraph",content:[text("Bold","bold"),text(" "),text("Italic","italic"),text(" "),text("Under","underline"),{type:"hardBreak"},text("code","code"),text(" "),{type:"text",text:"Link",marks:[{type:"link",attrs:{href:"https://example.com"}}]}]},
    {type:"bulletList",content:[{type:"listItem",content:[paragraph("Parent"),{type:"orderedList",attrs:{start:3},content:[{type:"listItem",content:[paragraph("Child")]}]}]},{type:"listItem",content:[paragraph("Sibling")]}]},
    {type:"blockquote",content:[paragraph("Quote")]},
    {type:"codeBlock",attrs:{language:"js"},content:[text("const x = 1;")]},
    {type:"horizontalRule"},
  ]};
  expect(exportMarkdown(doc)).toBe("## Title\n\n**Bold** *Italic* <u>Under</u>  \n` code ` [Link](https://example.com)\n\n- Parent\n  \n  3. Child\n- Sibling\n\n> Quote\n\n```js\nconst x = 1;\n```\n\n---\n");
});
it("escapes Markdown text and uses safe code fences", () => {
  expect(exportMarkdown({type:"doc",content:[paragraph("*literal*"),{type:"codeBlock",content:[text("```")]}]})).toBe("\\*literal\\*\n\n````\n```\n````\n");
});

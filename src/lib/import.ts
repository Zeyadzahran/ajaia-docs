import { generateJSON } from "@tiptap/html/server";
import mammoth from "mammoth";
import { marked } from "marked";
import type { JSONContent } from "@tiptap/core";
import { editorExtensions } from "./editor-schema";
import { contentSchema } from "./validation";

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const FILE_ERROR = "Only .txt, .md and .docx files up to 2 MB are supported.";
export function validateImportFile(name: string, size: number): string | null {
  if (!/\.(txt|md|docx)$/i.test(name) || size > MAX_FILE_BYTES) return FILE_ERROR;
  if (size === 0) return "This file is empty. Choose a file with some text.";
  return null;
}
export function importTitle(name: string) {
  return name.replace(/\.(txt|md|docx)$/i, "").trim().slice(0, 200) || "Imported document";
}
export async function convertFile(name: string, bytes: Uint8Array): Promise<{ title: string; content: JSONContent }> {
  const error = validateImportFile(name, bytes.byteLength);
  if (error) throw new Error(error);
  let content: JSONContent;
  if (/\.txt$/i.test(name)) {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/\r\n?/g, "\n");
    content = { type: "doc", content: text.split(/\n[\t ]*\n+/).map((paragraph) => ({
      type: "paragraph", content: paragraph.split("\n").flatMap((line, i) => [
        ...(i ? [{ type: "hardBreak" }] : []), ...(line ? [{ type: "text", text: line }] : []),
      ]),
    })) };
  } else {
    let html: string;
    if (/\.docx$/i.test(name)) {
      try {
        html = (await mammoth.convertToHtml({ buffer: Buffer.from(bytes) }, { externalFileAccess: false })).value;
      } catch {
        throw new Error("This .docx file is unreadable or corrupt. Try exporting it again.");
      }
    } else {
      html = await marked(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    }
    content = generateJSON(html, editorExtensions);
  }
  const parsed = contentSchema.safeParse(content);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  if (!hasText(content)) throw new Error("This file contains no editable text. Choose a file with some text.");
  return { title: importTitle(name), content: parsed.data as JSONContent };
}
function hasText(node: JSONContent): boolean {
  return Boolean(node.text?.trim() || node.content?.some(hasText));
}

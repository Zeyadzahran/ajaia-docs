import { generateJSON } from "@tiptap/html/server";
import type { JSONContent } from "@tiptap/core";
import mammoth from "mammoth";
import { marked } from "marked";
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

function textParagraph(paragraph: string): JSONContent {
  const content: JSONContent[] = [];

  for (const [index, line] of paragraph.split("\n").entries()) {
    if (index > 0) content.push({ type: "hardBreak" });
    if (line) content.push({ type: "text", text: line });
  }

  return { type: "paragraph", content };
}

export async function convertFile(
  name: string,
  bytes: Uint8Array,
): Promise<{ title: string; content: JSONContent }> {
  const error = validateImportFile(name, bytes.byteLength);
  if (error) throw new Error(error);

  let content: JSONContent;

  if (/\.txt$/i.test(name)) {
    const text = new TextDecoder("utf-8", { fatal: true })
      .decode(bytes)
      .replace(/\r\n?/g, "\n");

    content = {
      type: "doc",
      content: text.split(/\n[\t ]*\n+/).map(textParagraph),
    };
  } else {
    let html: string;

    if (/\.docx$/i.test(name)) {
      try {
        const result = await mammoth.convertToHtml(
          { buffer: Buffer.from(bytes) },
          { externalFileAccess: false },
        );
        html = result.value;
      } catch {
        throw new Error("This .docx file is unreadable or corrupt. Try exporting it again.");
      }
    } else {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      html = await marked(text);
    }

    content = generateJSON(html, editorExtensions);
  }

  const parsed = contentSchema.safeParse(content);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  if (!hasText(content)) {
    throw new Error("This file contains no editable text. Choose a file with some text.");
  }

  return { title: importTitle(name), content: parsed.data as JSONContent };
}

function hasText(node: JSONContent): boolean {
  return Boolean(node.text?.trim() || node.content?.some(hasText));
}

import { generateJSON } from "@tiptap/html/server";
import type { JSONContent } from "@tiptap/core";
import mammoth from "mammoth";
import { marked } from "marked";
import { editorExtensions } from "./editor-schema";
import { contentSchema } from "./validation";
import { SUPPORTED_FILE_EXTENSION, validateImportFile } from "./import-rules";

export function importTitle(name: string) {
  return name.replace(SUPPORTED_FILE_EXTENSION, "").trim().slice(0, 200) || "Imported document";
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
    const text = decodeText(bytes).replace(/\r\n?/g, "\n");

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
          {
            externalFileAccess: false,
            styleMap: ["p[style-name='Title'] => h1:fresh", "u => u"],
          },
        );
        html = result.value;
      } catch {
        throw new Error("This .docx file is unreadable or corrupt. Try exporting it again.");
      }
    } else {
      const text = decodeText(bytes);
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

function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("This file isn't UTF-8 text. Save it as UTF-8 and try again.");
  }
}

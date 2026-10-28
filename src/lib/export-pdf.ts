// Turns the editor's JSON into a pdfmake document, so "Export → PDF" downloads a real
// PDF with selectable text (not a screenshot). Pure function; the download lives in ExportMenu.
import type { JSONContent } from "@tiptap/core";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

const INK = "#18181b";
const MUTED = "#52525b";
const ACCENT = "#24695a";

export function toPdfDefinition(doc: JSONContent, title: string): TDocumentDefinitions {
  return {
    info: { title },
    pageSize: "A4",
    pageMargins: [56, 56, 56, 56],
    content: (doc.content ?? []).map(block),
    defaultStyle: { fontSize: 11, lineHeight: 1.35, color: INK },
    styles: {
      h1: { fontSize: 22, bold: true, margin: [0, 6, 0, 8] },
      h2: { fontSize: 16, bold: true, margin: [0, 10, 0, 6] },
      h3: { fontSize: 13, bold: true, margin: [0, 8, 0, 4] },
    },
  };
}

function block(node: JSONContent): Content {
  const children = node.content ?? [];
  switch (node.type) {
    case "heading":
      return { text: inlines(children), style: `h${node.attrs?.level ?? 1}` };
    case "paragraph":
      // An empty paragraph is a blank line in the editor; keep it in the PDF too.
      return { text: children.length ? inlines(children) : " ", margin: [0, 0, 0, 8] };
    case "bulletList":
      return { ul: children.map(listItem), margin: [0, 0, 0, 8] };
    case "orderedList":
      return { ol: children.map(listItem), start: node.attrs?.start ?? 1, margin: [0, 0, 0, 8] };
    case "blockquote":
      return { stack: children.map(block), margin: [16, 0, 0, 8], color: MUTED, italics: true };
    case "codeBlock":
      return {
        text: children.map((c) => c.text ?? "").join(""),
        fontSize: 9.5,
        preserveLeadingSpaces: true,
        background: "#f4f4f5",
        margin: [0, 0, 0, 8],
      };
    case "horizontalRule":
      return { canvas: [{ type: "line", x1: 0, y1: 0, x2: 483, y2: 0, lineWidth: 0.5, lineColor: "#d4d4d8" }], margin: [0, 6, 0, 12] };
    default:
      return { stack: children.map(block) };
  }
}

// A list item holds blocks (usually one paragraph, sometimes a nested list).
function listItem(item: JSONContent): Content {
  const blocks = (item.content ?? []).map((child) =>
    child.type === "paragraph" ? { text: inlines(child.content ?? []) } : block(child),
  );
  return blocks.length === 1 ? blocks[0] : { stack: blocks };
}

function inlines(nodes: JSONContent[]): Content[] {
  return nodes.map((node) => {
    if (node.type === "hardBreak") return { text: "\n" };
    const marks = new Set((node.marks ?? []).map((m) => m.type));
    const link = node.marks?.find((m) => m.type === "link")?.attrs?.href as string | undefined;
    const decorations = [marks.has("underline") || link ? "underline" : null, marks.has("strike") ? "lineThrough" : null];
    return {
      text: node.text ?? "",
      bold: marks.has("bold") || undefined,
      italics: marks.has("italic") || undefined,
      decoration: decorations.find(Boolean) as "underline" | "lineThrough" | undefined,
      background: marks.has("code") ? "#f4f4f5" : undefined,
      ...(link ? { link, color: ACCENT } : {}),
    };
  });
}

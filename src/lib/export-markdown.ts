import type { JSONContent } from "@tiptap/core";

function escapeText(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/([`*_\[\]<>])/g, "\\$1")
    .replace(/^([ \t]*)(#{1,6}|>|[-+]|\d+\.) /gm, "$1\\$2 ");
}

function inline(node: JSONContent): string {
  if (node.type === "hardBreak") return "  \n";
  if (node.type !== "text") return (node.content ?? []).map(inline).join("");
  const marks = node.marks ?? [];
  let text = escapeText(node.text ?? "");
  if (marks.some((m) => m.type === "code")) {
    const raw = node.text ?? "";
    const fence = "`".repeat(Math.max(0, ...(raw.match(/`+/g) ?? []).map((s) => s.length)) + 1);
    text = `${fence} ${raw} ${fence}`;
  }
  for (const mark of marks) {
    if (mark.type === "bold") text = `**${text}**`;
    if (mark.type === "italic") text = `*${text}*`;
    if (mark.type === "underline") text = `<u>${text}</u>`;
    if (mark.type === "strike") text = `~~${text}~~`;
    if (mark.type === "link") {
      const href = String(mark.attrs?.href ?? "").replace(/[\s()<>]/g, (c) =>
        encodeURIComponent(c),
      );
      text = `[${text}](${href})`;
    }
  }
  return text;
}

function block(node: JSONContent): string {
  const children = node.content ?? [];
  switch (node.type) {
    case "doc":
      return children.map(block).join("\n\n");
    case "paragraph":
      return children.map(inline).join("");
    case "heading":
      return `${"#".repeat(Number(node.attrs?.level ?? 1))} ${children.map(inline).join("")}`;
    case "bulletList":
    case "orderedList":
      return children
        .map((item, i) => {
          const marker =
            node.type === "bulletList" ? "- " : `${Number(node.attrs?.start ?? 1) + i}. `;
          const parts = (item.content ?? []).map(block);
          const text = parts.join("\n\n");
          return (
            marker +
            text
              .split("\n")
              .map((line, j) => (j ? " ".repeat(marker.length) + line : line))
              .join("\n")
          );
        })
        .join("\n");
    case "blockquote":
      return children
        .map(block)
        .join("\n\n")
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "codeBlock": {
      const text = children.map((n) => n.text ?? "").join("");
      const fence = "`".repeat(Math.max(2, ...(text.match(/`+/g) ?? []).map((s) => s.length)) + 1);
      const language = String(node.attrs?.language ?? "").replace(/[\r\n`]/g, "");
      return `${fence}${language}\n${text}\n${fence}`;
    }
    case "horizontalRule":
      return "---";
    default:
      return children.map(block).join("\n\n");
  }
}

export function exportMarkdown(doc: JSONContent): string {
  return block(doc).trimEnd() + "\n";
}

// The editor's extensions, shared by the browser editor and the server, so the
// server validates content against exactly the schema the editor can load.
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

export const editorExtensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false } }),
];

const schema = getSchema(editorExtensions);

// True when the editor can load this JSON without dropping it.
export function isValidEditorDoc(value: unknown) {
  try {
    const node = schema.nodeFromJSON(value);
    node.check();
    return node.type === schema.topNodeType;
  } catch {
    return false;
  }
}

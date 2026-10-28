"use client";

import { EditorContent, useEditor, useEditorState, type Editor, type JSONContent } from "@tiptap/react";
import { Placeholder } from "@tiptap/extensions";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveContent } from "@/app/doc/[id]/actions";
import { ExportMenu } from "@/components/ExportMenu";
import { editorExtensions } from "@/lib/editor-schema";

type SaveState = "saved" | "unsaved" | "saving" | "error";

const SAVE_DELAY_MS = 800;

export function DocumentEditor({ documentId, initialContent }: { documentId: string; initialContent: JSONContent }) {
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Saves run one after another so an older save can never land after a newer one.
  const queue = useRef<Promise<void>>(Promise.resolve());

  const save = useCallback(
    (editor: Editor) => {
      clearTimeout(timer.current);
      timer.current = undefined;
      queue.current = queue.current.then(async () => {
        setSaveState("saving");
        try {
          const result = await saveContent(documentId, JSON.stringify(editor.getJSON()));
          if (!result.ok) {
            setError(result.error);
            setSaveState("error");
            return;
          }
          setError(null);
          // If the user typed while we were saving, stay "unsaved"; the next save is already scheduled.
          setSaveState((s) => (s === "saving" ? "saved" : s));
        } catch {
          setError("Couldn't reach the server. Check your connection.");
          setSaveState("error");
        }
      });
    },
    [documentId],
  );

  const editor = useEditor({
    extensions: [...editorExtensions, Placeholder.configure({ placeholder: "Start writing…" })],
    content: initialContent,
    immediatelyRender: false,
    // If stored content ever fails to load, lock the editor instead of letting an
    // autosave replace the document with the empty fallback.
    enableContentCheck: true,
    onContentError: ({ editor }) => {
      editor.setEditable(false);
      setLocked(true);
      setError("This document couldn't be loaded, so editing is disabled to protect it.");
      setSaveState("error");
    },
    editorProps: { attributes: { class: "doc-content", "aria-label": "Document body" } },
    onUpdate: ({ editor }) => {
      setSaveState("unsaved");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => save(editor), SAVE_DELAY_MS);
    },
  });

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (saveState === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  // Save right away when leaving the page through an in-app link.
  useEffect(() => {
    return () => {
      if (timer.current && editor && !editor.isDestroyed) save(editor);
    };
  }, [editor, save]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2">
          {/* Mount the toolbar only once the editor exists: useEditorState won't notice it arriving later. */}
          {editor ? <Toolbar editor={editor} /> : <div className="h-9" />}
          <ExportMenu editor={editor} />
          <SaveStatus state={saveState} error={error} onRetry={locked || !editor ? undefined : () => save(editor)} />
        </div>
      </div>
      <div className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-14">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      h1: editor.isActive("heading", { level: 1 }),
      h2: editor.isActive("heading", { level: 2 }),
      h3: editor.isActive("heading", { level: 3 }),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-1">
      <ToolButton label="Bold (Ctrl+B)" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <span className="font-bold">B</span>
      </ToolButton>
      <ToolButton label="Italic (Ctrl+I)" active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <span className="font-serif italic">I</span>
      </ToolButton>
      <ToolButton label="Underline (Ctrl+U)" active={state.underline} onClick={() => chain().toggleUnderline().run()}>
        <span className="underline">U</span>
      </ToolButton>
      <Divider />
      {([1, 2, 3] as const).map((level) => (
        <ToolButton
          key={level}
          label={`Heading ${level}`}
          active={state[`h${level}`]}
          onClick={() => chain().toggleHeading({ level }).run()}
        >
          H{level}
        </ToolButton>
      ))}
      <Divider />
      <ToolButton label="Bulleted list" active={state.bulletList} onClick={() => chain().toggleBulletList().run()}>
        <ListIcon />
      </ToolButton>
      <ToolButton label="Numbered list" active={state.orderedList} onClick={() => chain().toggleOrderedList().run()}>
        <NumberedListIcon />
      </ToolButton>
      <Divider />
      <ToolButton label="Undo (Ctrl+Z)" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
        ↶
      </ToolButton>
      <ToolButton label="Redo (Ctrl+Shift+Z)" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
        ↷
      </ToolButton>
    </div>
  );
}

function ToolButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep focus (and the cursor position) in the editor when a button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`grid h-9 min-w-9 place-items-center rounded-md px-2 text-sm transition-colors disabled:opacity-30 ${
        active ? "bg-blue-100 text-blue-700" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />;
}

function SaveStatus({ state, error, onRetry }: { state: SaveState; error: string | null; onRetry?: () => void }) {
  if (state === "error") {
    return (
      <div role="alert" className="flex items-center gap-2 text-sm text-red-700">
        <span>{error ?? "Couldn't save."}</span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="rounded-md border border-red-300 px-2 py-0.5 hover:bg-red-50">
            Retry
          </button>
        )}
      </div>
    );
  }
  const text = { saved: "All changes saved", unsaved: "Unsaved changes", saving: "Saving…" }[state];
  return (
    <span aria-live="polite" className="shrink-0 text-sm text-slate-500">
      {text}
    </span>
  );
}

function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
      <path d="M9 6h12M9 12h12M9 18h12" />
    </svg>
  );
}

function NumberedListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 6h11M10 12h11M10 18h11" />
      <text x="1" y="8" fontSize="7" fill="currentColor" stroke="none">1</text>
      <text x="1" y="14" fontSize="7" fill="currentColor" stroke="none">2</text>
      <text x="1" y="20" fontSize="7" fill="currentColor" stroke="none">3</text>
    </svg>
  );
}

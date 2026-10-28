"use client";

import { EditorContent, useEditor, useEditorState, type Editor, type JSONContent } from "@tiptap/react";
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  CheckIcon,
  EyeIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  TextBIcon,
  TextHOneIcon,
  TextHThreeIcon,
  TextHTwoIcon,
  TextItalicIcon,
  TextUnderlineIcon,
} from "@phosphor-icons/react";
import { Placeholder } from "@tiptap/extensions";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveContent } from "@/app/doc/[id]/actions";
import { ExportMenu } from "@/components/ExportMenu";
import { editorExtensions } from "@/lib/editor-schema";

type SaveState = "saved" | "unsaved" | "saving" | "error";

const SAVE_DELAY_MS = 800;

export function DocumentEditor({
  documentId,
  initialContent,
  readOnly = false,
}: {
  documentId: string;
  initialContent: JSONContent;
  readOnly?: boolean;
}) {
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
    editable: !readOnly,
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
      <div className="sticky top-0 z-10 border-b border-ink-200 bg-ink-0">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
          {readOnly ? (
            <p className="mr-auto flex h-9 items-center gap-2 text-sm text-ink-600">
              <EyeIcon size={16} />
              View only. Ask the owner for edit access.
            </p>
          ) : (
            <>
              {/* Mount the toolbar only once the editor exists: useEditorState won't notice it arriving later. */}
              {editor ? <Toolbar editor={editor} /> : <div className="h-9" />}
              <SaveStatus state={saveState} error={error} onRetry={locked || !editor ? undefined : () => save(editor)} />
            </>
          )}
          <ExportMenu editor={editor} />
        </div>
      </div>
      <div className="flex-1 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-[816px] rounded-sm bg-white px-6 py-12 shadow-[0_1px_2px_rgba(24,24,27,0.05),0_16px_40px_-20px_rgba(24,24,27,0.18)] ring-1 ring-ink-200/70 sm:px-16 sm:py-16">
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
    <div role="toolbar" aria-label="Formatting" className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-ink-50 p-0.5 ring-1 ring-ink-200 [scrollbar-width:none]">
      <ToolButton label="Bold (Ctrl+B)" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <TextBIcon size={18} weight="bold" />
      </ToolButton>
      <ToolButton label="Italic (Ctrl+I)" active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <TextItalicIcon size={18} />
      </ToolButton>
      <ToolButton label="Underline (Ctrl+U)" active={state.underline} onClick={() => chain().toggleUnderline().run()}>
        <TextUnderlineIcon size={18} />
      </ToolButton>
      <Divider />
      {([1, 2, 3] as const).map((level) => (
        <ToolButton
          key={level}
          label={`Heading ${level}`}
          active={state[`h${level}`]}
          onClick={() => chain().toggleHeading({ level }).run()}
        >
          {[<TextHOneIcon key={1} size={18} />, <TextHTwoIcon key={2} size={18} />, <TextHThreeIcon key={3} size={18} />][level - 1]}
        </ToolButton>
      ))}
      <Divider />
      <ToolButton label="Bulleted list" active={state.bulletList} onClick={() => chain().toggleBulletList().run()}>
        <ListBulletsIcon size={18} />
      </ToolButton>
      <ToolButton label="Numbered list" active={state.orderedList} onClick={() => chain().toggleOrderedList().run()}>
        <ListNumbersIcon size={18} />
      </ToolButton>
      <Divider />
      <ToolButton label="Undo (Ctrl+Z)" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
        <ArrowCounterClockwiseIcon size={18} />
      </ToolButton>
      <ToolButton label="Redo (Ctrl+Shift+Z)" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
        <ArrowClockwiseIcon size={18} />
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
      className={`grid h-8 min-w-8 shrink-0 place-items-center rounded-md px-2 text-sm transition-colors disabled:opacity-30 ${
        active ? "bg-ink-0 text-brand-700 shadow-sm ring-1 ring-ink-200" : "text-ink-700 hover:bg-ink-0"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-ink-200" aria-hidden />;
}

function SaveStatus({ state, error, onRetry }: { state: SaveState; error: string | null; onRetry?: () => void }) {
  if (state === "error") {
    return (
      <div role="alert" className="ml-auto flex items-center gap-2 text-sm text-red-700">
        <span>{error ?? "Couldn't save."}</span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="rounded-md border border-red-300 px-2 py-0.5 hover:bg-red-50">
            Retry
          </button>
        )}
      </div>
    );
  }
  const text = { saved: "Saved", unsaved: "Unsaved changes", saving: "Saving…" }[state];
  return (
    <span aria-live="polite" className="ml-auto flex shrink-0 items-center gap-1 text-sm text-ink-500">
      {state === "saved" && <CheckIcon size={14} weight="bold" className="text-brand-600" />}
      {text}
    </span>
  );
}

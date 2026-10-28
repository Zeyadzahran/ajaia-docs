"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { exportMarkdown } from "@/lib/export-markdown";

export function ExportMenu({ editor }: { editor: Editor | null }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
    if (menu.current) menu.current.open = false;
  }

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) close();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !menu.current?.open) return;
      event.preventDefault();
      close();
      menu.current.querySelector("summary")?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  function download() {
    close();
    if (!editor) return;

    const title = document.title.replace(/ · Ajaia Docs$/, "").trim() || "Document";
    const blob = new Blob([exportMarkdown(editor.getJSON())], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")}.md`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function print() {
    close();
    window.print();
  }

  return (
    <details
      ref={menu}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="relative shrink-0 text-sm"
    >
      <summary className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
        Export
      </summary>
      <div className="absolute right-0 top-full z-20 mt-1 min-w-44 rounded-md border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          disabled={!editor}
          onClick={download}
          className="block w-full rounded px-3 py-2 text-left hover:bg-slate-100 disabled:opacity-50"
        >
          Markdown (.md)
        </button>
        <button
          type="button"
          onClick={print}
          className="block w-full rounded px-3 py-2 text-left hover:bg-slate-100"
        >
          Print / Save as PDF
        </button>
      </div>
    </details>
  );
}

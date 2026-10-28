"use client";

import { useState } from "react";
import { renameDocument } from "@/app/doc/[id]/actions";
import { MAX_TITLE_LENGTH } from "@/lib/validation";

// Saves on Enter or when the field loses focus; Escape cancels.
export function TitleInput({ documentId, initialTitle }: { documentId: string; initialTitle: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);

  async function commit() {
    if (title === savedTitle) return;
    try {
      const result = await renameDocument(documentId, title);
      if (!result.ok) {
        setError(result.error);
        setTitle(savedTitle);
        return;
      }
      setSavedTitle(result.title);
      setTitle(result.title);
      setError(null);
      document.title = `${result.title} · Ajaia Docs`;
    } catch {
      setError("Couldn't reach the server. Check your connection.");
      setTitle(savedTitle);
    }
  }

  return (
    <div className="min-w-0 flex-1">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setTitle(savedTitle);
            setError(null);
            requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
          }
        }}
        maxLength={MAX_TITLE_LENGTH}
        aria-label="Document title"
        className="w-full truncate rounded-md border border-transparent px-2 py-1 text-lg font-semibold hover:border-slate-300 focus:border-blue-500 focus:outline-none"
      />
      {error && (
        <p role="alert" className="px-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

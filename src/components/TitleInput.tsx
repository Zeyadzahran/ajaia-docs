"use client";

import { useRef, useState } from "react";
import { renameDocument } from "@/app/doc/[id]/actions";
import { MAX_TITLE_LENGTH } from "@/lib/validation";

// Saves on Enter or when the field loses focus; Escape cancels.
export function TitleInput({ documentId, initialTitle }: { documentId: string; initialTitle: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);
  // Only the reply to the latest rename may update the field.
  const latestRequest = useRef(0);

  async function commit() {
    if (title === savedTitle) return;
    const submitted = title;
    const request = ++latestRequest.current;

    let result: Awaited<ReturnType<typeof renameDocument>>;
    try {
      result = await renameDocument(documentId, submitted);
    } catch {
      result = { ok: false, error: "Couldn't reach the server. Check your connection." };
    }
    if (request !== latestRequest.current) return;

    if (result.ok) {
      setSavedTitle(result.title);
      setError(null);
      document.title = `${result.title} · Ajaia Docs`;
    } else {
      setError(result.error);
    }
    // Leave the field alone if the user kept typing while the request was in flight.
    const replacement = result.ok ? result.title : savedTitle;
    setTitle((current) => (current === submitted ? replacement : current));
  }

  return (
    <div className="min-w-[10rem] flex-1">
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
        className="w-full truncate rounded-md border border-transparent px-2 py-1 text-lg font-semibold hover:border-ink-300 focus:border-brand-500 focus:outline-none"
      />
      {error && (
        <p role="alert" className="px-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

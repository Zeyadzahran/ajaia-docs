"use client";

import { useRef, useState, useTransition } from "react";
import { listVersionsAction, restoreVersionAction } from "@/app/doc/[id]/history-actions";
import type { VersionSummary } from "@/lib/versions";

export function HistoryButton({ documentId, canRestore }: { documentId: string; canRestore: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    dialog.current?.showModal();
    setError(null);
    startTransition(async () => {
      try {
        const result = await listVersionsAction(documentId);
        if (result.ok) setVersions(result.versions);
        else setError(result.error);
      } catch {
        setError("Couldn't load the history. Check your connection.");
      }
    });
  }

  function restore(versionId: string) {
    if (!confirm("Restore this version? The current text is saved as a version first, so you can undo this.")) return;
    startTransition(async () => {
      try {
        const result = await restoreVersionAction(versionId);
        if (result.ok) window.location.reload();
        else setError(result.error);
      } catch {
        setError("Couldn't restore. Check your connection.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        History
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="history-title"
        className="m-auto w-full max-w-lg rounded-xl p-0 shadow-xl backdrop:bg-slate-900/40"
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 id="history-title" className="text-lg font-semibold">
                Version history
              </h2>
              <p className="text-sm text-slate-500">A version is saved at most every 5 minutes while editing.</p>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className="-mr-2 -mt-1 rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {versions === null && pending && <p className="mt-4 text-sm text-slate-500">Loading…</p>}
          {versions?.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">No versions yet. One is saved the first time this document is edited.</p>
          )}

          <ul className="mt-4 max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {versions?.map((v) => (
              <li key={v.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block font-medium">
                    {new Date(v.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  <span className="block text-slate-500">
                    by {v.createdByName} · {v.title}
                  </span>
                  <span className="mt-1 block truncate text-slate-700">{v.excerpt}</span>
                </span>
                {canRestore && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => restore(v.id)}
                    className="shrink-0 rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Restore
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}

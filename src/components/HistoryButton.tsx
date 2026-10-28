"use client";

import { useRef, useState, useTransition } from "react";
import { ClockCounterClockwiseIcon, XIcon } from "@phosphor-icons/react";
import { listVersionsAction, restoreVersionAction } from "@/app/doc/[id]/history-actions";
import { button } from "@/components/ui";
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
        className={button("secondary")}
      >
        <ClockCounterClockwiseIcon size={16} />
        History
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="history-title"
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl p-0 shadow-2xl ring-1 ring-ink-200 backdrop:bg-ink-900/30 backdrop:backdrop-blur-[2px]"
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 id="history-title" className="text-lg font-semibold">
                Version history
              </h2>
              <p className="text-sm text-ink-500">A version is saved at most every 5 minutes while editing.</p>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className={`${button("ghost", "icon")} -mr-2 -mt-1`}
            >
              <XIcon size={18} />
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {versions === null && pending && <p className="mt-4 text-sm text-ink-500">Loading…</p>}
          {versions?.length === 0 && (
            <p className="mt-4 text-sm text-ink-500">No versions yet. One is saved the first time this document is edited.</p>
          )}

          <ul className="mt-4 max-h-96 divide-y divide-ink-100 overflow-y-auto">
            {versions?.map((v) => (
              <li key={v.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block font-medium">
                    {new Date(v.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  <span className="block text-ink-500">
                    by {v.createdByName} · {v.title}
                  </span>
                  <span className="mt-1 block truncate text-ink-700">{v.excerpt}</span>
                </span>
                {canRestore && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => restore(v.id)}
                    className={button("secondary", "sm")}
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

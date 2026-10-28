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

      {/* A full-height side panel: room to scan versions by day, like a document's history sidebar. */}
      <dialog
        ref={dialog}
        aria-labelledby="history-title"
        className="m-0 ml-auto h-dvh max-h-none w-full max-w-md bg-white p-0 shadow-2xl ring-1 ring-ink-200 backdrop:bg-ink-900/20 open:animate-[slide-in_200ms_ease-out]"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-ink-200 px-5 py-4">
            <div>
              <h2 id="history-title" className="flex items-center gap-2 text-base font-semibold">
                <ClockCounterClockwiseIcon size={18} className="text-ink-500" />
                Version history
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">Saved automatically, at most every 5 minutes.</p>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className={`${button("ghost", "icon")} -mr-2`}
            >
              <XIcon size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {error && (
              <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            {versions === null && pending && <p className="text-sm text-ink-500">Loading versions…</p>}
            {versions?.length === 0 && (
              <p className="text-sm text-ink-500">No versions yet. The first one is saved when this document is edited.</p>
            )}

            {versions &&
              groupByDay(versions).map(([day, items]) => (
                <section key={day} className="mb-6">
                  <h3 className="mb-2 text-xs font-medium text-ink-500">{day}</h3>
                  <ol className="relative space-y-1 border-l border-ink-200 pl-5">
                    {items.map((v) => {
                      const latest = v.id === versions[0].id;
                      return (
                        <li key={v.id} className="group relative rounded-lg p-3 hover:bg-ink-50">
                          <span
                            aria-hidden
                            className={`absolute -left-[25px] top-4 h-2.5 w-2.5 rounded-full ring-4 ring-white ${latest ? "bg-brand-600" : "bg-ink-300"}`}
                          />
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-ink-900">
                              {new Date(v.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                              {latest && (
                                <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
                                  Latest
                                </span>
                              )}
                            </span>
                            {canRestore && (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => restore(v.id)}
                                className={`${button("secondary", "sm")} opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100`}
                              >
                                Restore
                              </button>
                            )}
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand-700">
                              {v.createdByName[0]}
                            </span>
                            {v.createdByName}
                          </p>
                          <p className="mt-2 text-sm font-medium text-ink-800">{v.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-sm text-ink-600">{v.excerpt}</p>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
          </div>
        </div>
      </dialog>
    </>
  );
}

// Groups versions (newest first) under "Today", "Yesterday" or the date.
function groupByDay(versions: VersionSummary[]) {
  const groups = new Map<string, VersionSummary[]>();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  for (const v of versions) {
    const date = new Date(v.createdAt);
    const day =
      date.toDateString() === today
        ? "Today"
        : date.toDateString() === yesterday
          ? "Yesterday"
          : date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    groups.set(day, [...(groups.get(day) ?? []), v]);
  }
  return [...groups.entries()];
}

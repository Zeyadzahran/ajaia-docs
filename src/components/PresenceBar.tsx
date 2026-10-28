"use client";

import { useEffect, useRef, useState } from "react";
import { heartbeatAction } from "@/app/doc/[id]/history-actions";
import type { Viewer } from "@/lib/presence";

const HEARTBEAT_MS = 10 * 1000;
// Someone counts as "editing" if they typed in the editor within this window.
const EDITING_WINDOW_MS = 15 * 1000;
const COLORS = ["bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-sky-500", "bg-violet-500"];

export function PresenceBar({ documentId }: { documentId: string }) {
  const [others, setOthers] = useState<Viewer[]>([]);
  const lastTyped = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.(".ProseMirror")) lastTyped.current = Date.now();
    };
    const beat = async () => {
      if (document.hidden) return;
      try {
        const result = await heartbeatAction(documentId, Date.now() - lastTyped.current < EDITING_WINDOW_MS);
        setOthers(result.others);
      } catch {
        // A missed heartbeat only delays the indicator; the next one retries.
      }
    };

    document.addEventListener("keydown", onKey);
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearInterval(timer);
    };
  }, [documentId]);

  if (others.length === 0) return null;

  const first = others[0];
  const label =
    others.length === 1
      ? `${first.name.split(" ")[0]} is ${first.editing ? "editing" : "viewing"}`
      : `${others.length} others here`;

  return (
    <div className="hidden shrink-0 items-center gap-2 sm:flex" aria-live="polite">
      <div className="flex -space-x-1.5">
        {others.map((p) => (
          <span
            key={p.userId}
            title={`${p.name} is ${p.editing ? "editing" : "viewing"}`}
            className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold text-white ring-2 ring-white ${colorFor(p.userId)} ${
              p.editing ? "outline-2 outline-offset-1 outline-green-500" : ""
            }`}
          >
            {p.name[0]}
          </span>
        ))}
      </div>
      <span className="text-sm text-ink-600">{label}</span>
    </div>
  );
}

function colorFor(userId: string) {
  let hash = 0;
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

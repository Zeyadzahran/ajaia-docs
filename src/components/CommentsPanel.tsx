"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addCommentAction,
  deleteCommentAction,
  listCommentsAction,
  resolveCommentAction,
} from "@/app/doc/[id]/comment-actions";
import type { CommentResult, CommentView } from "@/lib/comments";

export function CommentsPanel({ documentId }: { documentId: string }) {
  const [comments, setComments] = useState<CommentView[]>([]);
  const [body, setBody] = useState("");
  const [quote, setQuote] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const request = useRef(0);

  const load = useCallback(async () => {
    if (busy.current) return;
    const current = ++request.current;
    try {
      const result = await listCommentsAction(documentId);
      if (current !== request.current) return;
      if (result.ok) {
        setComments(result.comments);
        setError(null);
      } else {
        setComments([]);
        setError(result.error);
      }
    } catch {
      if (current === request.current) setError("Couldn't refresh comments. Please try again.");
    } finally {
      if (current === request.current) setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    const requests = request;
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 10_000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      requests.current++;
    };
  }, [load]);

  async function run(label: string, action: () => Promise<CommentResult>, onSuccess?: () => void) {
    if (busy.current) return;
    busy.current = true;
    const current = ++request.current;
    setPending(label);
    setError(null);
    try {
      const result = await action();
      if (current !== request.current) return;
      if (result.ok) {
        setComments(result.comments);
        onSuccess?.();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Couldn't update comments. Check your connection.");
    } finally {
      busy.current = false;
      setLoading(false);
      setPending(null);
    }
  }

  function captureQuote() {
    const selection = window.getSelection();
    const editor = document.querySelector(".ProseMirror");
    if (!selection || !editor || selection.isCollapsed) return;
    if (!editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return;
    const text = selection.toString().trim();
    if (text) setQuote(text.length > 300 ? `${text.slice(0, 299)}…` : text);
  }

  const openCount = comments.filter((comment) => !comment.resolvedAt).length;
  const resolvedCount = comments.length - openCount;
  const visible = comments.filter((comment) => showResolved || !comment.resolvedAt);

  return (
    <aside
      aria-label="Document comments"
      className="border-t border-slate-200 bg-white p-4 lg:border-l lg:border-t-0 print:hidden"
    >
      <h2 className="text-lg font-semibold">Comments ({openCount})</h2>
      <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={showResolved}
          onChange={(event) => setShowResolved(event.target.checked)}
        />
        Show resolved
        {resolvedCount > 0 && <span className="text-xs text-slate-500">+{resolvedCount} resolved</span>}
      </label>

      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            "add",
            () => addCommentAction(documentId, { body, quote }),
            () => {
              setBody("");
              setQuote("");
            },
          );
        }}
      >
        {quote && (
          <div className="mb-2 flex items-start gap-2 rounded-md bg-slate-100 p-2 text-sm">
            <blockquote className="min-w-0 flex-1 whitespace-pre-wrap break-words">
              {quote}
            </blockquote>
            <button
              type="button"
              aria-label="Remove quote"
              onClick={() => setQuote("")}
              disabled={pending !== null}
              className="px-1 text-slate-500 hover:text-slate-900"
            >
              ✕
            </button>
          </div>
        )}
        <label htmlFor="comment-body" className="text-sm font-medium">
          Add a comment
        </label>
        <textarea
          id="comment-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onPointerDown={captureQuote}
          onFocus={captureQuote}
          maxLength={2000}
          rows={3}
          disabled={pending !== null}
          placeholder="Share feedback on this document…"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-slate-500">
          Select document text first to include a quote.
        </p>
        <button
          disabled={loading || pending !== null || !body.trim()}
          className="mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending === "add" ? "Posting…" : "Comment"}
        </button>
      </form>

      {error && (
        <div role="alert" className="mt-3 text-sm text-red-700">
          {error}{" "}
          <button
            type="button"
            onClick={() => void load()}
            disabled={pending !== null}
            className="underline"
          >
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <p role="status" className="mt-4 text-sm text-slate-500">
          Loading comments…
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          {comments.length
            ? "No open comments. Show resolved to see earlier feedback."
            : "No comments yet. Start the conversation."}
        </p>
      ) : (
        <ul className="mt-4 space-y-3" aria-live="polite">
          {visible.map((comment) => (
            <li key={comment.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                <span className="font-semibold text-slate-800">{comment.author}</span>
                <time
                  dateTime={comment.createdAt}
                  title={new Date(comment.createdAt).toLocaleString()}
                  className="text-slate-500"
                >
                  {relativeTime(comment.createdAt)}
                </time>
              </div>
              {comment.resolvedAt && (
                <p className="mt-1 text-xs font-medium text-green-700">Resolved</p>
              )}
              {comment.quote && (
                <blockquote className="mt-2 whitespace-pre-wrap break-words border-l-2 border-slate-300 pl-2 text-xs text-slate-500">
                  {comment.quote}
                </blockquote>
              )}
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">
                {comment.body}
              </p>
              <div className="mt-2 flex gap-3 text-xs">
                {comment.canResolve && (
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={() =>
                      void run(comment.id, () =>
                        resolveCommentAction({
                          documentId,
                          commentId: comment.id,
                          resolved: !comment.resolvedAt,
                        }),
                      )
                    }
                    className="text-blue-700 hover:underline disabled:opacity-50"
                  >
                    {pending === comment.id
                      ? "Updating…"
                      : comment.resolvedAt
                        ? "Reopen"
                        : "Resolve"}
                  </button>
                )}
                {comment.canDelete && (
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={() => {
                      if (!confirm("Delete this comment?")) return;
                      void run(comment.id, () =>
                        deleteCommentAction({ documentId, commentId: comment.id }),
                      );
                    }}
                    className="text-red-700 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (!minutes) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h ago`;
  return `${Math.floor(minutes / 1440)} d ago`;
}

"use client";

import { useRef, useState, useTransition } from "react";
import { removeShareAction, shareAction } from "@/app/doc/[id]/actions";
import type { Share } from "@/lib/sharing";

const DEMO_EMAILS = ["alice@example.com", "bob@example.com", "carol@example.com"];

type Notice = { kind: "success" | "error"; text: string } | null;

export function ShareDialog({
  documentId,
  ownerName,
  initialShares,
}: {
  documentId: string;
  ownerName: string;
  initialShares: Share[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [shares, setShares] = useState(initialShares);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Share["role"]>("EDITOR");
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => ReturnType<typeof shareAction> | ReturnType<typeof removeShareAction>, onOk?: () => void) {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) return setNotice({ kind: "error", text: result.error });
        setShares(result.shares);
        setNotice("message" in result ? { kind: "success", text: result.message } : null);
        onOk?.();
      } catch {
        setNotice({ kind: "error", text: "Couldn't reach the server. Check your connection." });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="flex shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Share
        {shares.length > 0 && <span className="rounded-full bg-white/25 px-1.5 text-xs">{shares.length}</span>}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="share-title"
        onClose={() => setNotice(null)}
        className="m-auto w-full max-w-md rounded-xl p-0 shadow-xl backdrop:bg-slate-900/40"
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <h2 id="share-title" className="text-lg font-semibold">
              Share document
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className="-mr-2 -mt-1 rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>

          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => shareAction(documentId, { email, role }), () => setEmail(""));
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              list="demo-emails"
              aria-label="Email address"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <datalist id="demo-emails">
              {DEMO_EMAILS.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
            <RoleSelect value={role} onChange={setRole} label="Role for new person" />
            <button
              disabled={pending}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "…" : "Share"}
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">Demo accounts: {DEMO_EMAILS.join(", ")}</p>

          {notice && (
            <p
              role={notice.kind === "error" ? "alert" : "status"}
              className={`mt-3 rounded-md px-3 py-2 text-sm ${
                notice.kind === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"
              }`}
            >
              {notice.text}
            </p>
          )}

          <h3 className="mt-6 text-sm font-semibold text-slate-700">People with access</h3>
          <ul className="mt-2 divide-y divide-slate-100">
            <li className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium">{ownerName} (you)</span>
              <span className="text-slate-500">Owner</span>
            </li>
            {shares.map((s) => (
              <li key={s.userId} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="block truncate text-slate-500">{s.email}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <RoleSelect
                    value={s.role}
                    label={`Role for ${s.name}`}
                    disabled={pending}
                    onChange={(next) => run(() => shareAction(documentId, { email: s.email, role: next }))}
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => removeShareAction(documentId, s.userId))}
                    className="rounded-md px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {shares.length === 0 && <p className="mt-1 text-sm text-slate-500">Only you can open this document.</p>}
        </div>
      </dialog>
    </>
  );
}

function RoleSelect({
  value,
  onChange,
  label,
  disabled,
}: {
  value: Share["role"];
  onChange: (role: Share["role"]) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => onChange(e.target.value as Share["role"])}
      className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
    >
      <option value="EDITOR">Can edit</option>
      <option value="VIEWER">Can view</option>
    </select>
  );
}

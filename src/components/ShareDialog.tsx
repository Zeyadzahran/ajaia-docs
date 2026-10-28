"use client";

import { useRef, useState, useTransition } from "react";
import { UserPlusIcon, XIcon } from "@phosphor-icons/react";
import { removeShareAction, shareAction } from "@/app/doc/[id]/actions";
import { button, input } from "@/components/ui";
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
        className={button("primary")}
      >
        <UserPlusIcon size={16} weight="bold" />
        Share
        {shares.length > 0 && <span className="rounded-full bg-white/20 px-1.5 text-xs tabular-nums">{shares.length}</span>}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="share-title"
        onClose={() => setNotice(null)}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl p-0 shadow-2xl ring-1 ring-ink-200 backdrop:bg-ink-900/30 backdrop:backdrop-blur-[2px]"
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
              className={`${button("ghost", "icon")} -mr-2 -mt-1`}
            >
              <XIcon size={18} />
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
              className={`${input} min-w-0 flex-1`}
            />
            <datalist id="demo-emails">
              {DEMO_EMAILS.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
            <RoleSelect value={role} onChange={setRole} label="Role for new person" />
            <button
              disabled={pending}
              className={button("primary")}
            >
              {pending ? "…" : "Share"}
            </button>
          </form>
          <p className="mt-2 text-xs text-ink-500">Demo accounts: {DEMO_EMAILS.join(", ")}</p>

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

          <h3 className="mt-6 text-sm font-medium text-ink-900">People with access</h3>
          <ul className="mt-2 divide-y divide-ink-100">
            <li className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium">{ownerName} (you)</span>
              <span className="text-ink-500">Owner</span>
            </li>
            {shares.map((s) => (
              <li key={s.userId} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="block truncate text-ink-500">{s.email}</span>
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
                    className={button("danger", "sm")}
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {shares.length === 0 && <p className="mt-1 text-sm text-ink-500">Only you can open this document.</p>}
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
      className={`${input} pr-7 disabled:opacity-50`}
    >
      <option value="EDITOR">Can edit</option>
      <option value="VIEWER">Can view</option>
    </select>
  );
}

import type { JSONContent } from "@tiptap/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { DocumentEditor } from "@/components/DocumentEditor";
import { ShareDialog } from "@/components/ShareDialog";
import { TitleInput } from "@/components/TitleInput";
import { getDocumentFor } from "@/lib/documents";
import { requireUser } from "@/lib/session";
import { listShares } from "@/lib/sharing";

const ROLE_BADGE = {
  owner: { label: "Owner", className: "bg-blue-50 text-blue-700" },
  editor: { label: "Can edit", className: "bg-amber-50 text-amber-800" },
  viewer: { label: "Can view", className: "bg-slate-100 text-slate-700" },
};

export default async function DocumentPage({ params }: PageProps<"/doc/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const doc = await getDocumentFor(id, user.id);
  if (!doc) notFound();

  const isOwner = doc.role === "owner";
  const shares = isOwner ? ((await listShares(doc.id, user.id)) ?? []) : [];
  const badge = ROLE_BADGE[doc.role];

  return (
    <>
      <title>{`${doc.title} · Ajaia Docs`}</title>
      <AppHeader user={user} />
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
          <Link
            href="/"
            className="shrink-0 rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            aria-label="Back to all documents"
          >
            ← Documents
          </Link>
          {doc.role === "viewer" ? (
            <h1 className="min-w-0 flex-1 truncate px-2 py-1 text-lg font-semibold">{doc.title}</h1>
          ) : (
            <TitleInput documentId={doc.id} initialTitle={doc.title} />
          )}
          {!isOwner && <span className="hidden shrink-0 text-sm text-slate-500 sm:inline">Shared by {doc.owner.name}</span>}
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
          {isOwner && <ShareDialog documentId={doc.id} ownerName={user.name} initialShares={shares} />}
        </div>
      </div>
      <DocumentEditor
        documentId={doc.id}
        initialContent={doc.content as JSONContent}
        readOnly={doc.role === "viewer"}
      />
    </>
  );
}

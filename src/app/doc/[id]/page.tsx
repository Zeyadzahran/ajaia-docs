import type { JSONContent } from "@tiptap/react";
import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CommentsPanel } from "@/components/CommentsPanel";
import { DocumentEditor } from "@/components/DocumentEditor";
import { HistoryButton } from "@/components/HistoryButton";
import { PresenceBar } from "@/components/PresenceBar";
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

// cache() lets the page and its metadata share one lookup per request.
const loadDocument = cache(async (id: string) => {
  const user = await requireUser();
  return { user, doc: await getDocumentFor(id, user.id) };
});

export async function generateMetadata({ params }: PageProps<"/doc/[id]">): Promise<Metadata> {
  const { doc } = await loadDocument((await params).id);
  return { title: doc ? `${doc.title} · Ajaia Docs` : "Not found · Ajaia Docs" };
}

export default async function DocumentPage({ params }: PageProps<"/doc/[id]">) {
  const { user, doc } = await loadDocument((await params).id);
  if (!doc) notFound();

  const isOwner = doc.role === "owner";
  const shares = isOwner ? ((await listShares(doc.id, user.id)) ?? []) : [];
  const badge = ROLE_BADGE[doc.role];

  return (
    <>
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
          <PresenceBar documentId={doc.id} />
          {!isOwner && <span className="hidden shrink-0 text-sm text-slate-500 sm:inline">Shared by {doc.owner.name}</span>}
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
          <HistoryButton documentId={doc.id} canRestore={doc.role !== "viewer"} />
          {isOwner && <ShareDialog documentId={doc.id} ownerName={user.name} initialShares={shares} />}
        </div>
      </div>
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] print:block">
        <div className="min-w-0">
          <DocumentEditor
            documentId={doc.id}
            initialContent={doc.content as JSONContent}
            readOnly={doc.role === "viewer"}
          />
        </div>
        <CommentsPanel documentId={doc.id} />
      </div>
    </>
  );
}

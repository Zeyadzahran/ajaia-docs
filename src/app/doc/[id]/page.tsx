import type { JSONContent } from "@tiptap/react";
import type { Metadata } from "next";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { DocumentEditor } from "@/components/DocumentEditor";
import { HistoryButton } from "@/components/HistoryButton";
import { PresenceBar } from "@/components/PresenceBar";
import { ShareDialog } from "@/components/ShareDialog";
import { TitleInput } from "@/components/TitleInput";
import { button } from "@/components/ui";
import { getDocumentFor } from "@/lib/documents";
import { requireUser } from "@/lib/session";
import { listShares } from "@/lib/sharing";

const ROLE_BADGE = {
  owner: { label: "Owner", className: "bg-brand-50 text-brand-700 ring-1 ring-brand-100" },
  editor: { label: "Can edit", className: "bg-brand-50 text-brand-700 ring-1 ring-brand-100" },
  viewer: { label: "Can view", className: "bg-ink-100 text-ink-700 ring-1 ring-ink-200" },
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
      <div className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 pt-3 pb-1 sm:flex-nowrap sm:px-6">
          <Link href="/" className={button("ghost", "icon")} aria-label="Back to all documents" title="All documents">
            <ArrowLeftIcon size={18} />
          </Link>
          {doc.role === "viewer" ? (
            <h1 className="min-w-[10rem] flex-1 truncate px-2 py-1 text-lg font-semibold tracking-tight">{doc.title}</h1>
          ) : (
            <TitleInput documentId={doc.id} initialTitle={doc.title} />
          )}
          <PresenceBar documentId={doc.id} />
          {!isOwner && <span className="hidden shrink-0 text-sm text-ink-500 sm:inline">Shared by {doc.owner.name}</span>}
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
          <HistoryButton documentId={doc.id} canRestore={doc.role !== "viewer"} />
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

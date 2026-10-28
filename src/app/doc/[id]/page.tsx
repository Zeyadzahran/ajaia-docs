import type { JSONContent } from "@tiptap/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { DocumentEditor } from "@/components/DocumentEditor";
import { TitleInput } from "@/components/TitleInput";
import { getDocumentFor } from "@/lib/documents";
import { requireUser } from "@/lib/session";

export default async function DocumentPage({ params }: PageProps<"/doc/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const doc = await getDocumentFor(id, user.id);
  if (!doc) notFound();

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
          <TitleInput documentId={doc.id} initialTitle={doc.title} />
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              doc.role === "owner" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-800"
            }`}
          >
            {doc.role === "owner" ? "Owner" : `Shared by ${doc.owner.name}`}
          </span>
        </div>
      </div>
      <DocumentEditor documentId={doc.id} initialContent={doc.content as JSONContent} />
    </>
  );
}

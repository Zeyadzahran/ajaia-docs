import { ImportButton } from "@/components/ImportButton";
import Link from "next/link";
import { createDocumentAction } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { listDocumentsFor, type DocumentSummary } from "@/lib/documents";
import { requireUser } from "@/lib/session";

export default async function HomePage() {
  const user = await requireUser();
  const { owned, shared } = await listDocumentsFor(user.id);

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Documents</h1>
          <div className="flex items-start gap-2">
          <ImportButton />
          <form action={createDocumentAction}>
            <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              + New document
            </button>
          </form>
          </div>
        </div>

        <p className="mt-2 text-sm text-slate-500">Import .txt, .md or .docx (max 2 MB)</p>

        <DocumentList
          title="My documents"
          docs={owned}
          empty="You have no documents yet. Create one to get started."
        />
        <DocumentList
          title="Shared with me"
          docs={shared}
          empty="Nothing has been shared with you yet."
        />
      </main>
    </>
  );
}

function DocumentList({ title, docs, empty }: { title: string; docs: DocumentSummary[]; empty: string }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title} <span className="text-slate-400">({docs.length})</span>
      </h2>
      {docs.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          {empty}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {docs.map((doc) => (
            <li key={doc.id}>
              <Link href={`/doc/${doc.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                <span className="font-medium">{doc.title}</span>
                <span className="text-sm text-slate-500">
                  {doc.role === "shared" && <span className="mr-3">Owner: {doc.ownerName}</span>}
                  Edited {timeAgo(doc.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function timeAgo(date: Date) {
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

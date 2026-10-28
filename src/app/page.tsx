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
          <form action={createDocumentAction}>
            <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              + New document
            </button>
          </form>
        </div>

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
              <Link
                href={`/doc/${doc.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
              >
                <span className="min-w-0 truncate font-medium">{doc.title}</span>
                <span className="flex shrink-0 items-center gap-3 text-sm text-slate-500">
                  {doc.role === "owner" && doc.shareCount > 0 && (
                    <Tag>
                      Shared with {doc.shareCount} {doc.shareCount === 1 ? "person" : "people"}
                    </Tag>
                  )}
                  {doc.role !== "owner" && (
                    <>
                      <span className="hidden sm:inline">Owner: {doc.ownerName}</span>
                      <Tag>{doc.role === "editor" ? "Can edit" : "Can view"}</Tag>
                    </>
                  )}
                  <span className="hidden sm:inline">Edited {timeAgo(doc.updatedAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{children}</span>;
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

import { FileTextIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { ImportButton } from "@/components/ImportButton";
import { createDocumentAction } from "@/app/actions";
import { AppHeader } from "@/components/AppHeader";
import { button } from "@/components/ui";
import { listDocumentsFor, type DocumentSummary } from "@/lib/documents";
import { requireUser } from "@/lib/session";

export default async function HomePage() {
  const user = await requireUser();
  const { owned, shared } = await listDocumentsFor(user.id);

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
            <p className="mt-1 text-sm text-ink-500">Import .txt, .md or .docx files up to 2 MB, or start from a blank page.</p>
          </div>
          <div className="flex items-start gap-2">
            <ImportButton />
            <form action={createDocumentAction}>
              <button className={button("primary")}>
                <PlusIcon size={16} weight="bold" />
                New document
              </button>
            </form>
          </div>
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

function DocumentList({
  title,
  docs,
  empty,
}: {
  title: string;
  docs: DocumentSummary[];
  empty: string;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-ink-900">
        {title} <span className="ml-1 font-normal text-ink-400 tabular-nums">{docs.length}</span>
      </h2>
      {docs.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-ink-300 px-4 py-8 text-center text-sm text-ink-500">
          {empty}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-ink-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-ink-200">
          {docs.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/doc/${doc.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-ink-50"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <FileTextIcon size={22} weight="duotone" className="shrink-0 text-brand-600" />
                  <span className="truncate font-medium">{doc.title}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3 text-sm text-ink-500">
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
  return <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700">{children}</span>;
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

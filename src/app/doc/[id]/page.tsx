import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { getDocumentFor } from "@/lib/documents";
import { requireUser } from "@/lib/session";

export default async function DocumentPage({ params }: PageProps<"/doc/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const doc = await getDocumentFor(id, user.id);
  if (!doc) notFound();

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold">{doc.title}</h1>
        <p className="mt-2 text-sm text-slate-500">Editor coming in the next step.</p>
      </main>
    </>
  );
}

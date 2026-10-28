// Runs against the real database (DATABASE_URL from .env.local) using the seeded
// users alice, bob and carol. It creates one document and deletes it at the end.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("document access rules", async () => {
  const { prisma } = await import("@/lib/db");
  const { createDocument, getDocumentFor, listDocumentsFor, updateDocument } = await import("@/lib/documents");
  const { listShares, removeShare, shareDocument } = await import("@/lib/sharing");

  let docId: string;

  beforeAll(async () => {
    docId = await createDocument("alice", "Access test document");
  });

  afterAll(async () => {
    await prisma.document.deleteMany({ where: { id: docId } });
  });

  it("only the owner can open a document that isn't shared", async () => {
    expect(await getDocumentFor(docId, "alice")).toMatchObject({ role: "owner" });
    expect(await getDocumentFor(docId, "bob")).toBeNull();
    expect(await updateDocument(docId, "carol", { title: "hacked" })).toBe(false);
  });

  it("a viewer can open but not edit", async () => {
    const result = await shareDocument(docId, "alice", { email: "bob@example.com", role: "VIEWER" });
    expect(result.ok).toBe(true);

    expect(await getDocumentFor(docId, "bob")).toMatchObject({ role: "viewer" });
    expect(await updateDocument(docId, "bob", { title: "edited by viewer" })).toBe(false);
    const { shared } = await listDocumentsFor("bob");
    expect(shared.find((d) => d.id === docId)).toMatchObject({ role: "viewer", ownerName: "Alice Chen" });
  });

  it("an editor can edit, and carol still has no access", async () => {
    await shareDocument(docId, "alice", { email: "BOB@example.com ", role: "EDITOR" });

    expect(await updateDocument(docId, "bob", { title: "edited by editor" })).toBe(true);
    expect(await getDocumentFor(docId, "carol")).toBeNull();
    expect((await listShares(docId, "alice"))?.map((s) => [s.userId, s.role])).toEqual([["bob", "EDITOR"]]);
  });

  it("only the owner can manage sharing", async () => {
    expect(await shareDocument(docId, "bob", { email: "carol@example.com", role: "EDITOR" })).toMatchObject({ ok: false });
    expect(await listShares(docId, "bob")).toBeNull();
    expect(await removeShare(docId, "bob", "bob")).toMatchObject({ ok: false });
  });

  it("rejects unknown emails, invalid input and sharing with yourself", async () => {
    expect(await shareDocument(docId, "alice", { email: "nobody@example.com", role: "EDITOR" })).toMatchObject({
      ok: false,
      error: "No user with the email nobody@example.com.",
    });
    expect(await shareDocument(docId, "alice", { email: "not-an-email", role: "EDITOR" })).toMatchObject({ ok: false });
    expect(await shareDocument(docId, "alice", { email: "bob@example.com", role: "ADMIN" })).toMatchObject({ ok: false });
    expect(await shareDocument(docId, "alice", { email: "alice@example.com", role: "EDITOR" })).toMatchObject({ ok: false });
  });

  it("removing a share takes access away", async () => {
    expect(await removeShare(docId, "alice", "bob")).toMatchObject({ ok: true, shares: [] });
    expect(await getDocumentFor(docId, "bob")).toBeNull();
  });
});

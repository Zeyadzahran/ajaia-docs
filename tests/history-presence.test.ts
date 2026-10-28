// DB integration tests for version history and presence, using the seeded users.
// Creates one document shared with bob (editor) and carol (viewer), then deletes it.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const hasDb = Boolean(process.env.DATABASE_URL);

const paragraph = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

describe.skipIf(!hasDb)("version history and presence", async () => {
  const { prisma } = await import("@/lib/db");
  const { createDocument, getDocumentFor, updateDocument } = await import("@/lib/documents");
  const { shareDocument } = await import("@/lib/sharing");
  const { listVersions, restoreVersion, snapshotIfDue, SNAPSHOT_EVERY_MS } = await import("@/lib/versions");
  const { heartbeat, ACTIVE_MS } = await import("@/lib/presence");

  let docId: string;

  beforeAll(async () => {
    docId = await createDocument("alice", "History test document");
    await shareDocument(docId, "alice", { email: "bob@example.com", role: "EDITOR" });
    await shareDocument(docId, "alice", { email: "carol@example.com", role: "VIEWER" });
  });

  // Delete by unique id only; the versions, presence and shares cascade.
  afterAll(async () => {
    if (docId) await prisma.document.delete({ where: { id: docId } });
  });

  it("snapshots on the first save, then at most once per interval", async () => {
    await updateDocument(docId, "alice", { content: paragraph("first draft") });
    expect(await snapshotIfDue(docId, "alice")).toBe(true);

    await updateDocument(docId, "alice", { content: paragraph("second draft") });
    expect(await snapshotIfDue(docId, "alice")).toBe(false);

    // Pretend the first snapshot is older than the interval.
    const [first] = await prisma.documentVersion.findMany({ where: { documentId: docId } });
    await prisma.documentVersion.update({
      where: { id: first.id },
      data: { createdAt: new Date(Date.now() - SNAPSHOT_EVERY_MS - 1000) },
    });
    expect(await snapshotIfDue(docId, "bob")).toBe(true);

    const versions = await listVersions(docId, "carol");
    expect(versions?.map((v) => v.excerpt)).toEqual(["second draft", "first draft"]);
    expect(versions?.[0].createdByName).toBe("Bob Martin");
  });

  it("lets editors restore, keeps the replaced text as a version, and blocks viewers", async () => {
    const [, firstDraft] = (await listVersions(docId, "alice"))!;
    await updateDocument(docId, "alice", { content: paragraph("latest text") });

    expect(await restoreVersion(firstDraft.id, "carol")).toBe(false);
    expect(await restoreVersion(firstDraft.id, "bob")).toBe(true);

    const doc = await getDocumentFor(docId, "alice");
    expect(JSON.stringify(doc?.content)).toContain("first draft");
    expect((await listVersions(docId, "alice"))?.[0].excerpt).toBe("latest text");
  });

  it("creates one snapshot when saves arrive at the same moment", async () => {
    const fresh = await createDocument("alice", "Concurrent snapshot test");
    try {
      const results = await Promise.all([1, 2, 3].map(() => snapshotIfDue(fresh, "alice")));
      expect(results.filter(Boolean)).toHaveLength(1);
      expect(await prisma.documentVersion.count({ where: { documentId: fresh } })).toBe(1);
    } finally {
      await prisma.document.delete({ where: { id: fresh } });
    }
  });

  it("never loses an edit that races a restore", async () => {
    const oldest = (await listVersions(docId, "alice"))!.at(-1)!;
    await Promise.all([
      restoreVersion(oldest.id, "bob"),
      updateDocument(docId, "alice", { content: paragraph("racing edit") }),
    ]);

    // Either the edit landed after the restore (it's in the doc) or before it (it's in the backup).
    const doc = await getDocumentFor(docId, "alice");
    const versions = await prisma.documentVersion.findMany({ where: { documentId: docId }, select: { content: true } });
    const everything = [doc?.content, ...versions.map((v) => v.content)].map((c) => JSON.stringify(c)).join("\n");
    expect(everything).toContain("racing edit");
  });

  it("hides history from people without access", async () => {
    await prisma.documentShare.delete({ where: { documentId_userId: { documentId: docId, userId: "carol" } } });
    expect(await listVersions(docId, "carol")).toBeNull();
    await shareDocument(docId, "alice", { email: "carol@example.com", role: "VIEWER" });
  });

  it("shows who else is here, drops stale heartbeats, and rejects strangers", async () => {
    const now = new Date();
    await heartbeat(docId, "bob", true, now);
    await heartbeat(docId, "carol", false, new Date(now.getTime() - ACTIVE_MS - 1000));

    expect(await heartbeat(docId, "alice", false, now)).toEqual([{ userId: "bob", name: "Bob Martin", editing: true }]);
    await prisma.documentShare.delete({ where: { documentId_userId: { documentId: docId, userId: "carol" } } });
    expect(await heartbeat(docId, "carol", false, now)).toBeNull();
  });
});

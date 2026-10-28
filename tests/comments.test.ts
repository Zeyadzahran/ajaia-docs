import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

if (process.env.DATABASE_URL) {
  describe("document comments", async () => {
    const { prisma } = await import("@/lib/db");
    const { createDocument } = await import("@/lib/documents");
    const { shareDocument, removeShare } = await import("@/lib/sharing");
    const { addComment, deleteComment, listComments, setCommentResolved } = await import(
      "@/lib/comments"
    );

    let docId: string | undefined;
    let ownerCommentId: string;
    let viewerCommentId: string;

    function id() {
      if (!docId) throw new Error("Test document was not created.");
      return docId;
    }

    beforeAll(async () => {
      docId = await createDocument("alice", "Comments integration test");
      await shareDocument(docId, "alice", { email: "carol@example.com", role: "VIEWER" });
      const added = await addComment(docId, "alice", { body: "Owner feedback" });
      if (!added.ok) throw new Error(added.error);
      ownerCommentId = added.comments[0].id;
    }, 30_000);

    afterAll(async () => {
      if (docId && (await prisma.document.findUnique({ where: { id: docId } }))) {
        await prisma.document.delete({ where: { id: docId } });
      }
    }, 30_000);

    it("a viewer can read and add a trimmed comment with a bounded quote", async () => {
      const result = await addComment(id(), "carol", {
        body: "  Viewer feedback  ",
        quote: "x".repeat(350),
      });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.error);
      const comment = result.comments.find((entry) => entry.body === "Viewer feedback");
      expect(comment).toMatchObject({ author: "Carol Diaz", canResolve: true, canDelete: true });
      expect(comment?.quote).toBe("x".repeat(299) + "…");
      viewerCommentId = comment!.id;
    });

    it("a stranger cannot read or add, with the same response as a missing document", async () => {
      const missing = await listComments(randomUUID(), "bob");
      expect(await listComments(id(), "bob")).toEqual(missing);
      expect(await addComment(id(), "bob", { body: "No access" })).toEqual(missing);
      expect(await addComment(id(), "bob", { body: "" })).toEqual(missing);
    });

    it("only the author can delete, even when the other user owns the document", async () => {
      expect(await deleteComment(id(), "alice", viewerCommentId)).toMatchObject({ ok: false });
      expect(await deleteComment(id(), "carol", ownerCommentId)).toMatchObject({ ok: false });
      const added = await addComment(id(), "carol", { body: "Temporary comment" });
      if (!added.ok) throw new Error(added.error);
      const temporary = added.comments.find((entry) => entry.body === "Temporary comment")!;
      expect(await deleteComment(id(), "carol", temporary.id)).toMatchObject({ ok: true });
      expect(await prisma.comment.findUnique({ where: { id: temporary.id } })).toBeNull();
    });

    it("an editor can resolve and reopen someone else's comment", async () => {
      await shareDocument(id(), "alice", { email: "bob@example.com", role: "EDITOR" });
      const result = await setCommentResolved(id(), "bob", ownerCommentId, true);
      expect(result.ok).toBe(true);
      const stored = await prisma.comment.findUnique({ where: { id: ownerCommentId } });
      expect(stored?.resolvedAt).toBeInstanceOf(Date);
      expect(stored?.resolvedById).toBe("bob");
      expect(await setCommentResolved(id(), "bob", ownerCommentId, false)).toMatchObject({
        ok: true,
      });
      expect(await prisma.comment.findUnique({ where: { id: ownerCommentId } })).toMatchObject({
        resolvedAt: null,
        resolvedById: null,
      });
      expect(await deleteComment(id(), "bob", viewerCommentId)).toMatchObject({ ok: false });
    });

    it("a viewer cannot resolve another author's comment, but can resolve their own", async () => {
      expect(await setCommentResolved(id(), "carol", ownerCommentId, true)).toMatchObject({
        ok: false,
      });
      expect(await setCommentResolved(id(), "carol", viewerCommentId, true)).toMatchObject({
        ok: true,
      });
      expect(await setCommentResolved(id(), "carol", viewerCommentId, false)).toMatchObject({
        ok: true,
      });
      expect(await setCommentResolved(id(), "alice", viewerCommentId, true)).toMatchObject({
        ok: true,
      });
    });

    it("rejects empty or oversized bodies and accepts the boundary", async () => {
      for (const body of ["", "   ", "x".repeat(2001)]) {
        expect(await addComment(id(), "alice", { body })).toMatchObject({ ok: false });
      }
      const result = await addComment(id(), "alice", {
        body: "x".repeat(2000),
        quote: "  context  ",
      });
      expect(result.ok).toBe(true);
      if (result.ok)
        expect(result.comments.find((entry) => entry.body.length === 2000)?.quote).toBe("context");
    });

    it("rejects missing or cross-document mutation identifiers", async () => {
      expect(await deleteComment(id(), "alice", undefined as unknown as string)).toMatchObject({
        ok: false,
      });
      expect(
        await setCommentResolved(id(), "alice", undefined as unknown as string, true),
      ).toMatchObject({ ok: false });
      expect(await setCommentResolved(randomUUID(), "alice", ownerCommentId, true)).toMatchObject({
        ok: false,
      });
      expect(await prisma.comment.findUnique({ where: { id: ownerCommentId } })).not.toBeNull();
    });

    it("revoked viewers cannot read or modify their own comments", async () => {
      await removeShare(id(), "alice", "carol");
      expect(await listComments(id(), "carol")).toMatchObject({ ok: false });
      expect(await deleteComment(id(), "carol", viewerCommentId)).toMatchObject({ ok: false });
      expect(await setCommentResolved(id(), "carol", viewerCommentId, false)).toMatchObject({
        ok: false,
      });
    });
  });
} else {
  it.skip("comments integration requires DATABASE_URL and seeded users", () => {});
}

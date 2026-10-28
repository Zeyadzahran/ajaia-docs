import { z } from "zod";
import { prisma } from "./db";
import { canEdit, canView, documentId } from "./documents";

export const commentInput = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a comment first.")
    .max(2000, "Comments can be up to 2000 characters."),
  quote: z
    .string()
    .trim()
    .transform((text) => (text.length > 300 ? `${text.slice(0, 299)}…` : text))
    .optional(),
});

export type CommentView = {
  id: string;
  author: string;
  body: string;
  quote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  canResolve: boolean;
  canDelete: boolean;
};

export type CommentResult = { ok: true; comments: CommentView[] } | { ok: false; error: string };

const UNAVAILABLE = "This document or comment is unavailable.";

async function hasAccess(id: string, userId: string) {
  if (!userId || !documentId.safeParse(id).success) return false;
  return Boolean(
    await prisma.document.findFirst({
      where: { id, ...canView(userId) },
      select: { id: true },
    }),
  );
}

export async function listComments(id: string, userId: string): Promise<CommentResult> {
  if (!(await hasAccess(id, userId))) return { ok: false, error: UNAVAILABLE };

  const [editable, comments] = await Promise.all([
    prisma.document.findFirst({ where: { id, ...canEdit(userId) }, select: { id: true } }),
    prisma.comment.findMany({
      where: { documentId: id, document: canView(userId) },
      include: { author: { select: { name: true } } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);

  return {
    ok: true,
    comments: comments.map((comment) => ({
      id: comment.id,
      author: comment.author.name,
      body: comment.body,
      quote: comment.quote,
      createdAt: comment.createdAt.toISOString(),
      resolvedAt: comment.resolvedAt?.toISOString() ?? null,
      canResolve: Boolean(editable) || comment.authorId === userId,
      canDelete: comment.authorId === userId,
    })),
  };
}

export async function addComment(
  id: string,
  userId: string,
  input: unknown,
): Promise<CommentResult> {
  if (!(await hasAccess(id, userId))) return { ok: false, error: UNAVAILABLE };
  const parsed = commentInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  await prisma.comment.create({
    data: {
      documentId: id,
      authorId: userId,
      body: parsed.data.body,
      quote: parsed.data.quote || null,
    },
  });
  return listComments(id, userId);
}

export async function setCommentResolved(
  id: string,
  userId: string,
  commentId: string,
  resolved: boolean,
): Promise<CommentResult> {
  if (
    !(await hasAccess(id, userId)) ||
    !documentId.safeParse(commentId).success ||
    typeof resolved !== "boolean"
  ) {
    return { ok: false, error: UNAVAILABLE };
  }

  try {
    await prisma.comment.update({
      where: {
        id: commentId,
        documentId: id,
        document: canView(userId),
        OR: [{ authorId: userId }, { document: canEdit(userId) }],
      },
      data: { resolvedAt: resolved ? new Date() : null, resolvedById: resolved ? userId : null },
    });
  } catch (error) {
    if (isMissing(error)) return { ok: false, error: UNAVAILABLE };
    throw error;
  }
  return listComments(id, userId);
}

export async function deleteComment(
  id: string,
  userId: string,
  commentId: string,
): Promise<CommentResult> {
  if (!(await hasAccess(id, userId)) || !documentId.safeParse(commentId).success) {
    return { ok: false, error: UNAVAILABLE };
  }

  try {
    await prisma.comment.delete({
      where: { id: commentId, documentId: id, authorId: userId, document: canView(userId) },
    });
  } catch (error) {
    if (isMissing(error)) return { ok: false, error: UNAVAILABLE };
    throw error;
  }
  return listComments(id, userId);
}

function isMissing(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
}

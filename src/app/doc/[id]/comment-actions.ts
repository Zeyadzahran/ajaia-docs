"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { documentId } from "@/lib/documents";
import {
  addComment,
  commentInput,
  deleteComment,
  listComments,
  setCommentResolved,
  type CommentResult,
} from "@/lib/comments";

const target = z.object({ documentId, commentId: documentId });
const UNAVAILABLE = "This document or comment is unavailable.";

async function run(action: (userId: string) => Promise<CommentResult>): Promise<CommentResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Sign in to read or add comments." };
    return await action(user.id);
  } catch {
    return { ok: false, error: "Couldn't load or update comments. Please try again." };
  }
}

export async function listCommentsAction(id: string): Promise<CommentResult> {
  return run((userId) =>
    documentId.safeParse(id).success
      ? listComments(id, userId)
      : Promise.resolve({ ok: false, error: UNAVAILABLE }),
  );
}

export async function addCommentAction(id: string, input: unknown): Promise<CommentResult> {
  return run(async (userId) => {
    if (!documentId.safeParse(id).success) return { ok: false, error: UNAVAILABLE };
    // Check access before reporting body errors, so inaccessible docs remain indistinguishable.
    const access = await listComments(id, userId);
    if (!access.ok) return access;
    const parsed = commentInput.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    return addComment(id, userId, parsed.data);
  });
}

export async function resolveCommentAction(input: unknown): Promise<CommentResult> {
  return run((userId) => {
    const parsed = target.extend({ resolved: z.boolean() }).safeParse(input);
    if (!parsed.success) return Promise.resolve({ ok: false, error: UNAVAILABLE });
    return setCommentResolved(
      parsed.data.documentId,
      userId,
      parsed.data.commentId,
      parsed.data.resolved,
    );
  });
}

export async function deleteCommentAction(input: unknown): Promise<CommentResult> {
  return run((userId) => {
    const parsed = target.safeParse(input);
    if (!parsed.success) return Promise.resolve({ ok: false, error: UNAVAILABLE });
    return deleteComment(parsed.data.documentId, userId, parsed.data.commentId);
  });
}

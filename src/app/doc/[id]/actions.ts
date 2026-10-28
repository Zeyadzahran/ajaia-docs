"use server";

import type { Prisma } from "@/generated/prisma/client";
import { updateDocument } from "@/lib/documents";
import { getCurrentUser } from "@/lib/session";
import { removeShare, shareDocument } from "@/lib/sharing";
import { contentSchema, titleSchema } from "@/lib/validation";
import { snapshotIfDue } from "@/lib/versions";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const SIGNED_OUT = "Your session has ended. Sign in again to keep editing.";
const NO_ACCESS = "This document no longer exists or you can't edit it.";

// Content arrives as a JSON string: passing the editor's object straight through
// React's server-action serialization broke Prisma when it inspected the value.
export async function saveContent(id: string, json: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: SIGNED_OUT };

  const parsed = contentSchema.safeParse(parseJson(json));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const saved = await updateDocument(id, user.id, { content: parsed.data as Prisma.InputJsonValue });
  if (!saved) return { ok: false, error: NO_ACCESS };
  await snapshotIfDue(id, user.id);
  return { ok: true };
}

export async function renameDocument(id: string, title: unknown): Promise<Result<{ title: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: SIGNED_OUT };

  const parsed = titleSchema.safeParse(title);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const saved = await updateDocument(id, user.id, { title: parsed.data });
  return saved ? { ok: true, title: parsed.data } : { ok: false, error: NO_ACCESS };
}

export async function shareAction(id: string, input: { email: string; role: string }) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: SIGNED_OUT };
  return shareDocument(id, user.id, input);
}

export async function removeShareAction(id: string, userId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: SIGNED_OUT };
  return removeShare(id, user.id, userId);
}

function parseJson(json: unknown) {
  if (typeof json !== "string") return undefined;
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

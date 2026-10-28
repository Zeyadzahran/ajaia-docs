"use server";

import type { Prisma } from "@/generated/prisma/client";
import { updateDocument } from "@/lib/documents";
import { getCurrentUser } from "@/lib/session";
import { contentSchema, titleSchema } from "@/lib/validation";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const SIGNED_OUT = "Your session has ended. Sign in again to keep editing.";
const NO_ACCESS = "This document no longer exists or you no longer have access to it.";

// Content arrives as a JSON string: passing the editor's object straight through
// React's server-action serialization broke Prisma when it inspected the value.
export async function saveContent(id: string, json: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: SIGNED_OUT };

  const parsed = contentSchema.safeParse(parseJson(json));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const saved = await updateDocument(id, user.id, { content: parsed.data as Prisma.InputJsonValue });
  return saved ? { ok: true } : { ok: false, error: NO_ACCESS };
}

export async function renameDocument(id: string, title: unknown): Promise<Result<{ title: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: SIGNED_OUT };

  const parsed = titleSchema.safeParse(title);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const saved = await updateDocument(id, user.id, { title: parsed.data });
  return saved ? { ok: true, title: parsed.data } : { ok: false, error: NO_ACCESS };
}

function parseJson(json: unknown) {
  if (typeof json !== "string") return undefined;
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

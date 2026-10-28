"use server";

import { heartbeat } from "@/lib/presence";
import { getCurrentUser } from "@/lib/session";
import { listVersions, restoreVersion } from "@/lib/versions";

const SIGNED_OUT = "Your session has ended. Sign in again.";

export async function listVersionsAction(docId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: SIGNED_OUT };
  const versions = await listVersions(docId, user.id);
  return versions ? { ok: true as const, versions } : { ok: false as const, error: "You can't open this document." };
}

export async function restoreVersionAction(versionId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: SIGNED_OUT };
  const restored = await restoreVersion(versionId, user.id);
  return restored ? { ok: true as const } : { ok: false as const, error: "Only the owner and editors can restore versions." };
}

export async function heartbeatAction(docId: string, editing: boolean) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, others: [] };
  const others = await heartbeat(docId, user.id, editing === true);
  return others ? { ok: true as const, others } : { ok: false as const, others: [] };
}

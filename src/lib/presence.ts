// Presence: each open document page sends a heartbeat every few seconds. Anyone
// seen within ACTIVE_MS counts as "here". Polling keeps this simple; no websockets.
import { prisma } from "./db";
import { canView, documentId } from "./documents";

export const ACTIVE_MS = 30 * 1000;

export type Viewer = { userId: string; name: string; editing: boolean };

// Records the heartbeat and returns the other people on the document.
// Returns null when the user can't open the document.
export async function heartbeat(docId: string, userId: string, editing: boolean, now = new Date()) {
  if (!documentId.safeParse(docId).success) return null;
  const doc = await prisma.document.findFirst({ where: { id: docId, ...canView(userId) }, select: { id: true } });
  if (!doc) return null;

  await prisma.documentPresence.upsert({
    where: { documentId_userId: { documentId: docId, userId } },
    update: { editing, lastSeenAt: now },
    create: { documentId: docId, userId, editing, lastSeenAt: now },
  });

  const others = await prisma.documentPresence.findMany({
    where: { documentId: docId, userId: { not: userId }, lastSeenAt: { gte: new Date(now.getTime() - ACTIVE_MS) } },
    include: { user: { select: { name: true } } },
    orderBy: { lastSeenAt: "desc" },
  });
  return others.map((p): Viewer => ({ userId: p.userId, name: p.user.name, editing: p.editing }));
}

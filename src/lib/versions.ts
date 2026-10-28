// Version history: autosave keeps at most one snapshot every few minutes, and
// restoring first snapshots the current state so a restore can be undone.
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import { canEdit, canView, documentId } from "./documents";

export const SNAPSHOT_EVERY_MS = 5 * 60 * 1000;

export type VersionSummary = {
  id: string;
  title: string;
  excerpt: string;
  createdAt: Date;
  createdByName: string;
};

// Called after a successful save. The caller has already checked edit access.
export async function snapshotIfDue(docId: string, userId: string) {
  const latest = await prisma.documentVersion.findFirst({
    where: { documentId: docId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (latest && Date.now() - latest.createdAt.getTime() < SNAPSHOT_EVERY_MS) return false;

  const doc = await prisma.document.findUnique({ where: { id: docId }, select: { title: true, content: true } });
  if (!doc) return false;
  await prisma.documentVersion.create({
    data: { documentId: docId, title: doc.title, content: doc.content as Prisma.InputJsonValue, createdById: userId },
  });
  return true;
}

// Returns null when the user can't open the document.
export async function listVersions(docId: string, userId: string): Promise<VersionSummary[] | null> {
  if (!documentId.safeParse(docId).success) return null;
  const doc = await prisma.document.findFirst({ where: { id: docId, ...canView(userId) }, select: { id: true } });
  if (!doc) return null;

  const versions = await prisma.documentVersion.findMany({
    where: { documentId: docId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { createdBy: { select: { name: true } } },
  });
  return versions.map((v) => ({
    id: v.id,
    title: v.title,
    excerpt: excerpt(v.content),
    createdAt: v.createdAt,
    createdByName: v.createdBy.name,
  }));
}

// Owner and editors only. Returns false when the version doesn't exist or the user can't edit.
export async function restoreVersion(versionId: string, userId: string) {
  if (!documentId.safeParse(versionId).success) return false;
  const version = await prisma.documentVersion.findUnique({ where: { id: versionId } });
  if (!version) return false;

  const doc = await prisma.document.findFirst({
    where: { id: version.documentId, ...canEdit(userId) },
    select: { id: true, title: true, content: true },
  });
  if (!doc) return false;

  await prisma.$transaction([
    prisma.documentVersion.create({
      data: { documentId: doc.id, title: doc.title, content: doc.content as Prisma.InputJsonValue, createdById: userId },
    }),
    prisma.document.update({
      where: { id: doc.id },
      data: { title: version.title, content: version.content as Prisma.InputJsonValue },
    }),
  ]);
  return true;
}

// First ~100 characters of text, for the history list.
function excerpt(content: unknown) {
  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const { text, content: children } = node as { text?: string; content?: unknown[] };
    if (text) parts.push(text);
    children?.forEach(walk);
  };
  walk(content);
  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  return text.length > 100 ? `${text.slice(0, 100)}…` : text || "Empty document";
}

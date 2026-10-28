// All document queries go through here. Every read/write is scoped to the
// current user, so the access rules live in one place: canView() and canEdit().
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";

export type Role = "owner" | "editor" | "viewer";

export type DocumentSummary = {
  id: string;
  title: string;
  updatedAt: Date;
  ownerName: string;
  role: Role;
  shareCount: number;
};

export const documentId = z.uuid();

// Prisma ignores undefined filter values, so a missing userId would match every document.
function assertUserId(userId: string) {
  if (!userId) throw new Error("A user id is required for access checks.");
}

// Owner, or anyone the document was shared with.
export function canView(userId: string) {
  assertUserId(userId);
  return { OR: [{ ownerId: userId }, { shares: { some: { userId } } }] };
}

// Owner, or shared with the EDITOR role.
export function canEdit(userId: string) {
  assertUserId(userId);
  return { OR: [{ ownerId: userId }, { shares: { some: { userId, role: "EDITOR" as const } } }] };
}

function roleOf(ownerId: string, shares: { userId: string; role: string }[], userId: string): Role {
  if (ownerId === userId) return "owner";
  return shares.find((s) => s.userId === userId)?.role === "EDITOR" ? "editor" : "viewer";
}

export async function listDocumentsFor(userId: string) {
  const docs = await prisma.document.findMany({
    where: canView(userId),
    select: {
      id: true,
      title: true,
      updatedAt: true,
      ownerId: true,
      owner: { select: { name: true } },
      shares: { select: { userId: true, role: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const summaries: DocumentSummary[] = docs.map((d) => ({
    id: d.id,
    title: d.title,
    updatedAt: d.updatedAt,
    ownerName: d.owner.name,
    role: roleOf(d.ownerId, d.shares, userId),
    shareCount: d.shares.length,
  }));

  return {
    owned: summaries.filter((d) => d.role === "owner"),
    shared: summaries.filter((d) => d.role !== "owner"),
  };
}

export async function getDocumentFor(id: string, userId: string) {
  if (!documentId.safeParse(id).success) return null;
  const doc = await prisma.document.findFirst({
    where: { id, ...canView(userId) },
    include: { owner: { select: { name: true } }, shares: { select: { userId: true, role: true } } },
  });
  if (!doc) return null;
  const { shares, ...rest } = doc;
  return { ...rest, role: roleOf(doc.ownerId, shares, userId) };
}

// Returns false when the document doesn't exist or the user can't edit it.
export async function updateDocument(
  id: string,
  userId: string,
  data: { title?: string; content?: Prisma.InputJsonValue },
) {
  if (!documentId.safeParse(id).success) return false;
  const { count } = await prisma.document.updateMany({ where: { id, ...canEdit(userId) }, data });
  return count === 1;
}

export async function createDocument(ownerId: string, title = "Untitled document") {
  const doc = await prisma.document.create({ data: { ownerId, title }, select: { id: true } });
  return doc.id;
}

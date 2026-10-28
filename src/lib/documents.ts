// All document queries go through here. Every read/write is scoped to the
// current user, so the access rule lives in one place: canAccess().
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";

export type Role = "owner" | "shared";

export type DocumentSummary = {
  id: string;
  title: string;
  updatedAt: Date;
  ownerName: string;
  role: Role;
};

const documentId = z.uuid();

// A user can open a document if they own it or it was shared with them.
function canAccess(userId: string) {
  return { OR: [{ ownerId: userId }, { shares: { some: { userId } } }] };
}

export async function listDocumentsFor(userId: string) {
  const docs = await prisma.document.findMany({
    where: canAccess(userId),
    select: { id: true, title: true, updatedAt: true, ownerId: true, owner: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const summaries: DocumentSummary[] = docs.map((d) => ({
    id: d.id,
    title: d.title,
    updatedAt: d.updatedAt,
    ownerName: d.owner.name,
    role: d.ownerId === userId ? "owner" : "shared",
  }));

  return {
    owned: summaries.filter((d) => d.role === "owner"),
    shared: summaries.filter((d) => d.role === "shared"),
  };
}

export async function getDocumentFor(id: string, userId: string) {
  if (!documentId.safeParse(id).success) return null;
  const doc = await prisma.document.findFirst({
    where: { id, ...canAccess(userId) },
    include: { owner: { select: { name: true } } },
  });
  if (!doc) return null;
  return { ...doc, role: (doc.ownerId === userId ? "owner" : "shared") as Role };
}

// Returns false when the document doesn't exist or the user can't access it.
export async function updateDocument(
  id: string,
  userId: string,
  data: { title?: string; content?: Prisma.InputJsonValue },
) {
  if (!documentId.safeParse(id).success) return false;
  const { count } = await prisma.document.updateMany({ where: { id, ...canAccess(userId) }, data });
  return count === 1;
}

export async function createDocument(ownerId: string, title = "Untitled document") {
  const doc = await prisma.document.create({ data: { ownerId, title }, select: { id: true } });
  return doc.id;
}

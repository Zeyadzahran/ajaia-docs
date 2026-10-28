// Sharing rules: only the owner can see, add, change or remove shares.
import { z } from "zod";
import type { ShareRole } from "@/generated/prisma/client";
import { prisma } from "./db";
import { documentId } from "./documents";

export type Share = { userId: string; name: string; email: string; role: ShareRole };

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export const shareInput = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  role: z.enum(["VIEWER", "EDITOR"], "Pick a role."),
});

const NOT_OWNER = "Only the owner can manage sharing for this document.";

async function isOwner(docId: string, userId: string) {
  if (!documentId.safeParse(docId).success) return false;
  const doc = await prisma.document.findFirst({ where: { id: docId, ownerId: userId }, select: { id: true } });
  return doc !== null;
}

// Returns null when the user isn't the owner.
export async function listShares(docId: string, ownerId: string): Promise<Share[] | null> {
  if (!(await isOwner(docId, ownerId))) return null;
  const shares = await prisma.documentShare.findMany({
    where: { documentId: docId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return shares.map((s) => ({ userId: s.userId, name: s.user.name, email: s.user.email, role: s.role }));
}

// Adds a share, or changes the role if that person already has access.
export async function shareDocument(
  docId: string,
  ownerId: string,
  input: unknown,
): Promise<Result<{ shares: Share[]; message: string }>> {
  const parsed = shareInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!(await isOwner(docId, ownerId))) return { ok: false, error: NOT_OWNER };

  const { email, role } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (!user) return { ok: false, error: `No user with the email ${email}.` };
  if (user.id === ownerId) return { ok: false, error: "You already own this document." };

  const existing = await prisma.documentShare.findUnique({
    where: { documentId_userId: { documentId: docId, userId: user.id } },
  });
  await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: docId, userId: user.id } },
    update: { role },
    create: { documentId: docId, userId: user.id, role },
  });

  const roleLabel = role === "EDITOR" ? "can edit" : "can view";
  const message = existing ? `${user.name} now ${roleLabel}.` : `Shared with ${user.name} (${roleLabel}).`;
  return { ok: true, shares: (await listShares(docId, ownerId)) ?? [], message };
}

export async function removeShare(docId: string, ownerId: string, userId: string): Promise<Result<{ shares: Share[] }>> {
  if (!(await isOwner(docId, ownerId))) return { ok: false, error: NOT_OWNER };
  await prisma.documentShare.deleteMany({ where: { documentId: docId, userId } });
  return { ok: true, shares: (await listShares(docId, ownerId)) ?? [] };
}

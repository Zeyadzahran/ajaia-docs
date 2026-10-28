"use server";

import { redirect } from "next/navigation";
import { createDocument } from "@/lib/documents";
import { endSession, listUsers, requireUser, startSession } from "@/lib/session";

export async function signInAs(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const users = await listUsers();
  if (!users.some((u) => u.id === userId)) redirect("/login?error=unknown-user");
  await startSession(userId);
  redirect("/");
}

export async function signOut() {
  await endSession();
  redirect("/login");
}

export async function createDocumentAction() {
  const user = await requireUser();
  const id = await createDocument(user.id);
  redirect(`/doc/${id}`);
}

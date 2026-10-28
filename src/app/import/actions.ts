"use server";

import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/session";
import { createDocument } from "@/lib/documents";
import { convertFile } from "@/lib/import";
import { FILE_ERROR, validateImportFile } from "@/lib/import-rules";

export async function importDocument(
  form: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Sign in before importing a document." };
    const file = form.get("file");
    if (!(file instanceof File)) return { ok: false, error: FILE_ERROR };
    const error = validateImportFile(file.name, file.size);
    if (error) return { ok: false, error };
    let converted;
    try {
      converted = await convertFile(file.name, new Uint8Array(await file.arrayBuffer()));
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "This file could not be read.",
      };
    }
    const id = await createDocument(
      user.id,
      converted.title,
      converted.content as Prisma.InputJsonValue,
    );
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Couldn't import your file. Please try again." };
  }
}

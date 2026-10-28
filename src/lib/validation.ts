import { z } from "zod";

export const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_CHARS = 1_000_000;

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title can't be empty.")
  .max(MAX_TITLE_LENGTH, `Title can't be longer than ${MAX_TITLE_LENGTH} characters.`);

// Only the outer shape and size are checked here; TipTap's schema drops unknown nodes when it renders.
export const contentSchema = z
  .looseObject(
    { type: z.literal("doc"), content: z.array(z.unknown()).optional() },
    "Document content is not valid.",
  )
  .refine((doc) => JSON.stringify(doc).length <= MAX_CONTENT_CHARS, "Document is too large to save (max ~1 MB).");

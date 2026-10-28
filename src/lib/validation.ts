import { z } from "zod";
import { isValidEditorDoc } from "./editor-schema";

export const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_CHARS = 1_000_000;

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title can't be empty.")
  .max(MAX_TITLE_LENGTH, `Title can't be longer than ${MAX_TITLE_LENGTH} characters.`);

// Content must fit the size limit and load in the editor's own schema. Anything
// the editor can't read would open as an empty document, so it is rejected here.
export const contentSchema = z
  .unknown()
  .refine((doc) => JSON.stringify(doc ?? null).length <= MAX_CONTENT_CHARS, "Document is too large to save (max ~1 MB).")
  .refine(isValidEditorDoc, "Document content is not valid.");

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const FILE_ERROR = "Only .txt, .md and .docx files up to 2 MB are supported.";
export const SUPPORTED_FILE_EXTENSION = /\.(txt|md|docx)$/i;

export function validateImportFile(name: string, size: number): string | null {
  if (!SUPPORTED_FILE_EXTENSION.test(name) || size > MAX_FILE_BYTES) return FILE_ERROR;
  if (size === 0) return "This file is empty. Choose a file with some text.";
  return null;
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { importDocument } from "@/app/import/actions";
import { button } from "@/components/ui";
import { validateImportFile } from "@/lib/import-rules";

export function ImportButton() {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function upload(file?: File) {
    if (!file) return;
    setError(null);
    const validationError = validateImportFile(file.name, file.size);
    if (validationError) {
      setError(validationError);
      return;
    }
    setPending(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const result = await importDocument(form);
      if (result.ok) router.push(`/doc/${result.id}`);
      else setError(result.error);
    } catch {
      setError("Couldn't import your file. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept=".txt,.md,.docx"
        className="hidden"
        aria-label="Choose a document to import"
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => input.current?.click()}
        className={button("secondary")}
      >
        <UploadSimpleIcon size={16} />
        {pending ? "Importing…" : "Import file"}
      </button>
      {error && (
        <p role="alert" className="mt-2 max-w-xs text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

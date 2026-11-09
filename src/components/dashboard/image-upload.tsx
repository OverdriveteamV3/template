"use client";

import { useEffect, useId, useState } from "react";
import { Upload } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";

export function ImageUpload({ name, label, className, onPreview }: { name: string; label: string; className?: string; onPreview?: (url: string) => void }) {
  const t = useT();
  const id = useId();
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState("");

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <div className={className}>
      <input
        id={id}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          const url = file ? URL.createObjectURL(file) : "";
          setFileName(file?.name ?? "");
          setPreview(url);
          onPreview?.(url);
        }}
      />
      <label htmlFor={id} className="flex cursor-pointer flex-col gap-3 rounded-xl border-2 border-dashed border-foreground/25 bg-white px-4 py-3 transition hover:border-foreground hover:bg-primary/40">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-16 w-full object-contain object-left" />
        ) : null}
        <span className="flex min-w-0 items-center gap-3">
        {preview ? null : (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
            <Upload size={16} strokeWidth={2.25} aria-hidden />
          </span>
        )}
        <span className="min-w-0">
          <span className="block font-semibold">{label}</span>
          <span className="block truncate text-xs text-muted">{fileName ? `${t("dash.fileReady")}: ${fileName}` : t("dash.fileTypes")}</span>
        </span>
        </span>
      </label>
    </div>
  );
}

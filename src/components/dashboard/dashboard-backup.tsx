"use client";

import { useRef, useState } from "react";
import { useT } from "@/components/i18n/locale-provider";
import { exportDashboard, importDashboard } from "@/server/backup";

export function DashboardBackup() {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    setError("");
    setMessage("");
    const result = await exportDashboard();
    setBusy(false);
    if ("error" in result && result.error) { setError(result.error); return; }
    if (!("csv" in result)) return;
    const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(t("dash.backupReady"));
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button type="button" className="inline-flex h-12 shrink-0 items-center whitespace-nowrap rounded-xl border border-border bg-white px-4 text-sm font-semibold disabled:opacity-40" disabled={busy} onClick={() => void download()}>{t("dash.exportCsv")}</button>
      <button type="button" className="inline-flex h-12 shrink-0 items-center whitespace-nowrap rounded-xl border border-border bg-white px-4 text-sm font-semibold disabled:opacity-40" disabled={busy} onClick={() => input.current?.click()}>{t("dash.importCsv")}</button>
      <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setBusy(true);
        setError("");
        setMessage("");
        const data = new FormData();
        data.set("file", file);
        void importDashboard(data).then((result) => {
          setBusy(false);
          if (result && "error" in result && result.error) setError(result.error);
          else if (result && "count" in result) setMessage(t("dash.backupImported", { count: result.count ?? 0 }));
        });
      }} />
      {message ? <p className="whitespace-nowrap text-sm font-semibold">{message}</p> : null}
      {error ? <p role="alert" className="whitespace-nowrap text-sm text-secondary">{error}</p> : null}
    </div>
  );
}

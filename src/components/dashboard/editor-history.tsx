"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Redo2, Undo2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/locale-provider";

export type EditorHistoryApi = {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  publish: () => void;
  publishing: boolean;
  published: boolean;
  publishError: string;
};

const EditorHistoryContext = createContext<{ api: EditorHistoryApi | null; setApi: (api: EditorHistoryApi | null) => void } | null>(null);

export function EditorHistoryProvider({ children }: { children: ReactNode }) {
  const [api, setApiState] = useState<EditorHistoryApi | null>(null);
  const setApi = useCallback((next: EditorHistoryApi | null) => setApiState(next), []);
  const value = useMemo(() => ({ api, setApi }), [api, setApi]);
  return <EditorHistoryContext.Provider value={value}>{children}</EditorHistoryContext.Provider>;
}

export function useEditorHistory() {
  const value = useContext(EditorHistoryContext);
  if (!value) throw new Error("Editor history is missing.");
  return value;
}

export function EditorHistoryButtons() {
  const pathname = usePathname();
  const t = useT();
  const value = useContext(EditorHistoryContext);
  if (pathname !== "/dashboard/settings/website" || !value) return null;
  const { api } = value;
  const button = "flex items-center justify-center gap-1.5 rounded-xl bg-[#c4b396] px-2 py-3 text-sm font-semibold text-[#2c261c] shadow-none transition hover:!bg-white hover:!text-foreground disabled:bg-[#e7e0d4] disabled:text-muted";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => api?.undo()} disabled={!api?.canUndo} aria-label={t("dash.undo")} className={button}>
          <Undo2 className="h-5 w-5" aria-hidden />
          {t("dash.undo")}
        </button>
        <button type="button" onClick={() => api?.redo()} disabled={!api?.canRedo} aria-label={t("dash.redo")} className={button}>
          <Redo2 className="h-5 w-5" aria-hidden />
          {t("dash.redo")}
        </button>
      </div>
      <button type="button" onClick={() => api?.publish()} disabled={!api || api.publishing} className="w-full rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60">{api?.publishing ? t("dash.publishing") : t("dash.publish")}</button>
      {api?.published ? <p className="text-xs font-semibold">{t("dash.published")}</p> : null}
      {api?.publishError ? <p role="alert" className="text-xs text-secondary">{api.publishError}</p> : null}
    </div>
  );
}

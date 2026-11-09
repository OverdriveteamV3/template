"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronUp, LifeBuoy, LogOut, Settings, User } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";
import { signOut } from "@/server/auth-actions";

export function DashboardAccount({ email, avatar }: { email: string; avatar: string }) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const settings = pathname === "/dashboard/settings";
  const support = pathname === "/dashboard/support" || pathname.startsWith("/dashboard/support/");
  const item = "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-surface";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative border-t border-border pt-4">
      <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((value) => !value)}>
        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-foreground text-background">
          {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <User size={16} strokeWidth={2} aria-hidden />}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-muted">{email}</span>
        <ChevronUp size={14} className={`shrink-0 text-muted transition ${open ? "" : "rotate-180"}`} aria-hidden />
      </button>
      {open ? (
        <div id={menuId} role="menu" className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-white p-1.5 shadow-[0_16px_40px_rgba(17,17,17,0.08)]">
          <Link href="/dashboard/settings" role="menuitem" aria-current={settings ? "page" : undefined} className={`${item} ${settings ? "bg-primary font-semibold text-on-primary" : ""}`} onClick={() => setOpen(false)}>
            <Settings size={15} strokeWidth={2} aria-hidden className="shrink-0" />
            {t("dash.settings")}
          </Link>
          <Link href="/dashboard/support" role="menuitem" aria-current={support ? "page" : undefined} className={`${item} ${support ? "bg-primary font-semibold text-on-primary" : ""}`} onClick={() => setOpen(false)}>
            <LifeBuoy size={15} strokeWidth={2} aria-hidden className="shrink-0" />
            {t("dash.support")}
          </Link>
          <div className="mx-2 my-1 border-t border-border" role="separator" />
          <form action={signOut}>
            <button type="submit" role="menuitem" className={item}>
              <LogOut size={15} strokeWidth={2} aria-hidden className="shrink-0" />
              {t("dash.logOff")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

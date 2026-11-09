"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "@/server/auth-actions";
import { useT } from "@/components/i18n/locale-provider";

export function ProfileMenu({ email, imageUrl, dashboard = false }: { email: string; imageUrl?: string; dashboard?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const initial = (email.trim()[0] || "?").toUpperCase();

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
    <div ref={root} className="relative">
      <button
        type="button"
        className="grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-border bg-foreground text-xs font-semibold text-background transition hover:ring-2 hover:ring-primary hover:ring-offset-2"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={email}
        onClick={() => setOpen((value) => !value)}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>
      {open ? (
        <div id={menuId} role="menu" className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-white py-1 text-sm shadow-[0_16px_40px_rgba(17,17,17,0.08)]">
          <p className="truncate px-3 py-2 text-xs text-muted">{email}</p>
          {dashboard ? (
            <Link href="/dashboard" role="menuitem" className="block px-3 py-2 hover:bg-surface" onClick={() => setOpen(false)}>
              {t("nav.dashboard")}
            </Link>
          ) : null}
          <Link href="/account" role="menuitem" className="block px-3 py-2 hover:bg-surface" onClick={() => setOpen(false)}>
            {t("nav.account")}
          </Link>
          <form action={signOut}>
            <button type="submit" role="menuitem" className="block w-full px-3 py-2 text-left hover:bg-surface">
              {t("nav.signOut")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { useT } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import type { DashboardAlert } from "@/lib/dashboard/alert";
import { markAlertsSeen } from "@/server/dashboard-actions";

const titles = [
  ["/dashboard/support", "dash.support"],
  ["/dashboard/settings/website", "dash.website"],
  ["/dashboard/settings/forms", "dash.forms"],
  ["/dashboard/settings/notifications", "dash.notifications"],
  ["/dashboard/settings/policies", "dash.policies"],
  ["/dashboard/settings/booking", "dash.rules"],
  ["/dashboard/appointments", "dash.appointments"],
  ["/dashboard/calendar", "dash.calendar"],
  ["/dashboard/submissions", "dash.submissions"],
  ["/dashboard/customers", "dash.customers"],
  ["/dashboard/services", "dash.services"],
  ["/dashboard/staff", "dash.staff"],
] as const satisfies ReadonlyArray<readonly [string, MessageKey]>;

function titleKey(pathname: string): MessageKey {
  if (pathname === "/dashboard/settings") return "dash.settings";
  const match = titles.find(([href]) => pathname === href || pathname.startsWith(`${href}/`));
  return match?.[1] ?? "dash.overview";
}

export function DashboardHeader({ category, alerts }: { category: string; alerts: DashboardAlert[] }) {
  const pathname = usePathname();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const fresh = !seen && alerts.some((item) => item.fresh);

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

  function toggle() {
    setOpen((value) => {
      const next = !value;
      if (next && fresh) {
        setSeen(true);
        void markAlertsSeen();
      }
      return next;
    });
  }

  return (
    <header className="mb-4">
      <p className="text-[10px] font-semibold tracking-[0.18em] text-muted">{category.toUpperCase()}</p>
      <div className="mt-1 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{t(titleKey(pathname))}</h1>
        <div className="flex items-center gap-2">
          <div ref={root} className="relative">
            <button type="button" aria-label={fresh ? t("dash.alertsNew") : t("dash.alerts")} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={toggle} className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-border ${open ? "bg-primary text-on-primary" : "hover:bg-surface"}`}>
              <Bell className="h-4 w-4" strokeWidth={2} />
              {fresh ? <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[#16a34a] ring-2 ring-white" aria-hidden /> : null}
            </button>
            {open ? (
              <div id={menuId} role="menu" className="absolute right-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-white p-1.5 shadow-[0_16px_40px_rgba(17,17,17,0.08)]">
                <p className="px-2 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-muted">{t("dash.alerts").toUpperCase()}</p>
                {alerts.length === 0 ? <p className="px-2 py-3 text-sm text-muted">{t("dash.alertsEmpty")}</p> : (
                  <ul>
                    {alerts.map((item) => (
                      <li key={item.id}>
                        <Link href={item.href} role="menuitem" onClick={() => setOpen(false)} className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-surface">
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.fresh && !seen ? "bg-[#16a34a]" : "bg-transparent"}`} aria-hidden />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">{item.title}</span>
                            <span className="block truncate text-xs text-muted">{item.detail}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}

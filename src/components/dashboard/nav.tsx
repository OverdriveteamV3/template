"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

const groups = [
  {
    label: "dash.groupWork",
    links: [
      ["/dashboard", "dash.overview"],
      ["/dashboard/calendar", "dash.calendar"],
      ["/dashboard/appointments", "dash.appointments"],
      ["/dashboard/submissions", "dash.submissions"],
      ["/dashboard/customers", "dash.customers"],
    ],
  },
  {
    label: "dash.groupCatalog",
    links: [
      ["/dashboard/services", "dash.services"],
      ["/dashboard/staff", "dash.staff"],
    ],
  },
  {
    label: "dash.groupSite",
    links: [
      ["/dashboard/settings/website", "dash.website"],
      ["/dashboard/settings/forms", "dash.forms"],
      ["/dashboard/settings/notifications", "dash.notifications"],
      ["/dashboard/settings/policies", "dash.policies"],
      ["/dashboard/settings/booking", "dash.rules"],
    ],
  },
] as const satisfies ReadonlyArray<{ label: MessageKey; links: ReadonlyArray<readonly [string, MessageKey]> }>;

function current(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav className="space-y-4 text-sm">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-2 text-[10px] font-semibold tracking-[0.16em] text-muted">{t(group.label).toUpperCase()}</p>
          <div className="mt-1 flex flex-col gap-0.5">
            {group.links.map(([href, label]) => {
              const active = current(pathname, href);
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`rounded-lg px-2 py-1.5 ${active ? "bg-primary font-semibold text-on-primary" : "hover:bg-surface"}`}>
                  {t(label)}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

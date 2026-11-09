"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

const groups = [
  {
    links: [
      ["/dashboard", "dash.overview"],
      ["/dashboard/appointments", "dash.appointments"],
      ["/dashboard/submissions", "dash.submissions"],
      ["/dashboard/customers", "dash.customers"],
    ],
  },
  {
    label: "dash.groupSite",
    links: [
      ["/dashboard/settings/website", "dash.website"],
      ["/", "dash.backSite"],
    ],
  },
] as const satisfies ReadonlyArray<{ label?: MessageKey; links: ReadonlyArray<readonly [string, MessageKey]> }>;

function current(pathname: string, href: string) {
  if (href === "/" || href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav className="space-y-4 text-sm">
      {groups.map((group) => (
        <div key={group.links[0][0]}>
          {"label" in group ? <p className="px-2 text-[10px] font-semibold tracking-[0.16em] text-muted">{t(group.label).toUpperCase()}</p> : null}
          <div className={"label" in group ? "mt-1 flex flex-col gap-0.5" : "flex flex-col gap-0.5"}>
            {group.links.map(([href, label]) => {
              const active = current(pathname, href);
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${href === "/" ? "bg-[#f6f3ec] text-[#2c261c] hover:bg-[#e7e0d4]" : active ? "bg-primary font-semibold text-on-primary" : "hover:bg-surface"}`}>
                  {href === "/" ? <ArrowLeft size={15} strokeWidth={2} aria-hidden className="shrink-0" /> : null}
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

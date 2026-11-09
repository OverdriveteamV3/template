"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export function DashboardAside({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useLayoutEffect(() => {
    const aside = ref.current;
    if (!aside) return;

    const align = () => {
      const current = parseFloat(aside.style.marginTop) || 0;
      const target = document.querySelector("[data-dashboard-align]");
      if (!target) {
        if (current) aside.style.marginTop = "";
        return;
      }
      const asideRect = aside.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      if (asideRect.right > targetRect.left + 8) {
        if (current) aside.style.marginTop = "";
        return;
      }
      const next = Math.round(targetRect.top - (asideRect.top - current));
      const value = next > 0 ? `${next}px` : "";
      if (aside.style.marginTop !== value) aside.style.marginTop = value;
    };

    align();
    const observer = new ResizeObserver(align);
    observer.observe(document.body);
    window.addEventListener("resize", align);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", align);
      aside.style.marginTop = "";
    };
  }, [pathname]);

  return (
    <aside ref={ref} className="panel h-fit space-y-5 p-4 md:sticky md:top-6">
      {children}
    </aside>
  );
}

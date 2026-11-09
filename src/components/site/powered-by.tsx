"use client";

import { useT } from "@/components/i18n/locale-provider";

export function PoweredBy() {
  const t = useT();
  return (
    <p className="text-center text-xs text-muted">
      <a className="underline decoration-border underline-offset-4 hover:text-foreground" href="https://overdriveio.com">
        {t("footer.powered")}
      </a>
    </p>
  );
}

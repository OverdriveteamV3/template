"use client";

import { useT } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

export function LoadingLine({ label = "common.loading" }: { label?: MessageKey }) {
  const t = useT();
  return <p className="p-8 text-sm">{t(label)}</p>;
}

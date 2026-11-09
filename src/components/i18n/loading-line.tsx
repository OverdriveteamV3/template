"use client";

import { LoadingScreen } from "@/components/i18n/loading-screen";
import type { MessageKey } from "@/lib/i18n/messages";

export function LoadingLine(_props: { label?: MessageKey } = {}) {
  return <LoadingScreen />;
}

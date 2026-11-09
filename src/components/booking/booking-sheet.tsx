"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useT } from "@/components/i18n/locale-provider";
import { BookingPanel } from "@/components/booking/booking-panel";
import type { PublicSite } from "@/lib/site/types";

export function BookingSheet({ site, today, label }: { site: PublicSite; today: string; label: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="btn-primary w-full lg:hidden">{label}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 top-8 overflow-auto rounded-t-2xl bg-background p-4 shadow-none" aria-describedby={undefined}>
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold">{t("booking.title")}</Dialog.Title>
            <Dialog.Close className="rounded-full border border-border px-3 py-1 text-sm">{t("common.close")}</Dialog.Close>
          </div>
          <BookingPanel site={site} today={today} compact />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

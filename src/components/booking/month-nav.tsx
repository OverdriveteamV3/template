"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";

export function MonthNav({ label, year, onPrevious, onNext }: { label: string; year: string; onPrevious: () => void; onNext: () => void }) {
  const t = useT();
  return (
    <div className="flex items-center justify-between">
      <p className="text-[15px] font-semibold" aria-label={`${label} ${year}`}>{label}</p>
      <div className="flex items-center gap-1.5">
        <button type="button" className="grid h-7 w-7 place-items-center rounded-full border border-[#e6e5df] text-[#111]" aria-label={t("booking.previous")} onClick={onPrevious}>
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <button type="button" className="grid h-7 w-7 place-items-center rounded-full border border-[#e6e5df] text-[#111]" aria-label={t("booking.next")} onClick={onNext}>
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

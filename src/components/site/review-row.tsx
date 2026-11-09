"use client";

import { useT } from "@/components/i18n/locale-provider";
import type { PublicSite } from "@/lib/site/types";

export function ReviewRow({ reviews, fallback }: { reviews: PublicSite["testimonials"]; fallback: string }) {
  const t = useT();
  const loop = [...reviews, ...reviews];
  return (
    <div className="review-row mt-5 overflow-hidden">
      <ul className="review-marquee flex w-max gap-3">
        {loop.map((item, index) => {
          const href = item.url || fallback;
          const copy = index >= reviews.length;
          return (
            <li key={`${item.name}-${index}`} className="w-[300px] shrink-0" aria-hidden={copy || undefined}>
              {href ? (
                <a href={href} target="_blank" rel="noreferrer" tabIndex={copy ? -1 : undefined} aria-label={copy ? undefined : t("home.openReview", { name: item.name })} className="flex h-full flex-col rounded-[12px] border border-[#e6e5df] bg-white p-5 transition-colors hover:border-foreground">
                  <ReviewCard item={item} />
                </a>
              ) : (
                <div className="flex h-full flex-col rounded-[12px] border border-[#e6e5df] bg-white p-5">
                  <ReviewCard item={item} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewCard({ item }: { item: PublicSite["testimonials"][number] }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        {item.stars ? <p className="flex gap-0.5 text-sm text-primary" aria-label={`${item.stars} of 5`}>{[1, 2, 3, 4, 5].map((star) => <span key={star} aria-hidden className={star <= (item.stars ?? 0) ? "" : "text-[#e7e6e0]"}>★</span>)}</p> : <p className="text-2xl leading-none text-primary" aria-hidden>“</p>}
        {item.date ? <p className="text-[10px] font-semibold tracking-[0.16em] text-[#9b9b94]">{item.date.toUpperCase()}</p> : null}
      </div>
      <p className="mt-3 line-clamp-5 text-sm leading-relaxed">{item.quote}</p>
      <div className="mt-4 flex items-center gap-2.5">
        {item.avatar ? <img src={item.avatar} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover" /> : null}
        <p className="text-[10px] font-semibold tracking-[0.16em] text-[#9b9b94]">{item.name.toUpperCase()}</p>
      </div>
    </>
  );
}

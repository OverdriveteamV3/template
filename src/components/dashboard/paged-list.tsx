"use client";

import Link from "next/link";
import { useState } from "react";

const pageSize = 6;

export type PagedRow = {
  id: string;
  href?: string;
  primary: string;
  secondary: string;
  time?: string;
};

export function PagedList({ rows, empty, nextLabel, previousLabel, zebra }: { rows: PagedRow[]; empty: string; nextLabel: string; previousLabel: string; zebra?: boolean }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages - 1);
  const slice = rows.slice(current * pageSize, current * pageSize + pageSize);

  if (rows.length === 0) return <p className={zebra ? "mt-4 text-sm text-muted" : "py-3 text-sm text-muted"}>{empty}</p>;

  return (
    <>
      <ul className={zebra ? "-mx-5 mt-4 text-sm" : "mt-3 divide-y divide-border text-sm"}>
        {slice.map((item) => (
          <li key={item.id} className={zebra ? "odd:bg-white even:bg-foreground/[0.04]" : "flex items-center justify-between gap-3 py-3"}>
            {zebra && item.href ? (
              <Link href={item.href} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-primary/30">
                <span className="min-w-0">
                  <span className="block font-medium">{item.primary}</span>
                  <span className="block truncate text-xs text-muted">{item.secondary}</span>
                </span>
                {item.time ? <time className="shrink-0 text-xs text-muted">{item.time}</time> : null}
              </Link>
            ) : (
              <>
                <span>{item.primary}</span>
                <span className="text-muted">{item.secondary}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      {pages > 1 ? (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" className="rounded-xl border border-border bg-white px-3 py-1.5 text-sm font-semibold disabled:opacity-40" disabled={current === 0} onClick={() => setPage(current - 1)}>{previousLabel}</button>
          <button type="button" className="rounded-xl border border-border bg-white px-3 py-1.5 text-sm font-semibold disabled:opacity-40" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>{nextLabel}</button>
        </div>
      ) : null}
    </>
  );
}

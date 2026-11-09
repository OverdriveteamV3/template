"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Children, cloneElement, isValidElement, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";

const buttonSize = 32;

export function ScrollRow({
  previousLabel,
  nextLabel,
  scrollerLabel,
  scrollerRole,
  focusKey,
  controls = "center",
  children,
}: {
  previousLabel: string;
  nextLabel: string;
  scrollerLabel?: string;
  scrollerRole?: string;
  focusKey?: string;
  controls?: "center" | "tabs";
  children: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ start: 0, count: Children.count(children) || 1 });
  const childCount = Children.count(children);

  useLayoutEffect(() => {
    const frameEl = frame.current;
    const trackEl = track.current;
    if (!frameEl || !trackEl) return;
    const kids = [...trackEl.children] as HTMLElement[];
    const gap = Number.parseFloat(getComputedStyle(trackEl).columnGap) || 0;
    const selected = trackEl.querySelector<HTMLElement>("[data-carousel-selected='true']");
    const selectedIndex = selected ? kids.findIndex((kid) => kid === selected || kid.contains(selected)) : -1;

    const fit = (from: number, width: number) => {
      let used = 0;
      let count = 0;
      for (let index = from; index < kids.length; index += 1) {
        const itemWidth = kids[index].offsetWidth;
        if (!itemWidth) break;
        const next = count === 0 ? itemWidth : used + gap + itemWidth;
        if (count > 0 && next > width) break;
        used = next;
        count += 1;
      }
      return Math.max(1, count);
    };

    setView((current) => {
      let start = current.start;
      if (selectedIndex >= 0 && (selectedIndex < start || selectedIndex >= start + current.count)) start = selectedIndex;
      const safeStart = Math.min(Math.max(0, start), Math.max(0, kids.length - 1));
      const count = fit(safeStart, frameEl.clientWidth);
      trackEl.style.transform = `translateX(-${kids[safeStart]?.offsetLeft ?? 0}px)`;
      if (current.start === safeStart && current.count === count) return current;
      return { start: safeStart, count };
    });
    const observer = new ResizeObserver(() => {
      setView((current) => {
        const count = fit(current.start, frameEl.clientWidth);
        trackEl.style.transform = `translateX(-${kids[current.start]?.offsetLeft ?? 0}px)`;
        return count === current.count ? current : { ...current, count };
      });
    });
    observer.observe(frameEl);
    return () => observer.disconnect();
  }, [childCount, focusKey]);

  const total = childCount;
  const canPrevious = view.start > 0;
  const canNext = view.start + view.count < total;
  const controlClass = `absolute z-10 grid h-7 w-7 place-items-center rounded-full border border-[#e6e5df] bg-[#f6f5f1] text-[#111] ${controls === "tabs" ? "bottom-1" : "top-1/2 -translate-y-1/2"}`;

  return (
    <div className="relative">
      <div ref={frame} className="overflow-hidden" style={{ marginLeft: canPrevious ? buttonSize : 0, marginRight: canNext ? buttonSize : 0 }}>
        <div ref={track} role={scrollerRole} aria-label={scrollerLabel} className="flex w-max items-end gap-1.5">
          {Children.map(children, (child, index) => {
            const shown = index >= view.start && index < view.start + view.count;
            if (!isValidElement(child)) return child;
            const element = child as ReactElement<{ inert?: boolean; style?: CSSProperties }>;
            return cloneElement(element, {
              inert: shown ? undefined : true,
              style: { ...element.props.style, visibility: shown ? "visible" : "hidden" },
            });
          })}
        </div>
      </div>
      {canPrevious ? (
        <button type="button" className={`${controlClass} left-0`} aria-label={previousLabel} onClick={() => setView((current) => ({ ...current, start: Math.max(0, current.start - 1) }))}>
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
      ) : null}
      {canNext ? (
        <button type="button" className={`${controlClass} right-0`} aria-label={nextLabel} onClick={() => setView((current) => ({ ...current, start: current.start + 1 }))}>
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}

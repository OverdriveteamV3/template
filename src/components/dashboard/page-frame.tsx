import type { ReactNode } from "react";

export function PageFrame({ eyebrow, title, note, children }: { eyebrow?: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <header>
        {eyebrow ? <p className="text-[10px] font-semibold tracking-[0.18em] text-muted">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
        {note ? <p className="mt-1 text-sm text-muted">{note}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <article className="panel p-4">
      <p className="text-4xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
      <div className="mt-3 h-1.5 w-10 rounded-full bg-primary" aria-hidden />
    </article>
  );
}

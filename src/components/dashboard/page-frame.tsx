import type { ReactNode } from "react";

export function PageFrame({ note, action, children }: { eyebrow?: string; title?: string; note?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4">
      {action}
      {note ? <p className="text-sm text-muted">{note}</p> : null}
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

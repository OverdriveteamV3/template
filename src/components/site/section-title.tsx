export function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="flex items-center gap-3 text-[2.25rem] font-semibold leading-none tracking-tight">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-hidden />
      {children}
    </h2>
  );
}

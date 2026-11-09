import type { PublicService } from "@/lib/site/types";

export function ServiceSelect({ services, value, onChange }: { services: PublicService[]; value: string; onChange: (id: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium tracking-wide text-muted">Service</span>
      <select className="w-full rounded-xl border border-border bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose a service</option>
        {services.map((service) => (
          <option key={service.id} value={service.id}>
            {service.name} · {service.durationMinutes} min
            {service.showPrice && service.priceCents != null ? ` · $${(service.priceCents / 100).toFixed(0)}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

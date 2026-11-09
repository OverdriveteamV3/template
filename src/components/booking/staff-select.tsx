import type { PublicStaff } from "@/lib/site/types";

export function StaffSelect({ staff, value, onChange }: { staff: PublicStaff[]; value: string; onChange: (id: string) => void }) {
  if (staff.length <= 1) return null;
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium tracking-wide text-muted">Staff</span>
      <select className="w-full rounded-xl border border-border bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="any">Any available</option>
        {staff.map((person) => (
          <option key={person.id} value={person.id}>{person.name}</option>
        ))}
      </select>
    </label>
  );
}

export type PresetId = "salon" | "tattoo" | "consultant" | "office";

export type Preset = {
  id: PresetId;
  label: string;
  category: string;
  services: { name: string; description: string; durationMinutes: number; priceCents: number | null }[];
  facts: { label: string; value: string }[];
};

export const presets: Preset[] = [
  {
    id: "salon",
    label: "Beauty salon",
    category: "Beauty salon",
    services: [
      { name: "Cut and style", description: "A scheduled cut.", durationMinutes: 60, priceCents: 8500 },
      { name: "Color", description: "A color appointment.", durationMinutes: 120, priceCents: 16000 },
    ],
    facts: [{ label: "Visit", value: "By appointment" }],
  },
  {
    id: "tattoo",
    label: "Tattoo studio",
    category: "Tattoo studio",
    services: [{ name: "Consultation", description: "Discuss a design before booking the session.", durationMinutes: 30, priceCents: 0 }],
    facts: [{ label: "Studio", value: "Appointment only" }],
  },
  {
    id: "consultant",
    label: "Consultant",
    category: "Consulting",
    services: [{ name: "Working session", description: "A scheduled advisory meeting.", durationMinutes: 50, priceCents: 20000 }],
    facts: [],
  },
  {
    id: "office",
    label: "General appointment office",
    category: "Appointments",
    services: [{ name: "Appointment", description: "A general scheduled visit. This product does not collect medical records.", durationMinutes: 30, priceCents: null }],
    facts: [],
  },
];

export function presetById(id: string) {
  return presets.find((preset) => preset.id === id) ?? presets[0];
}

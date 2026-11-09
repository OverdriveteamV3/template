"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";
import { archiveCatalogServiceForm, archiveCatalogStaffForm, assignCatalogServiceStaffForm, renameCatalogStaffForm, saveCatalogServiceForm, saveCatalogStaffForm, saveOpenHoursForm, setStaffActiveForm, updateCatalogServiceForm } from "@/server/dashboard-actions";

export type CatalogService = { id: string; name: string; durationMinutes: number; priceCents: number | null; staffIds: string[] };
export type CatalogStaff = { id: string; name: string; active: boolean };
export type CatalogDay = { weekday: number; open: boolean; start: string; end: string };

const field = "w-full rounded-xl border border-border bg-white px-3 py-2";
const weekdays = ["dash.sun", "dash.mon", "dash.tue", "dash.wed", "dash.thu", "dash.fri", "dash.sat"] as const;

function HoursForm({ days, action, saving, saved, error }: { days: CatalogDay[]; action: (payload: FormData) => void; saving: boolean; saved: boolean; error?: string }) {
  const t = useT();
  const [schedule, setSchedule] = useState(days);

  function update(weekday: number, partial: Partial<CatalogDay>) {
    setSchedule((current) => current.map((day) => day.weekday === weekday ? { ...day, ...partial } : day));
  }

  return (
    <form action={action} className="rounded-2xl border border-border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium">{t("dash.openHours")}</p>
        <div className="flex items-center gap-3">
          {saved ? <p className="text-sm font-semibold">{t("dash.saved")}</p> : null}
          {error ? <p role="alert" className="text-sm text-secondary">{error}</p> : null}
          <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60" type="submit" disabled={saving}>{t("common.save")}</button>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {schedule.map((day) => (
          <li key={day.weekday} className="flex flex-nowrap items-center justify-center gap-1.5 py-3">
            <span className="w-8 shrink-0 text-sm font-semibold">{t(weekdays[day.weekday])}</span>
            <button type="button" role="switch" aria-checked={day.open} aria-label={`${t(weekdays[day.weekday])} ${day.open ? t("dash.openDay") : t("dash.closedDay")}`} onClick={() => update(day.weekday, { open: !day.open })} className={`relative h-6 w-11 shrink-0 rounded-full transition ${day.open ? "bg-primary" : "bg-[#e7e6e0]"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${day.open ? "left-5" : "left-0.5"}`} />
            </button>
            <span className={`w-14 shrink-0 text-xs font-semibold ${day.open ? "text-foreground" : "text-muted"}`}>{day.open ? t("dash.openDay") : t("dash.closedDay")}</span>
            {day.open ? (
              <div className="flex shrink-0 items-center gap-1">
                <input aria-label={`${t(weekdays[day.weekday])} ${t("dash.openDay")}`} name={`start-${day.weekday}`} type="time" value={day.start} onChange={(event) => update(day.weekday, { start: event.target.value })} className="w-[7.75rem] rounded-lg border border-border bg-surface px-1.5 py-1 text-sm" />
                <span className="text-muted">–</span>
                <input aria-label={`${t(weekdays[day.weekday])} ${t("dash.closedDay")}`} name={`end-${day.weekday}`} type="time" value={day.end} onChange={(event) => update(day.weekday, { end: event.target.value })} className="w-[7.75rem] rounded-lg border border-border bg-surface px-1.5 py-1 text-sm" />
              </div>
            ) : null}
            {day.open ? <input type="hidden" name={`open-${day.weekday}`} value="on" /> : null}
            {!day.open ? (
              <>
                <input type="hidden" name={`start-${day.weekday}`} value={day.start} />
                <input type="hidden" name={`end-${day.weekday}`} value={day.end} />
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </form>
  );
}

function ServiceStaffMenu({ service, staff }: { service: CatalogService; staff: CatalogStaff[] }) {
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [ids, setIds] = useState(service.staffIds);
  const [, startSave] = useTransition();
  const all = staff.length > 0 && staff.every((person) => ids.includes(person.id));

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  function save(next: string[]) {
    setIds(next);
    const data = new FormData();
    data.set("serviceId", service.id);
    for (const id of next) data.append("staffId", id);
    startSave(() => { void assignCatalogServiceStaffForm(data); });
  }

  const assigned = staff.filter((person) => ids.includes(person.id)).map((person) => person.name).join(", ");
  const label = all ? t("dash.allStaff") : assigned || t("dash.assignStaff");

  return (
    <div ref={rootRef} className="relative">
      <button type="button" aria-expanded={open} aria-label={`${t("dash.assignStaff")} ${service.name}`} onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-left">
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold tracking-wide text-muted uppercase">{t("dash.staffList")}</span>
          <span className="block truncate text-sm font-semibold">{label}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute right-0 left-0 z-20 mt-1 rounded-xl border border-border bg-white p-1.5 shadow-xl">
          <label className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold hover:bg-surface">
            <input type="checkbox" checked={all} onChange={() => save(all ? [] : staff.map((person) => person.id))} className="h-4 w-4" />
            {t("dash.allStaff")}
          </label>
          {staff.map((person) => (
            <label key={person.id} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface">
              <input type="checkbox" checked={ids.includes(person.id)} onChange={() => save(ids.includes(person.id) ? ids.filter((id) => id !== person.id) : [...ids, person.id])} className="h-4 w-4" />
              {person.name}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ServiceRow({ service, staff }: { service: CatalogService; staff: CatalogStaff[] }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const formId = `service-${service.id}`;
  const price = service.priceCents != null ? (service.priceCents / 100).toFixed(0) : "";
  return (
    <li className={`flex flex-col gap-3 rounded-xl border border-border bg-white p-3 ${editing ? "sm:col-span-2" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        {editing ? (
          <form id={formId} action={updateCatalogServiceForm} onSubmit={() => setEditing(false)} className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1.4fr)_7rem_7rem]">
            <input type="hidden" name="id" value={service.id} />
            <input name="name" required defaultValue={service.name} autoFocus aria-label={t("dash.serviceName")} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setEditing(false); } }} className={field} />
            <input name="duration" type="number" min={5} max={480} required defaultValue={service.durationMinutes} aria-label={t("dash.duration")} className={field} />
            <input name="price" type="number" min={0} step="0.01" defaultValue={price} aria-label={t("dash.price")} className={field} />
          </form>
        ) : (
          <div className="min-w-0">
            <p className="truncate font-semibold">{service.name}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">{service.durationMinutes} {t("common.minutes")}</span>
              {price ? <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold">${price}</span> : null}
            </div>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {editing ? <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { const form = document.getElementById(formId); if (form instanceof HTMLFormElement) form.requestSubmit(); }} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary">{t("common.done")}</button> : null}
          <button type="button" aria-label={editing ? t("common.save") : `${t("dash.editPage")} ${service.name}`} onMouseDown={(event) => event.preventDefault()} onClick={() => { if (!editing) { setEditing(true); return; } const form = document.getElementById(formId); if (form instanceof HTMLFormElement) form.requestSubmit(); }} className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-white">
            <Pencil className="h-4 w-4" />
          </button>
          <form action={archiveCatalogServiceForm}>
            <input type="hidden" name="id" value={service.id} />
            <button type="submit" aria-label={`${t("dash.removeButton")} ${service.name}`} className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-white"><Trash2 className="h-4 w-4" /></button>
          </form>
        </div>
      </div>
      {editing ? null : <ServiceStaffMenu service={service} staff={staff} />}
    </li>
  );
}

function StaffActive({ person }: { person: CatalogStaff }) {
  const t = useT();
  const [active, setActive] = useState(person.active);
  return (
    <form action={setStaffActiveForm}>
      <input type="hidden" name="id" value={person.id} />
      <label className="flex items-center gap-2 text-xs font-semibold">
        <input type="checkbox" name="active" checked={active} aria-label={`${person.name} ${active ? t("dash.staffActive") : t("dash.staffOff")}`} onChange={(event) => { setActive(event.target.checked); event.currentTarget.form?.requestSubmit(); }} className="peer sr-only" />
        <span aria-hidden className="relative h-6 w-11 shrink-0 rounded-full bg-[#e7e6e0] transition peer-checked:bg-primary after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:left-5" />
        <span className={active ? "text-foreground" : "text-muted"}>{active ? t("dash.staffActive") : t("dash.staffOff")}</span>
      </label>
    </form>
  );
}

function StaffRow({ person }: { person: CatalogStaff }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const formId = `staff-name-${person.id}`;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 px-3 py-2">
      {editing ? (
        <form id={formId} action={renameCatalogStaffForm} onSubmit={() => setEditing(false)}>
          <input type="hidden" name="id" value={person.id} />
          <input name="name" required defaultValue={person.name} autoFocus aria-label={t("common.name")} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setEditing(false); } }} className={field} />
        </form>
      ) : <span className="truncate font-medium">{person.name}</span>}
      <StaffActive person={person} />
      <button type="button" aria-label={editing ? t("common.save") : `${t("dash.editPage")} ${person.name}`} onMouseDown={(event) => event.preventDefault()} onClick={() => { if (!editing) { setEditing(true); return; } const form = document.getElementById(formId); if (form instanceof HTMLFormElement) form.requestSubmit(); }} className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-white">
        <Pencil className="h-4 w-4" />
      </button>
      <form action={archiveCatalogStaffForm}>
        <input type="hidden" name="id" value={person.id} />
        <button type="submit" aria-label={`${t("dash.removeButton")} ${person.name}`} className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-white"><Trash2 className="h-4 w-4" /></button>
      </form>
    </li>
  );
}

export function ServicePageSettings({ services, staff, days }: { services: CatalogService[]; staff: CatalogStaff[]; days: CatalogDay[] }) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [serviceState, serviceAction, serviceSaving] = useActionState(saveCatalogServiceForm, null);
  const [hoursState, hoursAction, hoursSaving] = useActionState(saveOpenHoursForm, null);
  const [staffState, staffAction, staffSaving] = useActionState(saveCatalogStaffForm, null);

  return (
    <div className="mt-4 grid gap-6 border-t border-border pt-4 text-sm">
      <p className="text-xs text-muted">{t("dash.servicesPage")}</p>
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium">{t("nav.services")}</p>
          <button type="button" onClick={() => setAdding((current) => !current)} className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold">{t("dash.addService")}</button>
        </div>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {services.map((service) => (
            <ServiceRow key={service.id} service={service} staff={staff} />
          ))}
        </ul>
        {adding ? (
          <form action={serviceAction} className="mt-3 grid gap-3 rounded-xl border border-border bg-white p-3">
            <label className="grid gap-1">{t("dash.serviceName")}<input name="name" required className={field} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">{t("dash.duration")}<input name="duration" type="number" min={5} max={480} defaultValue={60} className={field} /></label>
              <label className="grid gap-1">{t("dash.price")}<input name="price" type="number" min={0} step="0.01" className={field} /></label>
            </div>
            <div className="flex items-center justify-end gap-3">
              {serviceState?.error ? <p role="alert" className="text-sm text-secondary">{serviceState.error}</p> : null}
              <button type="button" onClick={() => setAdding(false)} className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold">{t("common.cancel")}</button>
              <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60" type="submit" disabled={serviceSaving}>{t("common.save")}</button>
            </div>
          </form>
        ) : null}
      </div>
      <div className="grid items-start gap-6 md:grid-cols-2">
        <HoursForm days={days} action={hoursAction} saving={hoursSaving} saved={Boolean(hoursState?.ok)} error={hoursState?.error} />
        <div className="grid gap-3">
          <p className="font-medium">{t("dash.staffList")}</p>
          <ul className="divide-y divide-border rounded-xl border border-border bg-white">
            {staff.map((person) => (
              <StaffRow key={person.id} person={person} />
            ))}
          </ul>
          <form action={staffAction} className="flex flex-wrap items-end gap-3">
            <label className="grid min-w-48 flex-1 gap-1">{t("common.name")}<input name="name" required className={field} /></label>
            {staffState?.error ? <p role="alert" className="text-sm text-secondary">{staffState.error}</p> : null}
            <button className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60" type="submit" disabled={staffSaving}>{t("dash.addStaff")}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

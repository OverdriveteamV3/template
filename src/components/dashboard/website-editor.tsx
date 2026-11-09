"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, GripVertical, Pencil, Trash2 } from "lucide-react";
import { BookingPanel } from "@/components/booking/booking-panel";
import { SitePage } from "@/components/site/site-page";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { OpacitySlider } from "@/components/dashboard/opacity-slider";
import { useT } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { menuEntries, type CustomNavPage, type PublicSite, type SiteNavItem } from "@/lib/site/types";
import { ContactFormEditor } from "@/components/dashboard/contact-form-editor";
import { ServicePageSettings, type CatalogDay, type CatalogService, type CatalogStaff } from "@/components/dashboard/service-page-settings";
import { defaultContactFields, starterFields, type FormStarter } from "@/lib/forms/validate";
import { PageFormFields } from "@/components/dashboard/page-form-editor";
import { useEditorHistory } from "@/components/dashboard/editor-history";
import { ThemeCard } from "@/components/dashboard/theme-card";
import { MaintenancePage } from "@/components/site/maintenance-page";
import type { ThemePreset } from "@/lib/content/schema";
import { paletteTheme, themeStyle, type ThemePalette } from "@/lib/theme/tokens";
import { publishWebsiteForm, saveAboutPageForm, saveBookingRulesForm, saveContactPageForm, saveHeroForm, saveLogoForm, saveNavigationForm, saveReviewLinksForm, setMaintenance, setShowCalendar, setShowPortrait, setTestimonialsSection } from "@/server/dashboard-actions";

const navPages = ["services", "about", "contact", "appointments"] as const;
type NavPage = (typeof navPages)[number];

const navLabel: Record<NavPage, MessageKey> = {
  services: "nav.services",
  about: "nav.about",
  contact: "nav.contact",
  appointments: "nav.appointments",
};

export type WebsiteFields = {
  name: string;
  category: string;
  aboutShort: string;
  aboutBody: string;
  companyBio: string;
  logoUrl: string;
  logoInFooter: boolean;
  maintenance: boolean;
  portraitUrl: string;
  landingUrl: string;
  backgroundOpacity: number;
  showCalendar: boolean;
  showPortrait: boolean;
  navigation: SiteNavItem[];
  email: string;
  phone: string;
  address: string;
  hours: string;
  reviewLinks: { google: string; yelp: string; facebook: string; other: string; googleOn: boolean; yelpOn: boolean; facebookOn: boolean; otherOn: boolean };
  navLabels: { services: string; about: string; contact: string; appointments: string };
  theme: ThemePalette;
  themePresets: ThemePreset[];
};

const field = "w-full rounded-xl border border-border bg-white px-3 py-2";
const title = "text-base font-semibold";

export function WebsiteEditor({ fields, published = false, site, today, catalog }: { fields: WebsiteFields; published?: boolean; site: PublicSite; today: string; catalog: { services: CatalogService[]; staff: CatalogStaff[]; days: CatalogDay[] } }) {
  const t = useT();
  const sectionRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState(fields);
  const [open, setOpen] = useState(false);
  const [testimonialsOn, setTestimonialsOn] = useState(site.sections.includes("testimonials"));
  const [testimonialsOpen, setTestimonialsOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [editing, setEditing] = useState("");
  const [pageName, setPageName] = useState("");
  const [pageKind, setPageKind] = useState<"custom" | "services" | "appointments" | "contact" | "forms">("custom");
  const [formStarter, setFormStarter] = useState<FormStarter>("blank");
  const [heroOpen, setHeroOpen] = useState(true);
  const [pagesOpen, setPagesOpen] = useState<Record<string, boolean>>({ services: false, about: false, contact: false });
  const [dragOver, setDragOver] = useState("");
  const [calendarError, setCalendarError] = useState("");
  const [calendarPending, startCalendar] = useTransition();
  const [portraitError, setPortraitError] = useState("");
  const [portraitPending, startPortrait] = useTransition();
  const [maintenanceError, setMaintenanceError] = useState("");
  const [maintenancePending, startMaintenance] = useTransition();
  const [publishState, publishAction, publishing] = useActionState(publishWebsiteForm, null);
  const [navState, navAction, navSaving] = useActionState(saveNavigationForm, null);
  const [aboutState, aboutAction, aboutSaving] = useActionState(saveAboutPageForm, null);
  const [contactState, contactAction, contactSaving] = useActionState(saveContactPageForm, null);
  const [formsOpen, setFormsOpen] = useState(false);
  const [contactFields, setContactFields] = useState(site.contactForm?.length ? site.contactForm : defaultContactFields);
  const [bookingState, bookingAction, bookingSaving] = useActionState(saveBookingRulesForm, null);
  const [reviewState, reviewAction, reviewSaving] = useActionState(saveReviewLinksForm, null);
  const { setApi } = useEditorHistory();
  const draftRef = useRef(fields);
  const pastRef = useRef<WebsiteFields[]>([]);
  const futureRef = useRef<WebsiteFields[]>([]);
  const pendingRef = useRef<{ before: WebsiteFields; timer: number } | null>(null);
  const [steps, setSteps] = useState({ undo: 0, redo: 0 });
  draftRef.current = draft;

  function flushPending() {
    const pending = pendingRef.current;
    if (!pending) return;
    window.clearTimeout(pending.timer);
    pendingRef.current = null;
    if (JSON.stringify(pending.before) !== JSON.stringify(draftRef.current)) {
      pastRef.current = [...pastRef.current, pending.before].slice(-40);
      futureRef.current = [];
    }
    setSteps({ undo: pastRef.current.length, redo: futureRef.current.length });
  }

  function changeDraft(updater: (current: WebsiteFields) => WebsiteFields) {
    const current = draftRef.current;
    const next = updater(current);
    if (JSON.stringify(next) === JSON.stringify(current)) return;
    if (!pendingRef.current) {
      pendingRef.current = { before: structuredClone(current), timer: 0 };
      futureRef.current = [];
    } else {
      window.clearTimeout(pendingRef.current.timer);
    }
    pendingRef.current.timer = window.setTimeout(flushPending, 400);
    draftRef.current = next;
    setDraft(next);
    setSteps({ undo: pastRef.current.length + 1, redo: 0 });
  }

  function applyHistory(next: WebsiteFields, from: WebsiteFields) {
    draftRef.current = next;
    setDraft(next);
    setSteps({ undo: pastRef.current.length, redo: futureRef.current.length });
    if (next.showCalendar !== from.showCalendar) {
      const data = new FormData();
      data.set("showCalendar", next.showCalendar ? "on" : "off");
      startCalendar(async () => {
        try {
          const result = await setShowCalendar(data);
          if (result && "error" in result && result.error) setCalendarError(result.error);
        } catch {
          setCalendarError("The calendar could not be updated.");
        }
      });
    }
    if (next.showPortrait === from.showPortrait) return;
    const portraitData = new FormData();
    portraitData.set("showPortrait", next.showPortrait ? "on" : "off");
    startPortrait(async () => {
      try {
        const result = await setShowPortrait(portraitData);
        if (result && "error" in result && result.error) setPortraitError(result.error);
      } catch {
        setPortraitError("The portrait could not be updated.");
      }
    });
  }

  function undo() {
    flushPending();
    const previous = pastRef.current.at(-1);
    if (!previous) return;
    const from = draftRef.current;
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, structuredClone(from)];
    applyHistory(structuredClone(previous), from);
  }

  function redo() {
    flushPending();
    const following = futureRef.current.at(-1);
    if (!following) return;
    const from = draftRef.current;
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, structuredClone(from)];
    applyHistory(structuredClone(following), from);
  }

  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  const publishRef = useRef<() => void>(() => {});
  undoRef.current = undo;
  redoRef.current = redo;

  useEffect(() => {
    setApi({
      undo: () => undoRef.current(),
      redo: () => redoRef.current(),
      canUndo: steps.undo > 0,
      canRedo: steps.redo > 0,
      publish: () => publishRef.current(),
      publishing,
      published,
      publishError: publishState?.error ?? "",
    });
  }, [setApi, steps, publishing, published, publishState]);

  useEffect(() => () => setApi(null), [setApi]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      if (event.shiftKey) redoRef.current();
      else undoRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open && !nameOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setNameOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, nameOpen]);

  function patch(partial: Partial<WebsiteFields>) {
    changeDraft((current) => ({ ...current, ...partial }));
  }

  function publishCurrent() {
    const section = sectionRef.current;
    if (!section) return;
    const data = new FormData();
    const file = section.querySelector<HTMLInputElement>('input[name="file"]')?.files?.[0];
    const portrait = section.querySelector<HTMLInputElement>('input[name="portraitFile"]')?.files?.[0];
    const background = section.querySelector<HTMLInputElement>('input[name="backgroundFile"]')?.files?.[0];
    if (file && file.size > 0) data.set("file", file);
    if (portrait && portrait.size > 0) data.set("portraitFile", portrait);
    if (background && background.size > 0) data.set("backgroundFile", background);
    data.set("logoUrl", fields.logoUrl);
    if (draft.logoInFooter) data.set("logoInFooter", "on");
    data.set("imageUrl", fields.portraitUrl);
    data.set("landingImageUrl", fields.landingUrl);
    data.set("name", draft.name);
    data.set("category", draft.category);
    data.set("about", draft.aboutShort);
    data.set("body", draft.aboutBody);
    data.set("backgroundOpacity", String(draft.backgroundOpacity));
    data.set("showCalendar", draft.showCalendar ? "on" : "off");
    data.set("showPortrait", draft.showPortrait ? "on" : "off");
    data.set("email", draft.email);
    data.set("phone", draft.phone);
    data.set("address", draft.address);
    data.set("hours", draft.hours);
    data.set("google", draft.reviewLinks.google);
    data.set("yelp", draft.reviewLinks.yelp);
    data.set("facebook", draft.reviewLinks.facebook);
    data.set("other", draft.reviewLinks.other);
    if (draft.reviewLinks.googleOn) data.set("googleOn", "on");
    if (draft.reviewLinks.yelpOn) data.set("yelpOn", "on");
    if (draft.reviewLinks.facebookOn) data.set("facebookOn", "on");
    if (draft.reviewLinks.otherOn) data.set("otherOn", "on");
    data.set("primary", draft.theme.primary);
    data.set("secondary", draft.theme.secondary);
    data.set("background", draft.theme.background);
    data.set("foreground", draft.theme.foreground);
    data.set("font", draft.theme.font);
    data.set("mode", draft.theme.mode);
    appendNavigation(data, draft.navigation, draft.navLabels);
    publishAction(data);
  }
  publishRef.current = publishCurrent;

  function showPage(id: NavPage) {
    changeDraft((current) => ({ ...current, navigation: current.navigation.includes(id) ? current.navigation : [...current.navigation, id] }));
    setPagesOpen((current) => ({ ...current, [id]: true }));
    window.setTimeout(() => document.getElementById(`editor-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  function hidePage(id: NavPage) {
    changeDraft((current) => ({ ...current, navigation: current.navigation.filter((item) => item !== id) }));
  }

  function addEssential(id: "services" | "appointments" | "contact") {
    if (!draft.navigation.includes(id) && draft.navigation.length >= 8) return;
    changeDraft((current) => ({ ...current, navigation: current.navigation.includes(id) ? current.navigation : [...current.navigation, id] }));
    setPagesOpen((current) => ({ ...current, [id]: true }));
    setNameOpen(false);
    setPageKind("custom");
    setPageName("");
    window.setTimeout(() => document.getElementById(`editor-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  function addFormPage(label: string, starter: FormStarter) {
    const name = label.trim();
    if (!name || draft.navigation.length >= 8) return;
    const id = `c${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const page: CustomNavPage = { id, label: name, body: "", form: starterFields(starter) };
    changeDraft((current) => ({ ...current, navigation: [...current.navigation, page] }));
    setPagesOpen((current) => ({ ...current, [id]: true }));
    setNameOpen(false);
    setPageKind("custom");
    setFormStarter("blank");
    setPageName("");
    window.setTimeout(() => document.getElementById(`editor-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  function addPage(label: string) {
    const name = label.trim();
    if (!name || draft.navigation.length >= 8) return;
    const id = `c${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const page: CustomNavPage = { id, label: name, body: "" };
    changeDraft((current) => ({ ...current, navigation: [...current.navigation, page] }));
    setPagesOpen((current) => ({ ...current, [id]: true }));
    setNameOpen(false);
    setPageName("");
    window.setTimeout(() => document.getElementById(`editor-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  function showTestimonials() {
    setTestimonialsOn(true);
    setTestimonialsOpen(true);
    void setTestimonialsSection(true);
    window.setTimeout(() => document.getElementById("editor-testimonials")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  function hideTestimonials() {
    setTestimonialsOn(false);
    setTestimonialsOpen(false);
    void setTestimonialsSection(false);
  }

  function showCustom(id: string) {
    setPagesOpen((current) => ({ ...current, [id]: true }));
    window.setTimeout(() => document.getElementById(`editor-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  function updatePage(id: string, partial: Partial<CustomNavPage>) {
    changeDraft((current) => ({
      ...current,
      navigation: current.navigation.map((item) => typeof item !== "string" && item.id === id ? { ...item, ...partial } : item),
    }));
  }

  function editSection(id: string) {
    if (id === "services" || id === "about" || id === "contact" || id === "appointments") {
      changeDraft((current) => ({ ...current, navLabels: { ...current.navLabels, [id]: current.navLabels[id] || t(navLabel[id]) } }));
    }
    setEditing(id);
  }

  function finishBuiltIn(id: NavPage) {
    const value = draft.navLabels[id].trim();
    patch({ navLabels: { ...draft.navLabels, [id]: value === t(navLabel[id]) ? "" : value } });
    setEditing("");
  }

  function builtInName(id: NavPage) {
    return draft.navLabels[id] || t(navLabel[id]);
  }

  function renameBuiltIn(id: NavPage, value: string) {
    patch({ navLabels: { ...draft.navLabels, [id]: value.slice(0, 40) } });
  }

  function deleteSection(item: SiteNavItem) {
    if (typeof item === "string") {
      hidePage(item);
      setPagesOpen((current) => ({ ...current, [item]: false }));
      return;
    }
    removePage(item.id);
  }

  function removePage(id: string) {
    changeDraft((current) => ({ ...current, navigation: current.navigation.filter((item) => typeof item === "string" || item.id !== id) }));
  }

  function moveSection(fromId: string, toId: string) {
    setDragOver("");
    if (!fromId || fromId === toId) return;
    changeDraft((current) => {
      const from = current.navigation.findIndex((item) => (typeof item === "string" ? item : item.id) === fromId);
      const to = current.navigation.findIndex((item) => (typeof item === "string" ? item : item.id) === toId);
      if (from < 0 || to < 0) return current;
      const navigation = [...current.navigation];
      const [moved] = navigation.splice(from, 1);
      navigation.splice(to, 0, moved);
      return { ...current, navigation };
    });
  }

  return (
    <section ref={sectionRef} className="space-y-4">
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <article className="panel w-full p-5">
          <h2 className={title}>{t("dash.logo")}</h2>
          <p className="mt-1 text-xs text-muted">{t("dash.logoLive")}</p>
          <form action={saveLogoForm} className="mt-4 grid gap-3 text-sm">
            <div className="flex h-16 items-center gap-3 rounded-xl border border-border bg-white px-3">
              {fields.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fields.logoUrl} alt="" className="h-8 max-w-[11rem] object-contain object-left" />
              ) : (
                <>
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-[11px] text-background">{fields.name.slice(0, 1) || "N"}</span>
                  <span className="font-semibold">{fields.name}</span>
                </>
              )}
            </div>
            <ImageUpload name="file" label={t("dash.uploadLogo")} onPreview={(url) => patch({ logoUrl: url || fields.logoUrl })} />
            <input type="hidden" name="logoUrl" value={fields.logoUrl} />
            <label className="flex items-center gap-2"><input type="checkbox" name="logoInFooter" checked={draft.logoInFooter} onChange={(event) => patch({ logoInFooter: event.target.checked })} />{t("dash.logoFooter")}</label>
            <button className="btn-primary" type="submit">{t("dash.saveLogo")}</button>
          </form>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium">{t("dash.maintenance")}</p>
              <p className="mt-1 text-xs text-muted">{t("dash.maintenanceNote")}</p>
            </div>
            <button type="button" role="switch" aria-checked={draft.maintenance} aria-label={t("dash.maintenance")} disabled={maintenancePending} onClick={() => {
              const next = !draft.maintenance;
              patch({ maintenance: next });
              setMaintenanceError("");
              const data = new FormData();
              data.set("maintenance", next ? "on" : "off");
              startMaintenance(async () => {
                try {
                  const result = await setMaintenance(data);
                  if (result && "error" in result && result.error) {
                    patch({ maintenance: !next });
                    setMaintenanceError(result.error);
                  }
                } catch {
                  patch({ maintenance: !next });
                  setMaintenanceError("Maintenance could not be updated.");
                }
              });
            }} className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${draft.maintenance ? "bg-primary" : "bg-[#e7e6e0]"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${draft.maintenance ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
          {maintenanceError ? <p role="alert" className="mt-2 text-sm text-secondary">{maintenanceError}</p> : null}
        </article>

        <article className="panel flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className={title}>{t("dash.changesPreview")}</h2>
              <p className="mt-1 text-xs text-muted">{t("dash.changesNote")}</p>
            </div>
            <button type="button" onClick={publishCurrent} disabled={publishing} className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60">{publishing ? t("dash.publishing") : t("dash.publish")}</button>
          </div>
          <div className="relative mt-4 min-h-[248px] flex-1 overflow-hidden rounded-xl border border-border bg-white">
            <div className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ width: "222.222%", transform: "scale(0.45)" }}>
              <SitePreview draft={draft} site={site} today={today} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button type="button" aria-pressed={draft.showCalendar} disabled={calendarPending} onClick={() => {
              const next = !draft.showCalendar;
              patch({ showCalendar: next });
              setCalendarError("");
              const data = new FormData();
              data.set("showCalendar", next ? "on" : "off");
              startCalendar(async () => {
                try {
                  const result = await setShowCalendar(data);
                  if (result && "error" in result && result.error) {
                    patch({ showCalendar: !next });
                    setCalendarError(result.error);
                  }
                } catch {
                  patch({ showCalendar: !next });
                  setCalendarError("The calendar could not be updated.");
                }
              });
            }} className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60 ${draft.showCalendar ? "bg-primary text-on-primary" : "border border-border bg-white"}`}>{draft.showCalendar ? t("dash.calendarOff") : t("dash.calendarOn")}</button>
            <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary">{t("dash.previewPage")}</button>
          </div>
          {calendarError ? <p role="alert" className="mt-2 text-sm text-secondary">{calendarError}</p> : null}
        </article>
      </div>

      <ThemeCard theme={draft.theme} presets={fields.themePresets} onChange={(theme) => patch({ theme })} />

      <article className="panel p-5">
        <h2 className={title}>{t("dash.navigation")}</h2>
        <p className="mt-1 text-xs text-muted">{t("dash.navigationNote")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {draft.navigation.map((item) => {
            if (typeof item === "string") {
              return (
                <div key={item} className="inline-flex items-center rounded-xl bg-primary text-sm font-semibold text-on-primary">
                  <button type="button" onClick={() => showPage(item)} className="px-4 py-2" aria-pressed="true">{builtInName(item)}</button>
                  <button type="button" onClick={() => hidePage(item)} aria-label={`${t("dash.removeButton")} ${builtInName(item)}`} className="pr-3 text-base leading-none">×</button>
                </div>
              );
            }
            return (
              <div key={item.id} className="inline-flex items-center rounded-xl bg-primary text-sm font-semibold text-on-primary">
                <button type="button" onClick={() => showCustom(item.id)} className="px-4 py-2" aria-pressed="true">{item.label || t("dash.newPage")}</button>
                <button type="button" onClick={() => removePage(item.id)} aria-label={`${t("dash.removeButton")} ${item.label || t("dash.newPage")}`} className="pr-3 text-base leading-none">×</button>
              </div>
            );
          })}
          {navPages.filter((id) => !draft.navigation.includes(id)).map((id) => (
            <button key={id} type="button" onClick={() => showPage(id)} aria-pressed="false" className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold">{t(navLabel[id])}</button>
          ))}
          <button type="button" onClick={() => { setPageName(""); setPageKind("custom"); setNameOpen(true); }} className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold">{t("dash.addButton")}</button>
        </div>
        <form action={navAction} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button type="button" onClick={showTestimonials} aria-pressed={testimonialsOn} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold ${testimonialsOn ? "bg-primary text-on-primary" : "border border-border bg-white"}`}>{t("home.testimonials")}</button>
            <p className="min-w-0 text-xs text-muted">{t("dash.testimonialsButton")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <NavFields navigation={draft.navigation} navLabels={draft.navLabels} />
            {navState?.ok ? <p className="text-sm font-semibold">{t("dash.saved")}</p> : null}
            {navState?.error ? <p role="alert" className="text-sm text-secondary">{navState.error}</p> : null}
            <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60" type="submit" disabled={navSaving}>{t("common.save")}</button>
          </div>
        </form>
      </article>

      <article className="panel p-5">
        <button type="button" onClick={() => setHeroOpen((current) => !current)} aria-expanded={heroOpen} className="flex w-full items-center justify-between gap-3 text-left">
          <span className={title}>{t("dash.heroTab")}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${heroOpen ? "rotate-180" : ""}`} />
        </button>
        <form action={saveHeroForm} className={heroOpen ? "mt-4 grid gap-4 border-t border-border pt-4 text-sm" : "hidden"}>
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)]">
            <div className="grid content-start gap-2">
              <div className="flex items-center gap-3">
                <button type="button" role="switch" aria-checked={draft.showPortrait} aria-label={t("dash.showPortrait")} disabled={portraitPending} onClick={() => {
                  const next = !draft.showPortrait;
                  patch({ showPortrait: next });
                  setPortraitError("");
                  const data = new FormData();
                  data.set("showPortrait", next ? "on" : "off");
                  startPortrait(async () => {
                    try {
                      const result = await setShowPortrait(data);
                      if (result && "error" in result && result.error) {
                        patch({ showPortrait: !next });
                        setPortraitError(result.error);
                      }
                    } catch {
                      patch({ showPortrait: !next });
                      setPortraitError("The portrait could not be updated.");
                    }
                  });
                }} className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${draft.showPortrait ? "bg-primary" : "bg-[#e7e6e0]"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${draft.showPortrait ? "left-5" : "left-0.5"}`} />
                </button>
                <p className="font-medium">{t("dash.portrait")}</p>
              </div>
              <p className="text-xs text-muted">{t("dash.portraitLive")}</p>
              {portraitError ? <p role="alert" className="text-sm text-secondary">{portraitError}</p> : null}
              {draft.portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.portraitUrl} alt="" className={`aspect-[4/5] w-40 rounded-xl object-cover ${draft.showPortrait ? "" : "opacity-40"}`} />
              ) : (
                <div className={`grid aspect-[4/5] w-40 place-items-center rounded-xl bg-white text-2xl font-semibold ${draft.showPortrait ? "" : "opacity-40"}`}>{draft.name.slice(0, 1)}</div>
              )}
              <ImageUpload name="portraitFile" label={t("dash.uploadPortrait")} onPreview={(url) => patch({ portraitUrl: url || fields.portraitUrl })} />
              <input type="hidden" name="imageUrl" value={fields.portraitUrl} />
              <input type="hidden" name="showPortrait" value={draft.showPortrait ? "on" : "off"} />
            </div>
            <div className="grid content-start gap-2">
              <p className="font-medium">{t("dash.background")}</p>
              <p className="text-xs text-muted">{t("dash.heroLive")}</p>
              {draft.landingUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.landingUrl} alt="" className="h-[200px] w-full rounded-xl object-cover" style={{ opacity: draft.backgroundOpacity / 100 }} />
              ) : (
                <div className="grid h-[200px] place-items-center rounded-xl bg-white text-xs text-muted">{t("dash.background")}</div>
              )}
              <ImageUpload name="backgroundFile" label={t("dash.uploadBackground")} className="w-full lg:w-[51.515%]" onPreview={(url) => patch({ landingUrl: url || fields.landingUrl })} />
              <input type="hidden" name="landingImageUrl" value={fields.landingUrl} />
              <OpacitySlider defaultValue={fields.backgroundOpacity} onValueChange={(value) => patch({ backgroundOpacity: value })} />
              <input type="hidden" name="showCalendar" value={draft.showCalendar ? "on" : "off"} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1">{t("dash.category")}<input name="category" value={draft.category} onChange={(event) => patch({ category: event.target.value })} className={field} /></label>
            <label className="grid gap-1">{t("common.name")}<input name="name" value={draft.name} onChange={(event) => patch({ name: event.target.value })} className={field} /></label>
          </div>
          <label className="grid gap-1">{t("dash.taglineSlogan")}<textarea name="about" value={draft.aboutShort} onChange={(event) => patch({ aboutShort: event.target.value })} className={field} /></label>
          <div className="flex justify-end">
            <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary" type="submit">{t("common.save")}</button>
          </div>
        </form>
      </article>

      <p className="text-xs leading-relaxed text-muted">{t("dash.dragPages")}</p>
      {draft.navigation.map((item) => {
        const id = typeof item === "string" ? item : item.id;
        return (
          <article key={id} id={`editor-${id}`} onDragOver={(event) => { event.preventDefault(); setDragOver(id); }} onDrop={(event) => { event.preventDefault(); moveSection(event.dataTransfer.getData("text/plain"), id); }} className={`panel scroll-mt-6 p-5 ${dragOver === id ? "ring-2 ring-primary" : ""}`}>
            {item === "services" ? (
              <>
                <div className="flex items-center gap-2">
                  <DragHandle id={id} label={t("dash.dragSection")} />
                  <EditableTitle active={editing === id} value={draft.navLabels.services} placeholder={t("nav.services")} label={t("dash.editPage")} expanded={Boolean(pagesOpen.services)} onChange={(value) => renameBuiltIn("services", value)} onDone={() => finishBuiltIn("services")} onToggle={() => setPagesOpen((current) => ({ ...current, services: !current.services }))} />
                  <PageActions label={t("nav.services")} open={Boolean(pagesOpen.services)} onEdit={() => editSection(id)} onDelete={() => deleteSection(item)} onToggle={() => setPagesOpen((current) => ({ ...current, services: !current.services }))} editLabel={t("dash.editPage")} deleteLabel={t("dash.removeButton")} />
                </div>
                {pagesOpen.services ? <ServicePageSettings services={catalog.services} staff={catalog.staff} days={catalog.days} /> : null}
              </>
            ) : null}
            {item === "about" ? (
              <>
                <div className="flex items-center gap-2">
                  <DragHandle id={id} label={t("dash.dragSection")} />
                  <EditableTitle active={editing === id} value={draft.navLabels.about} placeholder={t("nav.about")} label={t("dash.editPage")} expanded={Boolean(pagesOpen.about)} onChange={(value) => renameBuiltIn("about", value)} onDone={() => finishBuiltIn("about")} onToggle={() => setPagesOpen((current) => ({ ...current, about: !current.about }))} />
                  <PageActions label={t("nav.about")} open={Boolean(pagesOpen.about)} onEdit={() => editSection(id)} onDelete={() => deleteSection(item)} onToggle={() => setPagesOpen((current) => ({ ...current, about: !current.about }))} editLabel={t("dash.editPage")} deleteLabel={t("dash.removeButton")} />
                </div>
                <form action={aboutAction} className={pagesOpen.about ? "mt-4 grid gap-3 border-t border-border pt-4 text-sm" : "hidden"}>
                  <p className="text-xs text-muted">{t("dash.aboutPage")}</p>
                  <textarea name="body" value={draft.aboutBody} onChange={(event) => patch({ aboutBody: event.target.value })} className={field} />
                  <div className="flex items-center justify-end gap-3">
                    {aboutState?.ok ? <p className="text-sm font-semibold">{t("dash.saved")}</p> : null}
                    {aboutState?.error ? <p role="alert" className="text-sm text-secondary">{aboutState.error}</p> : null}
                    <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60" type="submit" disabled={aboutSaving}>{t("common.save")}</button>
                  </div>
                </form>
              </>
            ) : null}
            {item === "contact" ? (
              <>
                <div className="flex items-center gap-2">
                  <DragHandle id={id} label={t("dash.dragSection")} />
                  <EditableTitle active={editing === id} value={draft.navLabels.contact} placeholder={t("nav.contact")} label={t("dash.editPage")} expanded={Boolean(pagesOpen.contact)} onChange={(value) => renameBuiltIn("contact", value)} onDone={() => finishBuiltIn("contact")} onToggle={() => setPagesOpen((current) => ({ ...current, contact: !current.contact }))} />
                  <PageActions label={t("nav.contact")} open={Boolean(pagesOpen.contact)} onEdit={() => editSection(id)} onDelete={() => deleteSection(item)} onToggle={() => setPagesOpen((current) => ({ ...current, contact: !current.contact }))} editLabel={t("dash.editPage")} deleteLabel={t("dash.removeButton")} />
                </div>
                <form action={contactAction} className={pagesOpen.contact ? "mt-4 grid gap-3 border-t border-border pt-4 text-sm" : "hidden"}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted">{t("dash.contactPage")}</p>
                    <button type="button" aria-expanded={formsOpen} onClick={() => setFormsOpen((current) => !current)} className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold">{t("dash.forms")}</button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1">{t("common.email")}<input name="email" value={draft.email} onChange={(event) => patch({ email: event.target.value })} className={field} /></label>
                    <label className="grid gap-1">{t("common.phone")}<input name="phone" value={draft.phone} onChange={(event) => patch({ phone: event.target.value })} className={field} /></label>
                  </div>
                  <label className="grid gap-1">{t("dash.address")}<input name="address" value={draft.address} onChange={(event) => patch({ address: event.target.value })} className={field} /></label>
                  <label className="grid gap-1">{t("dash.hoursLabel")}<input name="hours" value={draft.hours} onChange={(event) => patch({ hours: event.target.value })} className={field} /></label>
                  <div className="flex items-center justify-end gap-3">
                    {contactState?.ok ? <p className="text-sm font-semibold">{t("dash.saved")}</p> : null}
                    {contactState?.error ? <p role="alert" className="text-sm text-secondary">{contactState.error}</p> : null}
                    <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60" type="submit" disabled={contactSaving}>{t("common.save")}</button>
                  </div>
                </form>
                {pagesOpen.contact && formsOpen ? <div className="mt-3"><ContactFormEditor fields={contactFields} onChange={setContactFields} /></div> : null}
              </>
            ) : null}
            {item === "appointments" ? (
              <>
                <div className="flex items-center gap-2">
                  <DragHandle id={id} label={t("dash.dragSection")} />
                  <EditableTitle active={editing === id} value={draft.navLabels.appointments} placeholder={t("nav.appointments")} label={t("dash.editPage")} expanded={Boolean(pagesOpen.appointments)} onChange={(value) => renameBuiltIn("appointments", value)} onDone={() => finishBuiltIn("appointments")} onToggle={() => setPagesOpen((current) => ({ ...current, appointments: !current.appointments }))} />
                  <PageActions label={t("nav.appointments")} open={Boolean(pagesOpen.appointments)} onEdit={() => editSection(id)} onDelete={() => deleteSection(item)} onToggle={() => setPagesOpen((current) => ({ ...current, appointments: !current.appointments }))} editLabel={t("dash.editPage")} deleteLabel={t("dash.removeButton")} />
                </div>
                <form action={bookingAction} className={pagesOpen.appointments ? "mt-4 grid gap-3 border-t border-border pt-4 text-sm" : "hidden"}>
                  <p className="text-xs text-muted">{t("dash.appointmentsPage")}</p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="grid gap-1">{t("dash.horizonDays")}<input name="horizonDays" type="number" min={1} defaultValue={site.booking.horizonDays} className={field} /></label>
                    <label className="grid gap-1">{t("dash.minNotice")}<input name="minNotice" type="number" min={0} defaultValue={site.booking.minNoticeMinutes} className={field} /></label>
                    <label className="grid gap-1">{t("dash.slotInterval")}<input name="interval" type="number" min={5} defaultValue={site.booking.slotIntervalMinutes} className={field} /></label>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    {bookingState?.ok ? <p className="text-sm font-semibold">{t("dash.saved")}</p> : null}
                    {bookingState?.error ? <p role="alert" className="text-sm text-secondary">{bookingState.error}</p> : null}
                    <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60" type="submit" disabled={bookingSaving}>{t("common.save")}</button>
                  </div>
                </form>
              </>
            ) : null}
            {typeof item !== "string" ? (
              <>
                <div className="flex items-center gap-2">
                  <DragHandle id={id} label={t("dash.dragSection")} />
                  <EditableTitle active={editing === id} value={item.label} placeholder={t("dash.newPage")} label={t("dash.editPage")} expanded={Boolean(pagesOpen[item.id])} onChange={(value) => updatePage(item.id, { label: value.slice(0, 40) })} onDone={() => setEditing("")} onToggle={() => setPagesOpen((current) => ({ ...current, [item.id]: !current[item.id] }))} />
                  <PageActions label={item.label || t("dash.newPage")} open={Boolean(pagesOpen[item.id])} onEdit={() => editSection(id)} onDelete={() => deleteSection(item)} onToggle={() => setPagesOpen((current) => ({ ...current, [item.id]: !current[item.id] }))} editLabel={t("dash.editPage")} deleteLabel={t("dash.removeButton")} />
                </div>
                <form action={navAction} className={pagesOpen[item.id] ? "mt-4 grid gap-3 border-t border-border pt-4 text-sm" : "hidden"}>
                  <NavFields navigation={draft.navigation} navLabels={draft.navLabels} />
                  <label className="grid gap-1">{t("dash.buttonLabel")}<input value={item.label} onChange={(event) => updatePage(item.id, { label: event.target.value })} className={field} /></label>
                  <label className="grid gap-1">{t("dash.pageText")}<textarea value={item.body} onChange={(event) => updatePage(item.id, { body: event.target.value })} className={field} /></label>
                  {item.form ? <PageFormFields fields={item.form} onChange={(form) => updatePage(item.id, { form })} /> : null}
                  <div className="flex items-center justify-end gap-3">
                    {navState?.ok ? <p className="text-sm font-semibold">{t("dash.saved")}</p> : null}
                    {navState?.error ? <p role="alert" className="text-sm text-secondary">{navState.error}</p> : null}
                    <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60" type="submit" disabled={navSaving}>{t("common.save")}</button>
                  </div>
                </form>
              </>
            ) : null}
          </article>
        );
      })}
      {testimonialsOn ? (
        <article id="editor-testimonials" className="panel scroll-mt-6 p-5">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 shrink-0" />
            <button type="button" onClick={() => setTestimonialsOpen((current) => !current)} aria-expanded={testimonialsOpen} className="flex min-w-0 flex-1 items-center text-left">
              <span className={title}>{t("home.testimonials")}</span>
            </button>
            <PageActions label={t("home.testimonials")} open={testimonialsOpen} onEdit={() => setTestimonialsOpen(true)} onDelete={hideTestimonials} onToggle={() => setTestimonialsOpen((current) => !current)} editLabel={t("dash.editPage")} deleteLabel={t("dash.removeButton")} />
          </div>
          <form action={reviewAction} className={testimonialsOpen ? "mt-4 grid gap-3 border-t border-border pt-4 text-sm" : "hidden"}>
            <p className="text-xs text-muted">{t("dash.testimonialsNote")}</p>
            {([
              ["google", "googleOn", "dash.googleReviews"],
              ["yelp", "yelpOn", "dash.yelpReviews"],
              ["facebook", "facebookOn", "dash.facebookReviews"],
              ["other", "otherOn", "dash.otherReviews"],
            ] as const).map(([key, flag, label]) => (
              <div key={key} className="flex items-center gap-3">
                <input type="checkbox" name={flag} checked={draft.reviewLinks[flag]} aria-label={t(label)} onChange={(event) => changeDraft((current) => ({ ...current, reviewLinks: { ...current.reviewLinks, [flag]: event.target.checked } }))} className="h-4 w-4 shrink-0" />
                <label className="grid min-w-0 flex-1 gap-1">{t(label)}<input name={key} value={draft.reviewLinks[key]} onChange={(event) => changeDraft((current) => ({ ...current, reviewLinks: { ...current.reviewLinks, [key]: event.target.value } }))} placeholder="https://" className={field} /></label>
              </div>
            ))}
            <div className="flex items-center justify-end gap-3">
              {reviewState?.ok ? <p className="text-sm font-semibold">{reviewState.imported ? t("dash.reviewsSaved", { count: reviewState.imported }) : t("dash.saved")}</p> : null}
              {reviewState?.error ? <p role="alert" className="text-sm text-secondary">{reviewState.error}</p> : null}
              <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60" type="submit" disabled={reviewSaving}>{t("common.save")}</button>
            </div>
          </form>
        </article>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-foreground/50 p-3" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="website-preview-title" className="mx-auto flex h-full w-full max-w-[1280px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
              <p id="website-preview-title" className="text-sm font-semibold">{t("dash.changesPreview")}</p>
              <button type="button" autoFocus onClick={() => setOpen(false)} className="rounded-xl border border-border px-3 py-1.5 text-sm font-semibold">{t("common.close")}</button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <SitePage site={withDraft(site, draft, contactFields)} viewer={null} today={today} preview />
            </div>
          </div>
        </div>
      ) : null}
      {nameOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4" onClick={() => setNameOpen(false)}>
          <form role="dialog" aria-modal="true" aria-labelledby="name-page-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); if (pageKind === "custom") addPage(pageName); else if (pageKind === "forms") addFormPage(pageName, formStarter); else addEssential(pageKind); }}>
            <div className="flex items-center justify-between gap-3">
              <h2 id="name-page-title" className={title}>{t("dash.addButton")}</h2>
              <button type="button" onClick={() => setNameOpen(false)} className="rounded-xl border border-border px-3 py-1.5 text-sm font-semibold">{t("common.close")}</button>
            </div>
            <label className="mt-4 grid gap-1 text-sm">{t("dash.pageKind")}
              <select value={pageKind} onChange={(event) => setPageKind(event.target.value as typeof pageKind)} className={field}>
                <option value="custom">{t("dash.customPage")}</option>
                <option value="services">{t("nav.services")}</option>
                <option value="appointments">{t("nav.appointments")}</option>
                <option value="contact">{t("nav.contact")}</option>
                <option value="forms">{t("dash.forms")}</option>
              </select>
            </label>
            {pageKind === "custom" || pageKind === "forms" ? (
              <>
                <p className="mt-2 text-xs text-muted">{pageKind === "forms" ? t("dash.formNote") : t("dash.namePage")}</p>
                <label className="mt-4 grid gap-1 text-sm">{t("dash.buttonLabel")}<input autoFocus required value={pageName} onChange={(event) => setPageName(event.target.value)} className={field} /></label>
                {pageKind === "forms" ? (
                  <label className="mt-3 grid gap-1 text-sm">{t("dash.formStart")}
                    <select value={formStarter} onChange={(event) => setFormStarter(event.target.value as FormStarter)} className={field}>
                      <option value="contact">{t("dash.formContact")}</option>
                      <option value="quote">{t("dash.formQuote")}</option>
                      <option value="survey">{t("dash.formSurvey")}</option>
                      <option value="blank">{t("dash.formBlank")}</option>
                    </select>
                  </label>
                ) : null}
              </>
            ) : <p className="mt-2 text-xs text-muted">{t("dash.essentialNote")}</p>}
            <div className="mt-4 flex justify-end">
              <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary">{t("dash.addButton")}</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function PageActions({ label, open, onEdit, onDelete, onToggle, editLabel, deleteLabel }: { label: string; open: boolean; onEdit: () => void; onDelete: () => void; onToggle: () => void; editLabel: string; deleteLabel: string }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onEdit} aria-label={editLabel} className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-white"><Pencil className="h-4 w-4" /></button>
      <button type="button" onClick={onDelete} aria-label={`${deleteLabel} ${label}`} className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-white"><Trash2 className="h-4 w-4" /></button>
      <button type="button" onClick={onToggle} aria-label={label} className="grid h-8 w-8 place-items-center rounded-lg"><ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} /></button>
    </div>
  );
}

function DragHandle({ id, label }: { id: string; label: string }) {
  return (
    <button type="button" draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", id); event.dataTransfer.effectAllowed = "move"; }} aria-label={label} className="grid h-8 w-8 shrink-0 cursor-grab place-items-center rounded-lg text-muted active:cursor-grabbing">
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

function EditableTitle({ active, value, placeholder, label, expanded, onChange, onDone, onToggle }: { active: boolean; value: string; placeholder: string; label: string; expanded: boolean; onChange: (value: string) => void; onDone: () => void; onToggle: () => void }) {
  if (active) {
    return <input autoFocus aria-label={label} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} onBlur={onDone} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onDone(); } }} className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none" />;
  }
  return (
    <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex min-w-0 flex-1 items-center text-left">
      <span className={title}>{value || placeholder}</span>
    </button>
  );
}

function formPayload(form?: CustomNavPage["form"]) {
  if (!form) return "";
  return JSON.stringify(form.map((field) => ({
    ...field,
    label: field.label.trim(),
    options: field.type === "select" ? (field.options ?? []).map((option) => option.trim()).filter(Boolean) : undefined,
  })));
}

function NavFields({ navigation, navLabels }: { navigation: SiteNavItem[]; navLabels: WebsiteFields["navLabels"] }) {
  return (
    <>
      <input type="hidden" name="labelServices" value={navLabels.services} />
      <input type="hidden" name="labelAbout" value={navLabels.about} />
      <input type="hidden" name="labelContact" value={navLabels.contact} />
      {navigation.map((item) => {
        const id = typeof item === "string" ? item : item.id;
        return <input key={`order-${id}`} type="hidden" name="order" value={id} />;
      })}
      {navigation.filter((item) => typeof item === "string").map((id) => <input key={`nav-${id}`} type="hidden" name="nav" value={id} />)}
      {navigation.filter((item): item is CustomNavPage => typeof item !== "string").map((page) => (
        <span key={`page-${page.id}`} className="hidden">
          <input type="hidden" name="pageId" value={page.id} />
          <input type="hidden" name="pageLabel" value={page.label} />
          <input type="hidden" name="pageBody" value={page.body} />
          <input type="hidden" name="pageForm" value={formPayload(page.form)} />
        </span>
      ))}
    </>
  );
}

function appendNavigation(data: FormData, navigation: SiteNavItem[], navLabels: WebsiteFields["navLabels"]) {
  data.set("labelServices", navLabels.services);
  data.set("labelAbout", navLabels.about);
  data.set("labelContact", navLabels.contact);
  navigation.forEach((item) => {
    data.append("order", typeof item === "string" ? item : item.id);
    if (typeof item === "string") data.append("nav", item);
    else {
      data.append("pageId", item.id);
      data.append("pageLabel", item.label);
      data.append("pageBody", item.body);
      data.append("pageForm", formPayload(item.form));
    }
  });
}

function withDraft(site: PublicSite, draft: WebsiteFields, contactForm = site.contactForm): PublicSite {
  return {
    ...site,
    contactForm,
    name: draft.name,
    category: draft.category,
    tagline: draft.aboutShort,
    logoUrl: draft.logoUrl,
    logoInFooter: draft.logoInFooter,
    maintenance: draft.maintenance,
    hero: { ...site.hero, imageUrl: draft.portraitUrl, landingImageUrl: draft.landingUrl, backgroundOpacity: draft.backgroundOpacity, showCalendar: draft.showCalendar, showPortrait: draft.showPortrait },
    about: { ...site.about, short: draft.aboutShort, body: draft.aboutBody, companyBio: draft.companyBio, visible: draft.navigation.includes("about") },
    contact: { ...site.contact, email: draft.email, phone: draft.phone, address: draft.address, hours: draft.hours },
    navigation: draft.navigation,
    navLabels: draft.navLabels,
    reviewLinks: draft.reviewLinks,
    theme: paletteTheme(draft.theme),
  };
}

function SitePreview({ draft, site, today }: { draft: WebsiteFields; site: PublicSite; today: string }) {
  const t = useT();
  const initial = draft.name.slice(0, 1) || "N";
  if (draft.maintenance) return <MaintenancePage name={draft.name} category={draft.category} logoUrl={draft.logoUrl} compact />;
  return (
    <div className="overflow-hidden rounded-[16px] border border-border bg-background text-foreground" style={themeStyle(paletteTheme(draft.theme))}>
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
        <div className="flex h-8 items-center gap-2 text-sm font-semibold tracking-tight">
          {draft.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.logoUrl} alt="" className="h-8 max-w-[11rem] object-contain object-left" />
          ) : (
            <>
              <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-[11px] text-background">{initial}</span>
              {draft.name}
            </>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-foreground">
          {menuEntries(draft.navigation, { services: draft.navLabels.services || t("nav.services"), about: draft.navLabels.about || t("nav.about"), contact: draft.navLabels.contact || t("nav.contact"), appointments: draft.navLabels.appointments || t("nav.appointments") }).map((item) => <span key={item.id}>{item.label}</span>)}
        </div>
      </div>
      <div className="relative">
        {draft.landingUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.landingUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ opacity: draft.backgroundOpacity / 100 }} />
        ) : null}
        <div className={`relative grid items-start gap-6 p-4 lg:p-5 ${draft.showCalendar ? "lg:grid-cols-[minmax(0,0.28fr)_minmax(0,0.44fr)_minmax(0,0.28fr)]" : draft.showPortrait ? "lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)]" : ""}`}>
          {draft.showPortrait ? (
          <div className={`panel relative min-h-[420px] overflow-hidden bg-surface ${draft.showCalendar ? "lg:col-start-1" : ""}`}>
            {draft.portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.portraitUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="grid min-h-[420px] place-items-center text-4xl font-semibold">{initial}</div>
            )}
          </div>
          ) : null}
          <div className={`flex flex-col self-stretch ${draft.showCalendar && !draft.showPortrait ? "lg:col-span-2" : ""}`}>
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-[#9b9b94]">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              {(draft.category || " ").toUpperCase()}
            </p>
            <h3 className="mt-3 text-[2.75rem] font-semibold leading-[0.95] tracking-tight">{draft.name}</h3>
            {draft.aboutShort ? <p className="mt-1 max-w-sm text-[15px] leading-relaxed text-muted">{draft.aboutShort}</p> : null}
            {draft.showCalendar ? null : <div className="mt-auto pt-4"><span className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary">{t("booking.title")}</span></div>}
          </div>
          {draft.showCalendar ? (
            <div className="hidden lg:col-start-3 lg:block">
              <BookingPanel site={withDraft(site, draft)} today={today} frost preview />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

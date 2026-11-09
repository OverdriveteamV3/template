import Link from "next/link";
import { ColorField } from "@/components/dashboard/color-field";
import type { MessageKey } from "@/lib/i18n/messages";
import { contrastRatio, meetsContrast } from "@/lib/theme/contrast";
import { voidAction } from "@/lib/utils";
import { publishWebsite, rollbackWebsite, saveHeroImage, saveHeroLanding, saveLogo, saveWebsite } from "@/server/dashboard-actions";

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

export type WebsiteFields = {
  name: string;
  category: string;
  tagline: string;
  aboutShort: string;
  companyBio: string;
  aboutVisible: boolean;
  email: string;
  phone: string;
  address: string;
  hours: string;
  socials: { label: string; href: string }[];
  logoUrl: string;
  portraitUrl: string;
  landingUrl: string;
  theme: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    foreground: string;
    muted: string;
    border: string;
  };
  seoTitle: string;
  seoDescription: string;
  indexable: boolean;
};

const policyLinks = [
  ["privacy", "dash.privacy"],
  ["terms", "dash.terms"],
  ["cancellation", "dash.cancellation"],
] as const satisfies ReadonlyArray<readonly [string, MessageKey]>;

const field = "w-full rounded-xl border border-border px-3 py-2";

export function WebsiteEditor({
  t,
  fields,
  editable,
  policies,
  archived,
}: {
  t: Translate;
  fields: WebsiteFields;
  editable: boolean;
  policies: { slug: string; title: string }[];
  archived: { id: string; version: number }[];
}) {
  const socialSlots = Math.min(8, Math.max(4, fields.socials.length));
  const contrast = contrastRatio("#111111", fields.theme.primary);
  const swatches = [
    ["primary", "dash.swatchPrimary", fields.theme.primary],
    ["secondary", "dash.swatchSecondary", fields.theme.secondary],
    ["surface", "dash.swatchSurface", fields.theme.surface],
    ["foreground", "dash.swatchText", fields.theme.foreground],
  ] as const satisfies ReadonlyArray<readonly [string, MessageKey, string]>;
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{t("dash.websiteTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{editable ? t("dash.draftHint") : t("dash.websiteWait")}</p>
      </div>
      <article className="panel p-4">
        <h2 className="text-sm font-semibold">{t("dash.preview")}</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.28fr)_minmax(0,0.44fr)_minmax(0,0.28fr)]">
          <div className="overflow-hidden rounded-xl border border-border bg-white">
            {fields.portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fields.portraitUrl} alt="" className="h-40 w-full object-cover" />
            ) : (
              <div className="grid h-40 place-items-center bg-surface text-2xl font-semibold">{fields.name.slice(0, 1)}</div>
            )}
            <p className="px-3 py-2 text-xs text-muted">{fields.email}</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-muted">{fields.category.toUpperCase()}</p>
            <p className="mt-2 text-xl font-semibold">{fields.name}</p>
            {fields.aboutShort ? <p className="mt-2 text-sm text-muted">{fields.aboutShort}</p> : null}
          </div>
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="text-sm font-semibold">{t("booking.title")}</p>
            <div className="mt-4 h-10 rounded-full" style={{ background: fields.theme.primary }} />
          </div>
        </div>
      </article>
      <form action={editable ? voidAction(saveWebsite) : undefined} className="grid gap-3 text-sm">
        <fieldset disabled={!editable} className="grid gap-3 disabled:opacity-80">
          <h2 className="text-lg font-semibold">{t("dash.aboutShort")}</h2>
          <label className="grid gap-1">{t("common.name")}<input name="name" defaultValue={fields.name} className={field} /></label>
          <label className="grid gap-1">{t("dash.category")}<input name="category" defaultValue={fields.category} className={field} /></label>
          <label className="grid gap-1">{t("owner.tagline")}<input name="tagline" defaultValue={fields.tagline} className={field} /></label>
          <label className="grid gap-1">{t("dash.aboutShort")}<textarea name="about" defaultValue={fields.aboutShort} className={field} /></label>
          <label className="grid gap-1">{t("dash.companyBio")}<textarea name="companyBio" defaultValue={fields.companyBio} className={field} /></label>
          <label className="flex gap-2"><input name="aboutVisible" type="checkbox" defaultChecked={fields.aboutVisible} /> {t("dash.showAbout")}</label>
          <h2 className="mt-2 text-lg font-semibold">{t("home.contact")}</h2>
          <label className="grid gap-1">
            {t("dash.publicEmail")}
            <input name="email" type="email" defaultValue={fields.email} className={field} />
            <span className="text-xs text-muted">{t("dash.submissionEmail")}</span>
          </label>
          <label className="grid gap-1">{t("common.phone")}<input name="phone" defaultValue={fields.phone} className={field} /></label>
          <label className="grid gap-1">{t("dash.address")}<input name="address" defaultValue={fields.address} className={field} /></label>
          <label className="grid gap-1">{t("dash.hoursLabel")}<input name="hours" defaultValue={fields.hours} className={field} /></label>
          <h2 className="mt-2 text-lg font-semibold">{t("dash.footer")}</h2>
          <p className="text-muted">{t("dash.footerLive")}</p>
          {Array.from({ length: socialSlots }, (_, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1">
                {t("dash.network")}
                <select name="socialLabel" defaultValue={fields.socials[index]?.label ?? ""} className={field}>
                  <option value="">{t("dash.none")}</option>
                  {["Instagram", "Facebook", "TikTok", "X", "YouTube", "LinkedIn", "Email"].map((network) => <option key={network}>{network}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                {t("dash.profileUrl")}
                <input name="socialHref" defaultValue={fields.socials[index]?.href ?? ""} placeholder="https://" className={field} />
              </label>
            </div>
          ))}
          <h2 className="mt-2 text-lg font-semibold">{t("dash.themeTitle")}</h2>
          <p className="text-xs">{t("dash.contrast", { ratio: contrast.toFixed(2), result: meetsContrast("#111111", fields.theme.primary) ? t("dash.contrastOk") : t("dash.contrastReview") })}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {swatches.map(([name, label, value]) => <ColorField key={name} name={name} label={t(label)} value={value} disabled={!editable} />)}
          </div>
          <input type="hidden" name="background" value={fields.theme.background} />
          <input type="hidden" name="muted" value={fields.theme.muted} />
          <input type="hidden" name="border" value={fields.theme.border} />
          <label className="grid gap-1">{t("dash.seoTitle")}<input name="seoTitle" defaultValue={fields.seoTitle} className={field} /></label>
          <label className="grid gap-1">{t("dash.seoDescription")}<input name="seoDescription" defaultValue={fields.seoDescription} className={field} /></label>
          <label className="flex gap-2"><input name="indexable" type="checkbox" defaultChecked={fields.indexable} /> {t("dash.index")}</label>
          <button className="btn-primary disabled:opacity-50" type="submit" disabled={!editable}>{t("dash.saveDraft")}</button>
        </fieldset>
      </form>
      <ImageGroup t={t} editable={editable} title={t("dash.logo")} hint={t("dash.logoLive")} src={fields.logoUrl} fileLabel={t("dash.replaceLogo")} fileId="logo-file" urlName="logoUrl" urlValue={fields.logoUrl} action={saveLogo} submit={t("dash.saveLogo")} />
      <ImageGroup t={t} editable={editable} title={t("dash.portrait")} hint={t("dash.portraitLive")} src={fields.portraitUrl} fileLabel={t("dash.replacePortrait")} fileId="portrait-file" urlName="imageUrl" urlValue={fields.portraitUrl} action={saveHeroImage} submit={t("dash.savePortrait")} cover />
      <ImageGroup t={t} editable={editable} title={t("dash.hero")} hint={t("dash.heroLive")} src={fields.landingUrl} fileLabel={t("dash.replaceHero")} fileId="hero-landing-file" urlName="landingImageUrl" urlValue={fields.landingUrl} action={saveHeroLanding} submit={t("dash.saveHero")} cover />
      <article className="panel p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("dash.policiesTitle")}</h2>
          <Link href="/dashboard/settings/policies" className="text-sm font-semibold">{t("dash.editPolicies")}</Link>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {policyLinks.map(([slug, label]) => {
            const published = policies.find((policy) => policy.slug === slug);
            return (
              <li key={slug} className="rounded-xl border border-border bg-white px-3 py-3 text-sm">
                <p className="font-medium">{t(label)}</p>
                <p className="mt-1 text-xs text-muted">{published ? published.title : t("dash.notPublished")}</p>
              </li>
            );
          })}
        </ul>
      </article>
      {editable ? <form action={voidAction(publishWebsite)}><button className="rounded-xl border border-border px-4 py-2" type="submit">{t("dash.publish")}</button></form> : null}
      {editable && archived.length > 0 ? (
        <ul className="text-sm">
          {archived.map((version) => (
            <li key={version.id}>
              <form action={voidAction(rollbackWebsite)}>
                <input type="hidden" name="versionId" value={version.id} />
                <button type="submit">{t("dash.rollback", { version: version.version })}</button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ImageGroup({
  t,
  editable,
  title,
  hint,
  src,
  fileLabel,
  fileId,
  urlName,
  urlValue,
  action,
  submit,
  cover = false,
}: {
  t: Translate;
  editable: boolean;
  title: string;
  hint: string;
  src: string;
  fileLabel: string;
  fileId: string;
  urlName: string;
  urlValue: string;
  action: (formData: FormData) => Promise<unknown>;
  submit: string;
  cover?: boolean;
}) {
  return (
    <form action={editable ? voidAction(action) : undefined} className="grid gap-2 text-sm">
      <fieldset disabled={!editable} className="grid gap-2 disabled:opacity-80">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted">{hint}</p>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className={cover ? "h-32 w-full rounded-xl object-cover" : "h-8 max-w-[11rem] object-contain object-left"} />
        ) : null}
        <label htmlFor={fileId}>{fileLabel}</label>
        <input id={fileId} name="file" type="file" accept="image/jpeg,image/png,image/webp" />
        <label htmlFor={`${fileId}-url`}>{t("dash.pasteImage")}</label>
        <input id={`${fileId}-url`} name={urlName} defaultValue={urlValue} className={field} />
        <button className="rounded-xl border border-border px-4 py-2 disabled:opacity-50" type="submit" disabled={!editable}>{submit}</button>
      </fieldset>
    </form>
  );
}

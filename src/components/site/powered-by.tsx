import { translator } from "@/lib/i18n/server";

export async function PoweredBy() {
  const t = await translator();
  return (
    <p className="text-center text-xs text-muted">
      <a className="underline decoration-border underline-offset-4 hover:text-foreground" href="https://overdriveio.com">
        {t("footer.powered")}
      </a>
    </p>
  );
}

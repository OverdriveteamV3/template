import { notFound } from "next/navigation";
import { addNote } from "@/server/dashboard-actions";
import { translator } from "@/lib/i18n/server";
import { requireMember } from "@/server/guards";
import { createClient } from "@/lib/supabase/server";
import { csvCell } from "@/lib/email/escape";

export default async function Page({ params }: { params: Promise<{ submissionId: string }> }) {
  const t = await translator();
  const { submissionId } = await params;
  const { site } = await requireMember();
  const supabase = await createClient();
  const { data } = await supabase.from("submissions").select("id, kind, status, answers, created_at").eq("id", submissionId).eq("tenant_id", site.tenantId).maybeSingle();
  if (!data) notFound();
  const { data: notes } = await supabase.from("submission_notes").select("id, body, created_at").eq("submission_id", data.id);
  const csv = Object.entries(data.answers as Record<string, unknown>).map(([key, value]) => [csvCell(key), csvCell(value)].join(",")).join("\n");
  return (
    <section>
      <h1 className="text-3xl font-semibold">{data.kind}</h1>
      <pre className="mt-4 overflow-auto text-sm">{JSON.stringify(data.answers, null, 2)}</pre>
      <p className="mt-4 text-xs text-muted">{t("dash.exportPreview", { csv })}</p>
      <ul className="mt-4 text-sm">{(notes ?? []).map((note) => <li key={note.id}>{note.body}</li>)}</ul>
      <form action={addNote} className="mt-4 grid gap-2">
        <input type="hidden" name="submissionId" value={data.id} />
        <textarea name="body" required className="rounded-xl border border-border px-3 py-2" placeholder={t("dash.internalNote")} />
        <select name="status" className="rounded-xl border border-border px-3 py-2"><option value="read">{t("dash.read")}</option><option value="archived">{t("common.archived")}</option></select>
        <button className="btn-primary" type="submit">{t("dash.noteSaved")}</button>
      </form>
    </section>
  );
}

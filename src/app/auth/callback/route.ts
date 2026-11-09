import { NextResponse } from "next/server";
import { safeInternalPath } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeInternalPath(url.searchParams.get("next"));
  const supabase = await createClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/sign-in?error=callback", url.origin));
  }
  await supabase.rpc("accept_my_invitations");
  return NextResponse.redirect(new URL(next, url.origin));
}

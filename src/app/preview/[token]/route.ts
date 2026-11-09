import { NextResponse } from "next/server";
import { verifyPayload } from "@/lib/security/tokens";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const payload = verifyPayload<{ exp: number; host: string }>(token, "PREVIEW_TOKEN_SECRET");
  const host = request.headers.get("host") ?? "";
  if (!payload || payload.exp < Date.now() || payload.host !== host) {
    return NextResponse.json({ error: "Preview link is invalid." }, { status: 401 });
  }
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("od_preview", token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 15, path: "/" });
  return response;
}

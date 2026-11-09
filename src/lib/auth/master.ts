import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Viewer } from "@/server/site";

const COOKIE = "overdrive_master";
const USER = "admin";
const PASSWORD = "12345678";
const WEEK = 60 * 60 * 24 * 7;

function key() {
  return process.env.MASTER_SESSION_SECRET ?? "overdrive-preview-master";
}

function sign(exp: number) {
  const body = Buffer.from(JSON.stringify({ user: USER, exp })).toString("base64url");
  const sig = createHmac("sha256", key()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function readToken(token: string) {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", key()).update(body).digest();
  const actual = Buffer.from(sig, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { user?: string; exp?: number };
  if (payload.user !== USER || !payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

export function isMasterLogin(login: string, password: string) {
  const name = createHmac("sha256", key()).update(login.trim().toLowerCase()).digest();
  const expectedName = createHmac("sha256", key()).update(USER).digest();
  const secret = createHmac("sha256", key()).update(password).digest();
  const expectedSecret = createHmac("sha256", key()).update(PASSWORD).digest();
  return timingSafeEqual(name, expectedName) && timingSafeEqual(secret, expectedSecret);
}

export async function startMasterSession() {
  const jar = await cookies();
  jar.set(COOKIE, sign(Date.now() + WEEK * 1000), { httpOnly: true, sameSite: "lax", path: "/", maxAge: WEEK });
}

export async function clearMasterSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function masterViewer(): Promise<Viewer | null> {
  await connection();
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !readToken(token)) return null;
  return {
    id: "00000000-0000-4000-8000-000000000001",
    email: USER,
    emailConfirmed: true,
    role: "owner",
    isPlatformAdmin: true,
  };
}

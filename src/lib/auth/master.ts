import "server-only";

import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Viewer } from "@/server/site";

const hashPassword = promisify(scrypt);

const COOKIE = "overdrive_master";
const PROFILE = "overdrive_master_profile";
const USER = "admin";
const PASSWORD = "12345678";
const PASSWORD_PATH = "platform/master-password.txt";
const WEEK = 60 * 60 * 24 * 7;
export const MASTER_USER_ID = "00000000-0000-4000-8000-000000000001";

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

function sameSecret(left: string, right: string) {
  const actual = createHmac("sha256", key()).update(left).digest();
  const expected = createHmac("sha256", key()).update(right).digest();
  return timingSafeEqual(actual, expected);
}

async function storedPasswordHash() {
  const { data, error } = await createAdminClient().storage.from("private").download(PASSWORD_PATH);
  if (error || !data) return null;
  const value = (await data.text()).trim();
  return value.includes(".") ? value : null;
}

async function passwordMatches(password: string, stored: string | null) {
  if (!stored) return sameSecret(password, PASSWORD);
  const [salt, hash] = stored.split(".");
  if (!salt || !hash) return false;
  const actual = (await hashPassword(password, salt, 32)) as Buffer;
  const expected = Buffer.from(hash, "base64url");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function isMasterLogin(login: string, password: string) {
  if (!sameSecret(login.trim().toLowerCase(), USER)) return false;
  return passwordMatches(password, await storedPasswordHash());
}

export async function saveMasterPassword(current: string, next: string) {
  const stored = await storedPasswordHash();
  if (!(await passwordMatches(current, stored))) return false;
  const salt = randomBytes(16).toString("base64url");
  const hash = ((await hashPassword(next, salt, 32)) as Buffer).toString("base64url");
  const { error } = await createAdminClient().storage.from("private").upload(PASSWORD_PATH, `${salt}.${hash}`, {
    upsert: true,
    contentType: "text/plain",
  });
  return !error;
}

export async function startMasterSession() {
  const jar = await cookies();
  jar.set(COOKIE, sign(Date.now() + WEEK * 1000), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WEEK,
  });
}

export async function clearMasterSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function readMasterProfile() {
  const raw = (await cookies()).get(PROFILE)?.value;
  if (!raw) return { name: "", phone: "" };
  try {
    const parsed = JSON.parse(raw) as { name?: string; phone?: string };
    return { name: String(parsed.name ?? "").slice(0, 80), phone: String(parsed.phone ?? "").slice(0, 20) };
  } catch {
    return { name: "", phone: "" };
  }
}

export async function saveMasterProfile(name: string, phone: string) {
  const jar = await cookies();
  jar.set(PROFILE, JSON.stringify({ name, phone }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function masterViewer(): Promise<Viewer | null> {
  await connection();
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !readToken(token)) return null;
  return {
    id: MASTER_USER_ID,
    email: USER,
    emailConfirmed: true,
    role: "owner",
    isPlatformAdmin: true,
  };
}

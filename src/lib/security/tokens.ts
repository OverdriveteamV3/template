import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function secret(name: string) {
  const value = process.env[name];
  if (!value) return null;
  return value;
}

export function signPayload(payload: object, envName: string) {
  const key = secret(envName);
  if (!key) return null;
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPayload<T>(token: string, envName: string): T | null {
  const key = secret(envName);
  const [body, sig] = token.split(".");
  if (!key || !body || !sig) return null;
  const expected = createHmac("sha256", key).update(body).digest();
  const actual = Buffer.from(sig, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
}

export function encryptJson(value: object, envName: string) {
  const key = secret(envName);
  if (!key) return null;
  const hashed = createHash("sha256").update(key).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", hashed, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function decryptJson<T>(payload: string, envName: string): T | null {
  const key = secret(envName);
  if (!key) return null;
  const buffer = Buffer.from(payload, "base64url");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const data = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(key).digest(), iv);
  decipher.setAuthTag(tag);
  try {
    return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8")) as T;
  } catch {
    return null;
  }
}

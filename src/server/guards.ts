import "server-only";
import { notFound, redirect } from "next/navigation";
import { getRequestContext, type Viewer } from "@/server/site";
import type { PublicSite } from "@/lib/site/types";

export async function requireSite() {
  const context = await getRequestContext();
  if (context.kind !== "site") notFound();
  return context;
}

export async function requireMember() {
  const context = await requireSite();
  if (!context.viewer) redirect("/sign-in?next=/dashboard");
  if (!context.viewer.role) redirect("/account");
  return context as typeof context & { viewer: Viewer & { role: NonNullable<Viewer["role"]> }; site: PublicSite };
}

export async function requireCustomer() {
  const context = await requireSite();
  if (!context.viewer) redirect("/sign-in?next=/account");
  return context;
}

export async function requirePlatformAdmin() {
  const context = await getRequestContext();
  if (context.kind !== "platform") notFound();
  if (!context.viewer) redirect("/sign-in?next=/owner");
  if (!context.viewer.isPlatformAdmin) redirect("/");
  return context;
}

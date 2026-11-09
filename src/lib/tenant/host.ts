export type HostConfig = {
  rootDomain: string;
  platformHosts: string[];
  tenantLockSlug?: string | null;
  allowedHosts?: string[];
};

export type HostDecision =
  | { kind: "platform" }
  | { kind: "slug"; slug: string }
  | { kind: "custom"; hostname: string; lockedSlug?: string }
  | { kind: "unknown" };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function hostnameFromHost(host: string) {
  return host.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

export function resolveHost(host: string, config: HostConfig): HostDecision {
  const hostname = hostnameFromHost(host);
  if (!hostname) return { kind: "unknown" };

  const root = hostnameFromHost(config.rootDomain);
  const platform = new Set(config.platformHosts.map(hostnameFromHost));
  const allowed = new Set((config.allowedHosts ?? []).map(hostnameFromHost));
  const lock = config.tenantLockSlug?.trim().toLowerCase() || null;
  const slug = slugFromHost(hostname, root);

  if (lock) {
    if (slug === lock || allowed.has(hostname)) return { kind: "slug", slug: lock };
    if (slug || platform.has(hostname) || hostname === root || hostname.endsWith(".localhost")) {
      return { kind: "unknown" };
    }
    return { kind: "custom", hostname, lockedSlug: lock };
  }

  if (platform.has(hostname) || hostname === root) return { kind: "platform" };
  if (slug) return { kind: "slug", slug };
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return { kind: "unknown" };
  return { kind: "custom", hostname };
}

function slugFromHost(hostname: string, root: string) {
  const suffix = `.${root}`;
  if (!hostname.endsWith(suffix) || hostname === root) return null;
  const label = hostname.slice(0, -suffix.length);
  if (label.includes(".")) return null;
  return SLUG.test(label) ? label : null;
}

export function hostConfigFromEnv(env: NodeJS.ProcessEnv = process.env): HostConfig {
  const rootDomain = env.ROOT_DOMAIN || "localhost";
  const platformHosts = (env.PLATFORM_HOSTS || "localhost,127.0.0.1")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    rootDomain,
    platformHosts,
    tenantLockSlug: env.TENANT_LOCK_SLUG || null,
    allowedHosts: (env.ALLOWED_HOSTS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

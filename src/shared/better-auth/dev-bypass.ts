const enabledValues = new Set(["1", "true", "yes", "on"]);
const devBypassHostnames = new Set(["dev.dashboard.nailmoment.pl"]);

type BetterAuthDevBypassInput = {
  env?: NodeJS.ProcessEnv;
  hostname?: string | null | undefined;
};

function isEnabled(value: string | undefined) {
  return value ? enabledValues.has(value.trim().toLowerCase()) : false;
}

function readVercelEnv(env: NodeJS.ProcessEnv) {
  return env.NEXT_PUBLIC_VERCEL_ENV ?? env.VERCEL_ENV;
}

function normalizeHostname(hostname: string | null | undefined) {
  return hostname?.split(":")[0]?.trim().toLowerCase();
}

function isDevBypassHostname(hostname: string | null | undefined) {
  const normalized = normalizeHostname(hostname);

  return normalized ? devBypassHostnames.has(normalized) : false;
}

function readBrowserHostname() {
  return typeof window === "undefined" ? undefined : window.location.hostname;
}

export function isBetterAuthDisabledForDev({
  env = process.env,
  hostname,
}: BetterAuthDevBypassInput = {}) {
  const vercelEnv = readVercelEnv(env);

  if (isDevBypassHostname(hostname)) {
    return true;
  }

  if (vercelEnv === "production") {
    return false;
  }

  if (env.NODE_ENV === "development") {
    return true;
  }

  if (
    isEnabled(env.NEXT_PUBLIC_DISABLE_BETTER_AUTH_UI) ||
    isEnabled(env.NEXT_PUBLIC_DISABLE_AUTH)
  ) {
    return true;
  }

  return vercelEnv === "preview";
}

export function isBetterAuthUiDisabledForDev(env = process.env) {
  return isBetterAuthDisabledForDev({
    env,
    hostname: readBrowserHostname(),
  });
}

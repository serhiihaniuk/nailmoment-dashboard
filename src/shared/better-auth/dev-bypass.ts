const enabledValues = new Set(["1", "true", "yes", "on"]);

function isEnabled(value: string | undefined) {
  return value ? enabledValues.has(value.trim().toLowerCase()) : false;
}

function readVercelEnv(env: NodeJS.ProcessEnv) {
  return env.NEXT_PUBLIC_VERCEL_ENV ?? env.VERCEL_ENV;
}

export function isBetterAuthDisabledForDev(env = process.env) {
  const vercelEnv = readVercelEnv(env);

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

export const isBetterAuthUiDisabledForDev = isBetterAuthDisabledForDev;

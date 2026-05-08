const enabledValues = new Set(["1", "true", "yes", "on"]);

function isEnabled(value: string | undefined) {
  return value ? enabledValues.has(value.trim().toLowerCase()) : false;
}

function readVercelEnv(env: NodeJS.ProcessEnv) {
  return env.NEXT_PUBLIC_VERCEL_ENV ?? env.VERCEL_ENV;
}

function readVercelBranch(env: NodeJS.ProcessEnv) {
  return env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ?? env.VERCEL_GIT_COMMIT_REF;
}

export function isBetterAuthUiDisabledForDev(env = process.env) {
  if (readVercelEnv(env) === "production") {
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

  return readVercelEnv(env) === "preview" && readVercelBranch(env) === "develop";
}

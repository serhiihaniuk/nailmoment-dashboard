/**
 * Temporary develop/v0 editing switch.
 *
 * Serhii explicitly asked to fully disable dashboard auth on this branch so v0
 * can render protected pages and call protected APIs while editing. Do not merge
 * this behavior to main.
 */
export function isBetterAuthDisabledForDev() {
  return true;
}

export const isBetterAuthUiDisabledForDev = isBetterAuthDisabledForDev;

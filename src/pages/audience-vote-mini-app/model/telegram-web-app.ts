interface TelegramWebApp {
  expand?: () => void;
  initData?: string;
  isFullscreen?: boolean;
  isVersionAtLeast?: (version: string) => boolean;
  ready?: () => void;
  requestFullscreen?: () => void;
  setHeaderColor?: (color: string) => void;
}

interface TelegramWindow {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}

export function getTelegramWebApp(): TelegramWebApp | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (window as Window & TelegramWindow).Telegram?.WebApp;
}

export function prepareTelegramMiniAppViewport({
  fullscreen = false,
}: {
  fullscreen?: boolean;
} = {}): void {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    return;
  }

  safeTelegramCall(() => webApp.ready?.());
  safeTelegramCall(() => webApp.expand?.());
  safeTelegramCall(() => webApp.setHeaderColor?.("#171717"));

  const supportsFullscreen =
    typeof webApp.requestFullscreen === "function" &&
    (webApp.isVersionAtLeast?.("8.0") ?? true);

  if (fullscreen && supportsFullscreen && !webApp.isFullscreen) {
    safeTelegramCall(() => webApp.requestFullscreen?.());
  }
}

export function readTelegramInitData(): string | undefined {
  const initData = getTelegramWebApp()?.initData?.trim();

  return initData && initData.length > 0 ? initData : undefined;
}

function safeTelegramCall(action: () => void): void {
  try {
    action();
  } catch {
    return;
  }
}

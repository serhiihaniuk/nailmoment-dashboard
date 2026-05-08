interface TelegramWebApp {
  expand?: () => void;
  initData?: string;
  ready?: () => void;
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

export function readTelegramInitData(): string | undefined {
  const initData = getTelegramWebApp()?.initData?.trim();

  return initData && initData.length > 0 ? initData : undefined;
}

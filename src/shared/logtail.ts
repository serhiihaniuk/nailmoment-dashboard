import { Logtail } from "@logtail/node";

type Logger = {
  info: (message: string, context?: Record<string, unknown>) => Promise<unknown>;
  warn: (message: string, context?: Record<string, unknown>) => Promise<unknown>;
  error: (message: string, context?: Record<string, unknown>) => Promise<unknown>;
  flush: () => Promise<unknown>;
};

function normalizeLogtailEndpoint(endpoint: string | undefined) {
  if (!endpoint) {
    return undefined;
  }

  const trimmed = endpoint.trim();

  if (!trimmed) {
    return undefined;
  }

  const candidate = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(candidate).toString();
  } catch {
    return undefined;
  }
}

function createNoopLogger(): Logger {
  const noop = async () => {};

  return {
    info: noop,
    warn: noop,
    error: noop,
    flush: noop,
  };
}

function createLogger(): Logger {
  const token = process.env.LOGTAIL_TOKEN?.trim();
  const endpoint = normalizeLogtailEndpoint(process.env.LOGTAIL_URL);

  if (!token || !endpoint) {
    return createNoopLogger();
  }

  const client = new Logtail(token, {
    endpoint,
    throwExceptions: false,
  });

  return {
    info: (message, context) => client.info(message, context),
    warn: (message, context) => client.warn(message, context),
    error: (message, context) => client.error(message, context),
    flush: () => client.flush(),
  };
}

export const logtail = createLogger();

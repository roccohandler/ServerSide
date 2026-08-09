export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'silent'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

/** Structured context. Never put raw personal data or secrets in here — see `redactEmail`. */
export type LogContext = Record<string, unknown>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  /** Returns a logger that merges `bindings` into every record it writes. */
  child(bindings: LogContext): Logger;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

interface LoggerOptions {
  readonly level?: LogLevel;
  /** `pretty` is easier to scan locally; `json` is what log aggregators want. */
  readonly format?: 'json' | 'pretty';
  readonly bindings?: LogContext;
  readonly write?: (line: string, level: LogLevel) => void;
}

function defaultWrite(line: string, level: LogLevel): void {
  if (level === 'error' || level === 'warn') {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
}

/**
 * Serialises anything that might be thrown into a loggable shape.
 * Kept here so no call site is tempted to `JSON.stringify` an Error (which yields `{}`).
 */
export function describeError(error: unknown): LogContext {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
      ...(error.cause ? { cause: describeError(error.cause) } : {}),
    };
  }
  return { errorName: 'UnknownError', errorMessage: String(error) };
}

/**
 * Email addresses are personal data, so logs only ever get the domain plus a short,
 * non-reversible marker that is still enough to correlate two records by hand.
 */
export function redactEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local.slice(0, 1)}***@${domain}`;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const level = options.level ?? 'info';
  const format = options.format ?? 'json';
  const write = options.write ?? defaultWrite;
  const bindings = options.bindings ?? {};
  const threshold = LEVEL_WEIGHT[level];

  function log(recordLevel: Exclude<LogLevel, 'silent'>, message: string, context?: LogContext) {
    if (LEVEL_WEIGHT[recordLevel] < threshold) return;

    const record = {
      level: recordLevel,
      time: new Date().toISOString(),
      message,
      ...bindings,
      ...context,
    };

    if (format === 'pretty') {
      const extra = { ...bindings, ...context };
      const suffix = Object.keys(extra).length > 0 ? ` ${JSON.stringify(extra)}` : '';
      write(`${recordLevel.toUpperCase().padEnd(5)} ${message}${suffix}`, recordLevel);
      return;
    }

    write(JSON.stringify(record), recordLevel);
  }

  return {
    debug: (message, context) => log('debug', message, context),
    info: (message, context) => log('info', message, context),
    warn: (message, context) => log('warn', message, context),
    error: (message, context) => log('error', message, context),
    child: (extra) => createLogger({ ...options, bindings: { ...bindings, ...extra } }),
  };
}

/** Used by tests and by code paths that must not emit anything. */
export const silentLogger: Logger = createLogger({ level: 'silent' });

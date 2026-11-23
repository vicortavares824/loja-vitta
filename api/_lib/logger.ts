export type LogLevel = 'info' | 'warn' | 'error';

export interface Logger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
  child(fields: Record<string, unknown>): Logger;
}

export const REDACTED = '[REDACTED]';

/** Fragmentos de nome de chave (minúsculos) cujo valor é sempre redigido. */
export const SENSITIVE_KEY_FRAGMENTS: readonly string[] = [
  'authorization',
  'token',
  'access_token',
  'service_role',
  'secret',
  'card',
  'cvv',
  'number',
  'x-signature',
];

/** Variáveis de ambiente cujo valor literal é removido de qualquer log. */
export const SECRET_ENV_NAMES: readonly string[] = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'MERCADOPAGO_ACCESS_TOKEN',
  'MERCADOPAGO_WEBHOOK_SECRET',
  'CRON_SECRET',
];

const MIN_SECRET_LENGTH = 4;
const MAX_DEPTH = 8;

export interface LoggerOptions {
  /** Valores literais a remover. Padrão: valores atuais de SECRET_ENV_NAMES em process.env. */
  secrets?: () => readonly string[];
  /** Destino da linha JSON. Padrão: console. */
  sink?: (level: LogLevel, line: string) => void;
  base?: Record<string, unknown>;
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function envSecrets(): string[] {
  return SECRET_ENV_NAMES.map((name) => process.env[name]).filter(
    (v): v is string => typeof v === 'string' && v.length >= MIN_SECRET_LENGTH,
  );
}

function replaceSecrets(text: string, secrets: readonly string[]): string {
  let out = text;
  for (const secret of secrets) {
    if (secret.length < MIN_SECRET_LENGTH) continue;
    out = out.split(secret).join(REDACTED);
    // Forma escapada para JSON (aspas, barras, quebras de linha).
    const escaped = JSON.stringify(secret).slice(1, -1);
    if (escaped !== secret) out = out.split(escaped).join(REDACTED);
  }
  return out;
}

function sanitize(
  value: unknown,
  secrets: readonly string[],
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (typeof value === 'string') return replaceSecrets(value, secrets);
  if (value === null || typeof value !== 'object') {
    return typeof value === 'bigint' ? value.toString() : value;
  }
  if (depth >= MAX_DEPTH) return '[MAX_DEPTH]';
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);

  if (value instanceof Error) {
    const out: Record<string, unknown> = {
      name: value.name,
      message: replaceSecrets(value.message, secrets),
    };
    if (value.stack) out.stack = replaceSecrets(value.stack, secrets);
    const extra = value as Error & { code?: unknown; internal?: unknown };
    if (extra.code !== undefined) out.code = sanitize(extra.code, secrets, depth + 1, seen);
    if (extra.internal !== undefined) {
      out.internal = sanitize(extra.internal, secrets, depth + 1, seen);
    }
    return out;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, secrets, depth + 1, seen));
  }
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = isSensitiveKey(key) ? REDACTED : sanitize(item, secrets, depth + 1, seen);
  }
  return out;
}

/** Aplica redação por nome de chave e por valor. Exportada para uso em testes. */
export function redact(value: unknown, secrets: readonly string[] = envSecrets()): unknown {
  return sanitize(value, secrets, 0, new WeakSet());
}

function defaultSink(level: LogLevel, line: string): void {
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const getSecrets = options.secrets ?? envSecrets;
  const sink = options.sink ?? defaultSink;
  const base = options.base ?? {};

  const write = (level: LogLevel, message: string, fields?: Record<string, unknown>): void => {
    const secrets = getSecrets();
    const entry = redact({ ...base, ...fields }, secrets) as Record<string, unknown>;
    const record = {
      level,
      time: new Date().toISOString(),
      message: replaceSecrets(message, secrets),
      ...entry,
    };
    let line: string;
    try {
      line = JSON.stringify(record);
    } catch {
      line = JSON.stringify({ level, time: record.time, message: record.message });
    }
    // Última barreira: remove qualquer valor secreto que tenha escapado.
    sink(level, replaceSecrets(line, secrets));
  };

  return {
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
    child: (fields) => createLogger({ ...options, base: { ...base, ...fields } }),
  };
}

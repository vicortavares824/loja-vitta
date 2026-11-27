import { AppError } from './errors.js';

/** Limites do MVP (design: "Rate limiting simples"). */
export const RATE_LIMITS = {
  checkoutPerUser: { max: 10, windowMs: 60_000 },
  quotePerUser: { max: 30, windowMs: 60_000 },
  cancelPerUser: { max: 5, windowMs: 60_000 },
  perIp: { max: 60, windowMs: 60_000 },
} as const;

export interface RateLimitResult {
  allowed: boolean;
  /** Segundos até a próxima requisição ser aceita (0 quando permitido). */
  retryAfterSeconds: number;
}

/** Janela deslizante em memória: por instância, some em cold start. */
const hits = new Map<string, number[]>();
const CLEANUP_EVERY = 100;
const MAX_WINDOW_MS = 3_600_000;
let calls = 0;

function cleanup(now: number): void {
  for (const [key, stamps] of hits) {
    const last = stamps[stamps.length - 1];
    if (last === undefined || now - last > MAX_WINDOW_MS) hits.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  calls += 1;
  if (calls % CLEANUP_EVERY === 0) cleanup(now);

  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    const oldest = recent[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }
  recent.push(now);
  hits.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}

/** RATE_LIMITED que carrega o valor do cabeçalho Retry-After. */
export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, scope: string) {
    super('RATE_LIMITED', { internal: { scope, retryAfterSeconds } });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Lança RATE_LIMITED (429) com Retry-After quando o limite é excedido. */
export function enforceRateLimit(
  key: string,
  limit: { max: number; windowMs: number },
  now?: number,
): void {
  const result = checkRateLimit(key, limit.max, limit.windowMs, now);
  if (!result.allowed) {
    throw new RateLimitError(result.retryAfterSeconds, key.split(':')[0] ?? 'unknown');
  }
}

/** Primeiro valor de x-forwarded-for; 'unknown' quando ausente. */
export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const raw = headers['x-forwarded-for'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const first = value?.split(',')[0]?.trim();
  return first && first.length > 0 ? first : 'unknown';
}

/** Somente para testes. */
export function resetRateLimits(): void {
  hits.clear();
  calls = 0;
}

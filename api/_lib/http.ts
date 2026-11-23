import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AppError, isAppError, toErrorResponse } from './errors.js';
import { loadEnv, type ServerEnv } from './env.js';
import { createLogger, type Logger } from './logger.js';
import { enforceRateLimit, getClientIp, RateLimitError } from './rateLimit.js';

export type HttpMethod = 'GET' | 'POST';

export interface RouteOptions {
  methods: ReadonlyArray<HttpMethod>;
  /**
   * 'ip': aplicado por route() antes do handler.
   * 'user': aplicado pelo handler após autenticar, via ctx.enforceUserRateLimit(userId).
   */
  rateLimit?: { key: 'user' | 'ip'; max: number; windowMs: number };
  /** Limite por IP aplicado antes da autenticação (padrão do design: 60/min). */
  ipRateLimit?: { max: number; windowMs: number };
  /** Rotas chamadas por servidor (webhook, cron) não emitem CORS. */
  cors?: boolean;
  /** Passado a loadEnv (rota de cron). */
  requireCron?: boolean;
  handler: (ctx: RouteContext) => Promise<RouteResult>;
}

export interface RouteContext {
  req: VercelRequest;
  env: ServerEnv;
  requestId: string;
  log: Logger;
  /** Aplica o limite por usuário configurado em `rateLimit` (key 'user'). */
  enforceUserRateLimit: (userId: string) => void;
}

export interface RouteResult {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

const ALLOWED_HEADERS = 'Authorization, Content-Type, Idempotency-Key';

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function applyCors(
  res: VercelResponse,
  origin: string | undefined,
  siteUrl: string | undefined,
  methods: ReadonlyArray<HttpMethod>,
): void {
  res.setHeader('Vary', 'Origin');
  if (origin && siteUrl && origin === siteUrl) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', [...methods, 'OPTIONS'].join(', '));
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    res.setHeader('Access-Control-Max-Age', '600');
  }
}

export function route(
  opts: RouteOptions,
): (req: VercelRequest, res: VercelResponse) => Promise<void> {
  return async (req, res) => {
    const requestId = randomUUID();
    const log = createLogger({ base: { requestId } });
    const withCors = opts.cors !== false;
    res.setHeader('X-Request-Id', requestId);

    try {
      // SITE_URL é lido sem validar o ambiente completo para que OPTIONS e 405 não dependam dele.
      const siteUrl = process.env.SITE_URL || undefined;
      const origin = firstHeader(req.headers.origin);
      if (withCors) applyCors(res, origin, siteUrl, opts.methods);

      const method = (req.method ?? 'GET').toUpperCase();

      if (method === 'OPTIONS') {
        res.status(204).end();
        return;
      }

      if (!(opts.methods as ReadonlyArray<string>).includes(method)) {
        res.setHeader('Allow', [...opts.methods, 'OPTIONS'].join(', '));
        const { status, body } = toErrorResponse(new AppError('METHOD_NOT_ALLOWED'));
        res.status(status).json(body);
        return;
      }

      const ip = getClientIp(req.headers);
      if (opts.rateLimit?.key === 'ip') {
        enforceRateLimit(`ip:${ip}`, opts.rateLimit);
      } else if (opts.ipRateLimit) {
        enforceRateLimit(`ip:${ip}`, opts.ipRateLimit);
      }

      const env = loadEnv({ requireCron: opts.requireCron });
      const userLimit = opts.rateLimit?.key === 'user' ? opts.rateLimit : undefined;
      const routeName = req.url?.split('?')[0] ?? 'route';

      const result = await opts.handler({
        req,
        env,
        requestId,
        log: log.child({ route: routeName }),
        enforceUserRateLimit: (userId) => {
          if (userLimit) enforceRateLimit(`user:${routeName}:${userId}`, userLimit);
        },
      });

      for (const [name, value] of Object.entries(result.headers ?? {})) {
        res.setHeader(name, value);
      }
      res.status(result.status).json(result.body);
    } catch (err) {
      if (err instanceof RateLimitError) {
        res.setHeader('Retry-After', String(err.retryAfterSeconds));
      }
      if (isAppError(err)) {
        if (err.internal !== undefined) log.warn('Erro de aplicação', { code: err.code, internal: err.internal });
      } else {
        log.error('Erro inesperado', { error: err });
      }
      const { status, body } = toErrorResponse(err);
      res.status(status).json(body);
    }
  };
}

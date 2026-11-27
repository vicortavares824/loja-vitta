import { z } from 'zod';
import { AppError } from './errors.js';
import { createLogger } from './logger.js';

const nonEmpty = z.string().min(1);

const baseSchema = z.object({
  SUPABASE_URL: nonEmpty,
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty,
  MERCADOPAGO_ACCESS_TOKEN: nonEmpty,
  MERCADOPAGO_WEBHOOK_SECRET: nonEmpty,
  SITE_URL: nonEmpty,
  PIX_EXPIRATION_MINUTES: z.coerce.number().int().min(1).max(1440).default(30),
  // Melhor Envio (opcional). Sem token, o checkout usa o frete fixo de config/shipping.ts.
  // Com token, CEP de origem e User-Agent são exigidos em shipping/shippingService.ts.
  MELHORENVIO_TOKEN: nonEmpty.optional(),
  MELHORENVIO_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  /** CEP de onde a loja posta (pontuação é removida). */
  MELHORENVIO_FROM_CEP: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().length(8))
    .optional(),
  /** Exigido pela API: "Nome da aplicação (email de contato técnico)". */
  MELHORENVIO_USER_AGENT: nonEmpty.optional(),
});

const cronSchema = baseSchema.extend({ CRON_SECRET: nonEmpty });

export type ServerEnv = z.infer<typeof baseSchema> & { CRON_SECRET?: string };

export interface LoadEnvOptions {
  /** Exige CRON_SECRET (somente a rota de cron). */
  requireCron?: boolean;
  /** Fonte das variáveis. Padrão: process.env (injetável nos testes). */
  source?: Record<string, string | undefined>;
}

/**
 * Lê e valida as variáveis a cada chamada (lazy, sem cache).
 * Variável ausente ou inválida lança SERVER_MISCONFIGURED. Os nomes vão só para o log.
 */
export function loadEnv(options: LoadEnvOptions = {}): ServerEnv {
  const source = options.source ?? process.env;
  const raw: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(source)) {
    // Variável vazia conta como ausente (PIX_EXPIRATION_MINUTES cai no padrão).
    raw[key] = value === '' ? undefined : value;
  }

  const schema = options.requireCron ? cronSchema : baseSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    createLogger().error('Variáveis de ambiente ausentes ou inválidas', { missing: names });
    throw new AppError('SERVER_MISCONFIGURED', { internal: { missing: names } });
  }
  return parsed.data;
}

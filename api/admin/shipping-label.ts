import { z } from 'zod';
import { requireAdmin } from '../_lib/auth.js';
import { route } from '../_lib/http.js';
import { RATE_LIMITS } from '../_lib/rateLimit.js';
import { parseBody } from '../_lib/schemas.js';
import { createLabelDeps, generateLabel, refreshTracking } from '../_lib/shipping/labelService.js';
import { createAdminClient } from '../_lib/supabase.js';

const bodySchema = z
  .object({
    orderId: z.string().uuid(),
    action: z.enum(['generate', 'refresh']),
  })
  .strip();

/**
 * POST /api/admin/shipping-label (somente admin).
 * generate: compra a etiqueta no Melhor Envio com o saldo da conta, gera, devolve o PDF e o rastreio.
 * refresh: consulta o rastreio e marca o pedido como enviado/entregue quando for o caso.
 */
export default route({
  methods: ['POST'],
  rateLimit: { key: 'user', ...RATE_LIMITS.labelPerUser },
  ipRateLimit: RATE_LIMITS.perIp,
  handler: async ({ req, env, log, enforceUserRateLimit }) => {
    const supabase = createAdminClient(env);
    const admin = await requireAdmin(supabase, req.headers.authorization);
    enforceUserRateLimit(admin.id);

    const { orderId, action } = parseBody(bodySchema, req.body);
    const deps = createLabelDeps(env, supabase, log);

    if (action === 'generate') {
      const result = await generateLabel(deps, orderId);
      log.info('admin.label_generated', { orderId, adminId: admin.id });
      return { status: 200, body: result };
    }
    const result = await refreshTracking(deps, orderId);
    return { status: 200, body: result };
  },
});

-- =====================================================================
-- REVERSÃO de supabase/migrations/20261122000000_secure_checkout.sql
-- =====================================================================
-- Este arquivo fica fora de supabase/migrations/ de propósito: a CLI do
-- Supabase não o aplica sozinha. Execute manualmente, só quando decidido.
--
-- ATENÇÃO: LEIA ANTES DE EXECUTAR
-- 1. EXPORTE OS DADOS das colunas novas antes de rodar. O passo 6 apaga
--    definitivamente: subtotalAmount, discountAmount, shippingAmount,
--    idempotency_key, request_hash, payment_id, expires_at, paid_at,
--    cancel_reason, needs_review. Exemplo:
--      COPY (SELECT id, "subtotalAmount", "discountAmount", "shippingAmount",
--                   idempotency_key, request_hash, payment_id, expires_at,
--                   paid_at, cancel_reason, needs_review
--              FROM public.orders) TO STDOUT WITH CSV HEADER;
-- 2. LIBERE OS PEDIDOS 'pending_payment' ANTES de reverter. Eles mantêm
--    estoque reservado, e depois da reversão release_order_stock não existe
--    mais para devolvê-lo. Antes de rodar, conferir:
--      SELECT id, user_id, expires_at FROM public.orders WHERE status = 'pending_payment';
--    Para cada um, executar (enquanto as RPCs ainda existem):
--      SELECT public.release_order_stock('<order_id>', 'rollback');
--    ou aguardar o pagamento/expiração. Depois, a consulta acima deve vir vazia.
--    Pedidos 'pending_payment' que sobrarem ficarão com status que o fluxo
--    antigo não conhece.
-- 3. Os privilégios restaurados no passo 3 são os padrões do Supabase
--    (anon/authenticated com INSERT, UPDATE, DELETE). Se o banco de produção
--    tinha outros GRANTs, compare com o levantamento feito antes da migração.
-- 4. As políticas de INSERT restauradas reabrem a brecha que a migração
--    fechou (cliente cria pedido/itens direto pela API com preço arbitrário).
--    Use somente como reversão de emergência.
-- =====================================================================

BEGIN;

-- 1. RPCs: remover (grants vão junto com as funções)
DROP FUNCTION IF EXISTS public.attach_order_payment(uuid, text);
DROP FUNCTION IF EXISTS public.confirm_order_payment(uuid, text, numeric);
DROP FUNCTION IF EXISTS public.release_order_stock(uuid, text);
DROP FUNCTION IF EXISTS public.create_order_reserving_stock(uuid, text, text, text, text, text, text, text,
                                                            numeric, numeric, numeric, numeric, timestamptz, jsonb);

-- 2. Trigger e função de guarda
DROP TRIGGER IF EXISTS orders_guard_update ON public.orders;
DROP FUNCTION IF EXISTS public.orders_guard_update();

-- 3. Privilégios e políticas de INSERT (texto original das migrações anteriores)
GRANT INSERT, UPDATE, DELETE ON public.orders      TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.order_items TO anon, authenticated;

-- orders: 20260815231300_schema.sql (não alterada por 20260829000000_security_fixes.sql)
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- order_items: versão final de 20260829000000_security_fixes.sql
DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
CREATE POLICY "Users can insert order items" ON public.order_items FOR INSERT
WITH CHECK (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    OR auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Constraint de status (a tabela original não tinha CHECK em status)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 5. Índices
DROP INDEX IF EXISTS public.orders_pending_expiry_idx;
DROP INDEX IF EXISTS public.orders_payment_id_uq;
DROP INDEX IF EXISTS public.orders_user_idem_uq;

-- 6. Colunas (DESTRUTIVO: confirme a exportação do aviso 1)
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS needs_review,
  DROP COLUMN IF EXISTS cancel_reason,
  DROP COLUMN IF EXISTS paid_at,
  DROP COLUMN IF EXISTS expires_at,
  DROP COLUMN IF EXISTS payment_id,
  DROP COLUMN IF EXISTS request_hash,
  DROP COLUMN IF EXISTS idempotency_key,
  DROP COLUMN IF EXISTS "shippingAmount",
  DROP COLUMN IF EXISTS "discountAmount",
  DROP COLUMN IF EXISTS "subtotalAmount";

COMMIT;

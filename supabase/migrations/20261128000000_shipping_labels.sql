-- =====================================================================
-- Etiquetas do Melhor Envio geradas pelo admin + rastreio automático
-- =====================================================================
-- shipping_address_parts: cópia do endereço salvo usado no checkout, com os campos
--   separados que a etiqueta exige. NULL quando o cliente digitou um endereço livre.
-- me_order_id: id do envio no Melhor Envio (gravado logo após inserir no carrinho,
--   para uma nova tentativa não criar um segundo envio).
-- Colunas anuláveis: pedidos antigos ficam com NULL. Escritas só pela service role.
-- Reversão: supabase/rollback/20261128000000_shipping_labels.down.sql
-- =====================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_address_parts JSONB,
  ADD COLUMN IF NOT EXISTS me_order_id            TEXT,
  ADD COLUMN IF NOT EXISTS label_url              TEXT,
  ADD COLUMN IF NOT EXISTS label_generated_at     TIMESTAMPTZ,
  -- Trava da geração: só uma requisição compra a etiqueta; o cancelamento do cliente
  -- recusa pedido travado ou com envio no Melhor Envio (e vice-versa).
  ADD COLUMN IF NOT EXISTS label_claimed_at       TIMESTAMPTZ;

-- Sincronização diária do rastreio: só pedidos com etiqueta ainda em andamento.
CREATE INDEX IF NOT EXISTS orders_label_sync_idx
  ON public.orders (label_generated_at)
  WHERE me_order_id IS NOT NULL AND status IN ('processing', 'shipped');

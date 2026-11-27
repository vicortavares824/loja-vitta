-- =====================================================================
-- Frete pelo Melhor Envio: serviço escolhido e código de rastreio no pedido
-- =====================================================================
-- Aplicar ANTES do deploy do código que grava estas colunas (api/_lib/orders/orderService.ts).
-- Colunas anuláveis: pedidos antigos ficam com NULL.
-- Reversão: supabase/rollback/20261126000000_shipping_melhor_envio.down.sql
-- =====================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_cep          TEXT,
  ADD COLUMN IF NOT EXISTS shipping_service_id   INTEGER,
  ADD COLUMN IF NOT EXISTS shipping_service_name TEXT,
  ADD COLUMN IF NOT EXISTS tracking_code         TEXT;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_shipping_cep_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_shipping_cep_check
  CHECK (shipping_cep IS NULL OR shipping_cep ~ '^[0-9]{8}$');

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_tracking_code_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_tracking_code_check
  CHECK (tracking_code IS NULL OR char_length(tracking_code) BETWEEN 1 AND 60);

-- RPC: o admin informa o código de rastreio (o trigger orders_guard_update bloqueia
-- UPDATE direto de colunas além de status para quem não é service role).
CREATE OR REPLACE FUNCTION public.set_order_tracking(p_order_id uuid, p_tracking_code text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Só profiles.role: user_metadata é editável pelo próprio usuário (auth.updateUser).
  -- NOT EXISTS nunca é NULL, então usuário sem perfil admin sempre cai aqui.
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  UPDATE orders
     SET tracking_code = NULLIF(btrim(p_tracking_code), '')
   WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.set_order_tracking(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_order_tracking(uuid, text) TO authenticated;

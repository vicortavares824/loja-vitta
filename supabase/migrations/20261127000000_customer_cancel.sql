-- =====================================================================
-- Cancelamento pelo cliente de pedido já pago (antes do envio)
-- =====================================================================
-- Pedido aguardando pagamento continua usando release_order_stock.
-- Esta RPC cobre o pedido pago ('processing'): devolve o estoque e cancela.
-- O estorno no Mercado Pago é feito pela API antes de chamar esta função
-- (api/orders/cancel.ts). Só a service role executa.
-- Reversão: supabase/rollback/20261127000000_customer_cancel.down.sql
-- =====================================================================

-- 1. Trava de cancelamento: a API marca o pedido ANTES de estornar. Enquanto marcado,
--    ninguém além da service role muda o status (o admin não consegue marcar como enviado).
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.orders_guard_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF to_jsonb(NEW) - 'status' IS DISTINCT FROM to_jsonb(OLD) - 'status' THEN
    RAISE EXCEPTION 'ORDER_FIELDS_LOCKED';
  END IF;
  IF OLD.cancel_requested_at IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'ORDER_CANCELLATION_IN_PROGRESS';
  END IF;
  IF NOT ((OLD.status = 'processing' AND NEW.status = 'shipped')
       OR (OLD.status = 'shipped'    AND NEW.status = 'delivered')
       OR  OLD.status = NEW.status) THEN
    RAISE EXCEPTION 'ORDER_STATUS_TRANSITION_NOT_ALLOWED';
  END IF;
  RETURN NEW;
END $$;

-- 2. Cancela o pedido pago (depois do estorno): devolve o estoque e fecha o pedido.
CREATE OR REPLACE FUNCTION public.cancel_paid_order(p_order_id uuid, p_reason text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM orders WHERE id = p_order_id FOR UPDATE;
  -- Já enviado, entregue ou cancelado: não mexe (idempotente).
  IF v_status IS DISTINCT FROM 'processing' THEN RETURN false; END IF;

  UPDATE products p SET "stockCount" = COALESCE(p."stockCount", 0) + t.qty, "inStock" = true
    FROM (SELECT product_id, sum(quantity) AS qty FROM order_items WHERE order_id = p_order_id GROUP BY 1) t
   WHERE p.id = t.product_id;

  UPDATE orders SET status = 'cancelled', cancel_reason = p_reason WHERE id = p_order_id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.cancel_paid_order(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_paid_order(uuid, text) TO service_role;

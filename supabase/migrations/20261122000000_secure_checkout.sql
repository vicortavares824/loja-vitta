-- =====================================================================
-- Checkout seguro: colunas, RLS, trigger de proteção e RPCs transacionais
-- =====================================================================
-- ATENÇÃO ANTES DE APLICAR EM PRODUÇÃO
-- Esta migração foi escrita a partir dos arquivos em supabase/migrations/
-- (20260815231300_schema.sql e 20260829000000_security_fixes.sql), sem acesso
-- ao banco real. Os nomes de políticas e os privilégios (GRANT) do banco de
-- produção PODEM ter divergido (ajustes feitos pelo SQL Editor/Dashboard).
-- Conferir antes de aplicar:
--   SELECT tablename, policyname, cmd, roles, qual, with_check
--     FROM pg_policies
--    WHERE schemaname = 'public' AND tablename IN ('orders','order_items');
--   SELECT grantee, table_name, privilege_type
--     FROM information_schema.role_table_grants
--    WHERE table_schema = 'public' AND table_name IN ('orders','order_items')
--      AND grantee IN ('anon','authenticated');
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conrelid = 'public.orders'::regclass;
-- Nomes conhecidos pelas migrações:
--   orders:      "Users can create their own orders" (INSERT),
--                "Users can view their own orders or Admins view all" (SELECT),
--                "Admins can update orders" (UPDATE)
--   order_items: "Users can insert order items" (INSERT),
--                "Users can view their own order items" (SELECT)
-- Além do DROP POLICY por nome, o bloco DO da seção 2 remove dinamicamente
-- qualquer outra política de INSERT que exista em orders/order_items.
-- Reversão: supabase/rollback/20261122000000_secure_checkout.down.sql
-- =====================================================================

-- 1. Colunas novas em orders (anuláveis ou com default, para não quebrar pedidos antigos)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "subtotalAmount" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "shippingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idempotency_key  TEXT,
  ADD COLUMN IF NOT EXISTS request_hash     TEXT,
  ADD COLUMN IF NOT EXISTS payment_id       TEXT,
  ADD COLUMN IF NOT EXISTS expires_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason    TEXT,
  ADD COLUMN IF NOT EXISTS needs_review     BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS orders_user_idem_uq
  ON public.orders (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_id_uq
  ON public.orders (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_pending_expiry_idx
  ON public.orders (expires_at) WHERE status = 'pending_payment';

-- NOT VALID: não reprova linhas antigas com status inesperado; vale para novas
-- linhas e atualizações. Depois de conferir os dados, rodar manualmente:
--   ALTER TABLE public.orders VALIDATE CONSTRAINT orders_status_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','pending_payment','processing','shipped','delivered','cancelled'))
  NOT VALID;

-- 2. RLS: somente a service role insere (ela ignora RLS)
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert order items"     ON public.order_items;

DO $$
DECLARE
  r record;
BEGIN
  -- Remove qualquer política de INSERT restante, qualquer que seja o nome
  FOR r IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('orders', 'order_items')
       AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    RAISE NOTICE 'Política de INSERT removida: %.% (%)', r.schemaname, r.tablename, r.policyname;
  END LOOP;

  -- Políticas FOR ALL também permitiriam INSERT; não são removidas (poderiam
  -- conter SELECT legítimo). O REVOKE abaixo bloqueia o INSERT de qualquer forma.
  FOR r IN
    SELECT tablename, policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('orders', 'order_items')
       AND cmd = 'ALL'
  LOOP
    RAISE WARNING 'Política FOR ALL encontrada em public.% (%): revisar manualmente', r.tablename, r.policyname;
  END LOOP;

  -- As políticas de SELECT devem permanecer
  FOR r IN SELECT unnest(ARRAY['orders', 'order_items']) AS tablename LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
       WHERE schemaname = 'public' AND tablename = r.tablename AND cmd IN ('SELECT', 'ALL')
    ) THEN
      RAISE WARNING 'Nenhuma política de SELECT encontrada em public.%: clientes não conseguirão ler pedidos', r.tablename;
    END IF;
  END LOOP;
END $$;

REVOKE INSERT, UPDATE, DELETE ON public.orders      FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM anon, authenticated;
-- As políticas de SELECT (cliente vê os próprios, admin vê todos) permanecem.
-- O admin continua atualizando orders pela política "Admins can update orders",
-- limitada ao status por este GRANT de coluna e pelo trigger abaixo.
GRANT UPDATE (status) ON public.orders TO authenticated;

-- 3. Trigger: fora da service role, só status pode mudar, e só em transições operacionais
CREATE OR REPLACE FUNCTION public.orders_guard_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF to_jsonb(NEW) - 'status' IS DISTINCT FROM to_jsonb(OLD) - 'status' THEN
    RAISE EXCEPTION 'ORDER_FIELDS_LOCKED';
  END IF;
  IF NOT ((OLD.status = 'processing' AND NEW.status = 'shipped')
       OR (OLD.status = 'shipped'    AND NEW.status = 'delivered')
       OR  OLD.status = NEW.status) THEN
    RAISE EXCEPTION 'ORDER_STATUS_TRANSITION_NOT_ALLOWED';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS orders_guard_update ON public.orders;
CREATE TRIGGER orders_guard_update BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_guard_update();

-- 4. RPC: cria pedido reservando estoque de forma atômica
CREATE OR REPLACE FUNCTION public.create_order_reserving_stock(
  p_user_id uuid, p_idempotency_key text, p_request_hash text,
  p_customer_name text, p_customer_email text, p_payment_method text, p_shipping_address text,
  p_coupon text, p_subtotal numeric, p_discount numeric, p_shipping numeric, p_total numeric,
  p_expires_at timestamptz,
  p_items jsonb   -- [{ "product_id": uuid, "quantity": int, "color": text, "size": text }]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_short jsonb;
  v_computed numeric;
  v_requested int;
  v_found int;
BEGIN
  -- idempotência
  SELECT * INTO v_order FROM orders
   WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_order.request_hash IS DISTINCT FROM p_request_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED';
    END IF;
    RETURN jsonb_build_object('order_id', v_order.id, 'replayed', true);
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'INVALID_ITEMS';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) i WHERE (i->>'quantity')::int < 1) THEN
    RAISE EXCEPTION 'INVALID_ITEMS';
  END IF;

  -- limite de pedidos aguardando pagamento (impede esvaziar a vitrine com reservas)
  IF (SELECT count(*) FROM orders WHERE user_id = p_user_id AND status = 'pending_payment') >= 3 THEN
    RAISE EXCEPTION 'TOO_MANY_PENDING_ORDERS';
  END IF;

  -- trava os produtos em ordem de id (evita deadlock entre checkouts concorrentes)
  PERFORM 1 FROM products
   WHERE id IN (SELECT (i->>'product_id')::uuid FROM jsonb_array_elements(p_items) i)
   ORDER BY id FOR UPDATE;

  -- todos os produtos precisam existir
  SELECT count(*) INTO v_requested FROM jsonb_array_elements(p_items);
  SELECT count(*) INTO v_found
    FROM jsonb_array_elements(p_items) i JOIN products p ON p.id = (i->>'product_id')::uuid;
  IF v_found <> v_requested THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;

  -- o preço atual deve fechar com o subtotal calculado pelo servidor
  SELECT COALESCE(sum(ROUND(p.price * (i->>'quantity')::int, 2)), 0) INTO v_computed
    FROM jsonb_array_elements(p_items) i JOIN products p ON p.id = (i->>'product_id')::uuid;
  IF v_computed <> p_subtotal OR p_total <> p_subtotal - p_discount + p_shipping THEN
    RAISE EXCEPTION 'PRICE_CHANGED';
  END IF;

  -- estoque por produto (soma das variantes do mesmo produto)
  SELECT jsonb_agg(jsonb_build_object('productId', t.pid, 'requested', t.qty, 'available', t.avail))
    INTO v_short
    FROM (SELECT p.id AS pid, sum((i->>'quantity')::int) AS qty,
                 CASE WHEN COALESCE(p."inStock", false) THEN COALESCE(p."stockCount", 0) ELSE 0 END AS avail
            FROM jsonb_array_elements(p_items) i JOIN products p ON p.id = (i->>'product_id')::uuid
           GROUP BY p.id, p."inStock", p."stockCount") t
   WHERE t.avail < t.qty;
  IF v_short IS NOT NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK' USING DETAIL = v_short::text;
  END IF;

  -- baixa atômica; inStock cai para falso quando chega a zero
  UPDATE products p SET "stockCount" = p."stockCount" - t.qty,
                        "inStock"    = (p."stockCount" - t.qty) > 0
    FROM (SELECT (i->>'product_id')::uuid AS pid, sum((i->>'quantity')::int) AS qty
            FROM jsonb_array_elements(p_items) i GROUP BY 1) t
   WHERE p.id = t.pid;

  BEGIN
    INSERT INTO orders (user_id, "customerName", "customerEmail", "totalAmount", status, "paymentMethod",
                        "shippingAddress", "couponUsed", "subtotalAmount", "discountAmount", "shippingAmount",
                        idempotency_key, request_hash, expires_at)
    VALUES (p_user_id, p_customer_name, p_customer_email, p_total, 'pending_payment', p_payment_method,
            p_shipping_address, p_coupon, p_subtotal, p_discount, p_shipping,
            p_idempotency_key, p_request_hash, p_expires_at)
    RETURNING * INTO v_order;
  EXCEPTION WHEN unique_violation THEN
    -- requisição simultânea com a mesma chave: relançar desfaz a baixa de estoque desta chamada
    RAISE EXCEPTION 'IDEMPOTENT_RACE';
  END;

  INSERT INTO order_items (order_id, product_id, "productName", price, quantity, "selectedColor", "selectedSize", image)
  SELECT v_order.id, p.id, p.name, p.price, (i->>'quantity')::int, i->>'color', i->>'size',
         COALESCE(p.images->>0, '')
    FROM jsonb_array_elements(p_items) i JOIN products p ON p.id = (i->>'product_id')::uuid;

  RETURN jsonb_build_object('order_id', v_order.id, 'replayed', false);
END $$;

-- 5. RPC: devolve estoque e cancela (idempotente: só age em pending_payment)
CREATE OR REPLACE FUNCTION public.release_order_stock(p_order_id uuid, p_reason text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM orders WHERE id = p_order_id FOR UPDATE;
  IF v_status IS DISTINCT FROM 'pending_payment' THEN RETURN false; END IF;
  UPDATE products p SET "stockCount" = COALESCE(p."stockCount", 0) + t.qty, "inStock" = true
    FROM (SELECT product_id, sum(quantity) AS qty FROM order_items WHERE order_id = p_order_id GROUP BY 1) t
   WHERE p.id = t.product_id;
  UPDATE orders SET status = 'cancelled', cancel_reason = p_reason WHERE id = p_order_id;
  RETURN true;
END $$;

-- 6. RPC: confirma pagamento (idempotente; confere valor; sinaliza pagamento tardio)
CREATE OR REPLACE FUNCTION public.confirm_order_payment(p_order_id uuid, p_payment_id text, p_paid numeric)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v orders%ROWTYPE;
BEGIN
  SELECT * INTO v FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v.payment_id IS DISTINCT FROM p_payment_id THEN RETURN 'not_found'; END IF;
  IF v.status = 'pending_payment' THEN
    IF v."totalAmount" <> p_paid THEN RETURN 'amount_mismatch'; END IF;
    UPDATE orders SET status = 'processing', paid_at = now() WHERE id = p_order_id;
    RETURN 'confirmed';
  ELSIF v.status = 'cancelled' THEN
    UPDATE orders SET needs_review = true WHERE id = p_order_id;
    RETURN 'late_payment';
  END IF;
  RETURN 'noop';
END $$;

-- 7. RPC: grava o id do pagamento
CREATE OR REPLACE FUNCTION public.attach_order_payment(p_order_id uuid, p_payment_id text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE orders SET payment_id = p_payment_id WHERE id = p_order_id AND payment_id IS NULL;
$$;

-- 8. Somente a service role executa as RPCs
REVOKE ALL ON FUNCTION public.create_order_reserving_stock(uuid, text, text, text, text, text, text, text,
                                                           numeric, numeric, numeric, numeric, timestamptz, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_order_stock(uuid, text)               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_order_payment(uuid, text, numeric)    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_order_payment(uuid, text)              FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_order_reserving_stock(uuid, text, text, text, text, text, text, text,
                                                              numeric, numeric, numeric, numeric, timestamptz, jsonb)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.release_order_stock(uuid, text)            TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(uuid, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_order_payment(uuid, text)           TO service_role;

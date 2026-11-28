-- =====================================================================
-- Endurecimento do acesso de admin
-- =====================================================================
-- Problemas corrigidos:
-- 1. Políticas aceitavam `auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'` ou
--    `auth.users.raw_user_meta_data ->> 'role'`. O próprio usuário edita user_metadata
--    (supabase.auth.updateUser({ data: { role: 'admin' } })), então qualquer cliente
--    podia virar admin de produtos, categorias, pedidos e estoque.
--    Agora a única fonte é profiles.role, lida por public.is_admin().
-- 2. validate_admin_secret_key tinha uma chave fixa no código (versionada no git) e
--    podia ser chamada por qualquer um, sem limite de tentativas.
--    Agora a chave vem só do Vault (sem fallback), e promote_to_admin limita tentativas.
-- 3. "System can insert profiles" (WITH CHECK true) deixava o cliente inserir um
--    perfil com role 'admin' para uma conta sem perfil.
-- 4. process_bulk_stock_movements pulava a checagem de admin quando auth.uid() era
--    NULL (chamada anônima) e era executável por PUBLIC.
-- 5. RPCs de análise de estoque (SECURITY DEFINER, sem checagem) expunham as
--    saídas de estoque a qualquer usuário logado.
--
-- ANTES DE RODAR, confira quem é admin hoje (só profiles.role continua valendo):
--   SELECT u.email, p.role, u.raw_user_meta_data ->> 'role' AS meta_role
--     FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
--    WHERE p.role = 'admin' OR u.raw_user_meta_data ->> 'role' = 'admin';
-- Quem tiver meta_role = 'admin' e role <> 'admin' perde o acesso (é o objetivo, a
-- menos que seja um admin legítimo: nesse caso, UPDATE public.profiles SET role = 'admin').
--
-- DEPOIS DE RODAR, cadastre uma chave NOVA no Vault (a antiga está no histórico do git):
--   SELECT vault.create_secret('<chave longa e aleatória, 16+ caracteres>', 'admin_secret_key');
-- Sem a chave no Vault, o cadastro de admin pela tela fica desativado (falha fechado).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Fonte única do papel de admin
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. Políticas: troca user_metadata por is_admin()
-- ---------------------------------------------------------------------
-- Products
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE
  USING (public.is_admin());

-- Categories
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE
  USING (public.is_admin());

-- Orders (INSERT segue só pela service role; UPDATE limitado ao status pelo trigger)
DROP POLICY IF EXISTS "Users can view their own orders or Admins view all" ON public.orders;
CREATE POLICY "Users can view their own orders or Admins view all" ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Order items
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items" ON public.order_items FOR SELECT
  USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    OR public.is_admin()
  );

-- Profiles: só o trigger (SECURITY DEFINER) cria perfis
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
REVOKE INSERT, DELETE ON public.profiles FROM anon, authenticated;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Estoque
DROP POLICY IF EXISTS "Admin All Inventory" ON public.inventory_items;
CREATE POLICY "Admin All Inventory" ON public.inventory_items
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin Stock Movements" ON public.stock_movements;
CREATE POLICY "Admin Stock Movements" ON public.stock_movements
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. RPCs de estoque
-- ---------------------------------------------------------------------
-- Lote: a função original lê auth.users, então continua SECURITY DEFINER, mas passa
-- a ser interna; a versão pública só a chama depois de is_admin() (inclusive anônimo).
DO $$
BEGIN
  IF to_regprocedure('public.process_bulk_stock_movements(jsonb)') IS NULL THEN
    RAISE NOTICE 'process_bulk_stock_movements não existe neste banco: ignorada';
    RETURN;
  END IF;
  IF to_regprocedure('public.process_bulk_stock_movements_unchecked(jsonb)') IS NULL THEN
    ALTER FUNCTION public.process_bulk_stock_movements(jsonb)
      RENAME TO process_bulk_stock_movements_unchecked;
  ELSE
    -- Reexecução: a versão pública já é o wrapper.
    DROP FUNCTION public.process_bulk_stock_movements(jsonb);
  END IF;
  REVOKE ALL ON FUNCTION public.process_bulk_stock_movements_unchecked(jsonb)
    FROM PUBLIC, anon, authenticated;

  EXECUTE $fn$
    CREATE FUNCTION public.process_bulk_stock_movements(payload jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    BEGIN
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem executar movimentações em lote.'
          USING ERRCODE = '42501';
      END IF;
      RETURN public.process_bulk_stock_movements_unchecked(payload);
    END;
    $body$
  $fn$;
  REVOKE ALL ON FUNCTION public.process_bulk_stock_movements(jsonb) FROM PUBLIC, anon;
  GRANT EXECUTE ON FUNCTION public.process_bulk_stock_movements(jsonb) TO authenticated;
END $$;

-- Análises: SECURITY INVOKER, então a RLS vale (stock_movements só para admin).
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.get_inventory_abc_curve()',
    'public.get_stockout_predictions()'
  ] LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    ELSE
      RAISE NOTICE 'Função % não existe neste banco: ignorada', fn;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 4. Promoção a admin: chave só no Vault + limite de tentativas
-- ---------------------------------------------------------------------
-- Remove todas as versões antigas (inclusive variações criadas à mão no painel).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('promote_to_admin', 'validate_admin_secret_key')
  LOOP
    EXECUTE format('DROP FUNCTION %s', r.sig);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.admin_promotion_attempts (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL,
  succeeded    BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_promotion_attempts_recent_idx
  ON public.admin_promotion_attempts (attempted_at DESC);

ALTER TABLE public.admin_promotion_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_promotion_attempts FROM anon, authenticated;

-- Sem fallback: chave ausente ou curta demais = nenhuma promoção.
CREATE FUNCTION public.validate_admin_secret_key(provided_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_key text;
BEGIN
  IF provided_key IS NULL OR provided_key = '' THEN
    RETURN false;
  END IF;

  BEGIN
    SELECT decrypted_secret INTO stored_key
      FROM vault.decrypted_secrets
     WHERE name = 'admin_secret_key'
     LIMIT 1;
  EXCEPTION WHEN undefined_table OR invalid_schema_name OR insufficient_privilege THEN
    stored_key := NULL;
  END;

  IF stored_key IS NULL OR length(stored_key) < 16 THEN
    RETURN false;
  END IF;
  RETURN provided_key = stored_key;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_admin_secret_key(text) FROM PUBLIC, anon, authenticated;

-- Promove só o próprio usuário logado. target_user_id existe porque o app o envia;
-- se vier, precisa ser o próprio usuário.
CREATE FUNCTION public.promote_to_admin(provided_key text, target_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_user_fails  integer;
  v_total_fails integer;
  v_ok          boolean;
BEGIN
  IF v_uid IS NULL OR (target_user_id IS NOT NULL AND target_user_id <> v_uid) THEN
    RETURN false;
  END IF;

  -- 5 erros por conta e 30 no total por hora (contas novas não driblam o limite).
  SELECT count(*) FILTER (WHERE user_id = v_uid), count(*)
    INTO v_user_fails, v_total_fails
    FROM public.admin_promotion_attempts
   WHERE NOT succeeded
     AND attempted_at > now() - interval '1 hour';
  IF v_user_fails >= 5 OR v_total_fails >= 30 THEN
    RETURN false;
  END IF;

  v_ok := public.validate_admin_secret_key(provided_key);
  INSERT INTO public.admin_promotion_attempts (user_id, succeeded) VALUES (v_uid, v_ok);
  IF NOT v_ok THEN
    RETURN false;
  END IF;

  INSERT INTO public.profiles (id, role) VALUES (v_uid, 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin';
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_to_admin(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(text, uuid) TO authenticated;

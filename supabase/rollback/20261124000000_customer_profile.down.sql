-- =================================================================================
-- ROLLBACK de 20261124000000_customer_profile.sql
--
-- ATENÇÃO: apaga as tabelas customer_details e customer_addresses e TODOS os dados
-- nelas (telefones, CPFs e endereços salvos dos clientes). Não há como desfazer.
-- Faça backup antes de executar.
-- =================================================================================

-- Triggers
DROP TRIGGER IF EXISTS customer_addresses_enforce_limit ON public.customer_addresses;
DROP TRIGGER IF EXISTS customer_addresses_set_updated_at ON public.customer_addresses;
DROP TRIGGER IF EXISTS customer_details_set_updated_at ON public.customer_details;

-- Políticas
DROP POLICY IF EXISTS "Customer addresses delete own" ON public.customer_addresses;
DROP POLICY IF EXISTS "Customer addresses update own" ON public.customer_addresses;
DROP POLICY IF EXISTS "Customer addresses insert own" ON public.customer_addresses;
DROP POLICY IF EXISTS "Customer addresses select own" ON public.customer_addresses;

DROP POLICY IF EXISTS "Customer details delete own" ON public.customer_details;
DROP POLICY IF EXISTS "Customer details update own" ON public.customer_details;
DROP POLICY IF EXISTS "Customer details insert own" ON public.customer_details;
DROP POLICY IF EXISTS "Customer details select own" ON public.customer_details;

-- Tabelas (os índices caem junto)
DROP TABLE IF EXISTS public.customer_addresses;
DROP TABLE IF EXISTS public.customer_details;

-- Funções
DROP FUNCTION IF EXISTS public.customer_addresses_enforce_limit();
DROP FUNCTION IF EXISTS public.customer_profile_set_updated_at();

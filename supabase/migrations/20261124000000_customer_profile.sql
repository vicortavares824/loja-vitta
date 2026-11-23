-- =================================================================================
-- Perfil do cliente: dados pessoais (telefone, CPF) e endereços salvos
--
-- Tabelas novas, separadas de public.profiles de propósito: profiles guarda "role",
-- e deixar o cliente editá-la abriria escalada de privilégio para admin.
--
-- LGPD: o CPF (customer_details.cpf) é dado pessoal. Só o próprio titular acessa a
-- linha (RLS por auth.uid()); não registrar em logs, não expor em views públicas.
--
-- Seguro para reexecutar (IF NOT EXISTS / DROP ... IF EXISTS).
-- Rollback: supabase/rollback/20261124000000_customer_profile.down.sql
-- =================================================================================

-- 1. Funções auxiliares ------------------------------------------------------------

-- Mantém updated_at atualizado em UPDATE.
CREATE OR REPLACE FUNCTION public.customer_profile_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- Limita a 10 endereços por usuário. O lock advisory serializa inserts concorrentes
-- do mesmo usuário até o fim da transação, evitando passar do limite por corrida.
CREATE OR REPLACE FUNCTION public.customer_addresses_enforce_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('customer_addresses:' || NEW.user_id::text));

    IF (SELECT count(*) FROM public.customer_addresses WHERE user_id = NEW.user_id) >= 10 THEN
        RAISE EXCEPTION 'Limite de 10 enderecos por usuario atingido'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Tabela customer_details -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customer_details (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT,
    cpf TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT customer_details_phone_check
        CHECK (phone IS NULL OR phone ~ '^[0-9]{10,11}$'),
    CONSTRAINT customer_details_cpf_check
        CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$')
);

-- 3. Tabela customer_addresses -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT,
    recipient_name TEXT NOT NULL,
    cep TEXT NOT NULL,
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state CHAR(2) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT customer_addresses_label_check
        CHECK (label IS NULL OR char_length(label) BETWEEN 1 AND 40),
    CONSTRAINT customer_addresses_recipient_name_check
        CHECK (char_length(btrim(recipient_name)) BETWEEN 1 AND 100),
    CONSTRAINT customer_addresses_cep_check
        CHECK (cep ~ '^[0-9]{8}$'),
    CONSTRAINT customer_addresses_street_check
        CHECK (char_length(btrim(street)) BETWEEN 1 AND 150),
    CONSTRAINT customer_addresses_number_check
        CHECK (char_length(btrim(number)) BETWEEN 1 AND 20),
    CONSTRAINT customer_addresses_complement_check
        CHECK (complement IS NULL OR char_length(complement) <= 100),
    CONSTRAINT customer_addresses_neighborhood_check
        CHECK (char_length(btrim(neighborhood)) BETWEEN 1 AND 100),
    CONSTRAINT customer_addresses_city_check
        CHECK (char_length(btrim(city)) BETWEEN 1 AND 100),
    CONSTRAINT customer_addresses_state_check
        CHECK (state ~ '^[A-Z]{2}$')
);

CREATE INDEX IF NOT EXISTS customer_addresses_user_id_idx
    ON public.customer_addresses (user_id);

-- No máximo um endereço padrão por usuário.
CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_one_default_per_user_idx
    ON public.customer_addresses (user_id)
    WHERE is_default;

-- 4. Triggers ----------------------------------------------------------------------

DROP TRIGGER IF EXISTS customer_details_set_updated_at ON public.customer_details;
CREATE TRIGGER customer_details_set_updated_at
    BEFORE UPDATE ON public.customer_details
    FOR EACH ROW EXECUTE FUNCTION public.customer_profile_set_updated_at();

DROP TRIGGER IF EXISTS customer_addresses_set_updated_at ON public.customer_addresses;
CREATE TRIGGER customer_addresses_set_updated_at
    BEFORE UPDATE ON public.customer_addresses
    FOR EACH ROW EXECUTE FUNCTION public.customer_profile_set_updated_at();

DROP TRIGGER IF EXISTS customer_addresses_enforce_limit ON public.customer_addresses;
CREATE TRIGGER customer_addresses_enforce_limit
    BEFORE INSERT ON public.customer_addresses
    FOR EACH ROW EXECUTE FUNCTION public.customer_addresses_enforce_limit();

-- 5. RLS ---------------------------------------------------------------------------

ALTER TABLE public.customer_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

-- customer_details
DROP POLICY IF EXISTS "Customer details select own" ON public.customer_details;
CREATE POLICY "Customer details select own" ON public.customer_details
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Customer details insert own" ON public.customer_details;
CREATE POLICY "Customer details insert own" ON public.customer_details
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Customer details update own" ON public.customer_details;
CREATE POLICY "Customer details update own" ON public.customer_details
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Customer details delete own" ON public.customer_details;
CREATE POLICY "Customer details delete own" ON public.customer_details
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- customer_addresses
DROP POLICY IF EXISTS "Customer addresses select own" ON public.customer_addresses;
CREATE POLICY "Customer addresses select own" ON public.customer_addresses
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Customer addresses insert own" ON public.customer_addresses;
CREATE POLICY "Customer addresses insert own" ON public.customer_addresses
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Customer addresses update own" ON public.customer_addresses;
CREATE POLICY "Customer addresses update own" ON public.customer_addresses
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Customer addresses delete own" ON public.customer_addresses;
CREATE POLICY "Customer addresses delete own" ON public.customer_addresses
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- 6. Privilégios -------------------------------------------------------------------

REVOKE ALL ON public.customer_details FROM anon;
REVOKE ALL ON public.customer_addresses FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_details TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;

-- As funções de trigger não devem ser chamáveis via RPC.
REVOKE EXECUTE ON FUNCTION public.customer_profile_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.customer_addresses_enforce_limit() FROM PUBLIC, anon, authenticated;

-- =================================================================================
-- Security: JWT Custom Claims Hook
-- =================================================================================
-- NOTE: ALTER DATABASE para app.settings requer superuser — não disponível no
-- Supabase Cloud SQL Editor. A função validate_admin_secret_key() já possui o
-- valor da chave como fallback na migration 20260829000000_security_fixes.sql.
-- Para máxima segurança em produção, use o Supabase Vault:
--   INSERT INTO vault.secrets (name, secret) VALUES ('admin_secret_key', 'sua_chave');
-- =================================================================================

-- JWT Hook: injeta o `role` da tabela profiles em todo JWT emitido.
-- Garante que RLS policies que checam auth.jwt()->'user_metadata'->>'role'
-- funcionam corretamente para admins recém-promovidos.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims         JSONB;
  user_role      TEXT;
  user_id        UUID;
BEGIN
  claims  := event->'claims';
  user_id := (event->>'user_id')::UUID;

  -- Fetch authoritative role from profiles table
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;

  -- Inject role into user_metadata claim (backward compat with existing RLS)
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{user_metadata,role}',
      to_jsonb(user_role)
    );
  END IF;

  -- Return the modified claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Permissões para o supabase_auth_admin chamar o hook e ler profiles
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

-- Segurança: apenas supabase_auth_admin pode executar o hook
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;

-- =================================================================================
-- APÓS RODAR ESTE SQL, ative o hook no Dashboard:
--   Auth → Hooks → Add hook → Customize Access Token (JWT) Claims hook
--   Type: Postgres Function
--   Schema: public  |  Function: custom_access_token_hook
-- =================================================================================

-- =================================================================================
-- Security Fixes - Server-side admin validation
-- =================================================================================

-- 1. Create profiles table (replaces user_metadata for role)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own, admins can read all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Only system can insert profiles (via trigger)
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT
WITH CHECK (true);

-- Only admins can update roles
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, role)
    VALUES (NEW.id, 'customer');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Admin secret key validation function (server-side only!)
-- The key is stored in a vault or should be set via Supabase secrets
CREATE OR REPLACE FUNCTION public.validate_admin_secret_key(provided_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    stored_key TEXT;
BEGIN
    -- Get the secret from Supabase vault or app settings
    -- For production, use: SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'admin_secret_key'
    -- For now, we use a hardcoded comparison that is NEVER exposed to the client
    stored_key := current_setting('app.settings.admin_secret_key', true);
    
    -- If setting is not configured, use the fallback (THIS SHOULD BE REPLACED WITH VAULT IN PRODUCTION)
    IF stored_key IS NULL OR stored_key = '' THEN
        stored_key := 'vitta_moda_vitoria_vitor'; -- Fallback, move to vault ASAP
    END IF;
    
    RETURN provided_key = stored_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to promote user to admin (server-side validation)
CREATE OR REPLACE FUNCTION public.promote_to_admin(provided_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validate the secret key server-side
    IF NOT public.validate_admin_secret_key(provided_key) THEN
        RETURN FALSE;
    END IF;
    
    -- Update the user's profile role
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = auth.uid();
    
    -- Also update user_metadata for JWT claims (for RLS compatibility)
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
    WHERE id = auth.uid();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update RLS policies to also check profiles table
-- (Keep user_metadata check for backward compatibility, but add profiles check)

-- Products: Admin check now includes profiles table
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT
WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE
USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE
USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Categories: Admin check now includes profiles table
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT
WITH CHECK (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE
USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE
USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Orders: Admin check now includes profiles table
DROP POLICY IF EXISTS "Users can view their own orders or Admins view all" ON public.orders;
CREATE POLICY "Users can view their own orders or Admins view all" ON public.orders FOR SELECT
USING (
    auth.uid() = user_id
    OR auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE
USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Order Items: Admin check now includes profiles table
DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
CREATE POLICY "Users can insert order items" ON public.order_items FOR INSERT
WITH CHECK (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    OR auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items" ON public.order_items FOR SELECT
USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    OR auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

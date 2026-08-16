-- =================================================================================
-- Vitta Basics - Supabase SQL Schema & RLS Policies
-- =================================================================================

-- 1. Create Tables
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    "originalPrice" DECIMAL(10,2),
    category TEXT NOT NULL,
    "categorySlug" TEXT NOT NULL,
    images JSONB NOT NULL DEFAULT '[]',
    description TEXT NOT NULL,
    details JSONB DEFAULT '[]',
    colors JSONB DEFAULT '[]',
    sizes JSONB DEFAULT '[]',
    rating DECIMAL(3,2) DEFAULT 0,
    "reviewsCount" INTEGER DEFAULT 0,
    "isNew" BOOLEAN DEFAULT false,
    "isFeatured" BOOLEAN DEFAULT false,
    "inStock" BOOLEAN DEFAULT true,
    "stockCount" INTEGER DEFAULT 0,
    tag TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    image TEXT NOT NULL,
    "itemCount" INTEGER DEFAULT 0,
    description TEXT NOT NULL
);

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "couponUsed" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    "productName" TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    "selectedColor" TEXT NOT NULL,
    "selectedSize" TEXT NOT NULL,
    image TEXT NOT NULL
);


-- =================================================================================
-- 2. Row Level Security (RLS)
-- Define as regras de quem pode acessar ou modificar os dados via API.
-- =================================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Products:
-- Todo mundo (anônimos e logados) pode LER produtos.
CREATE POLICY "Public profiles are viewable by everyone." 
ON public.products FOR SELECT USING (true);

-- Apenas Admins podem INSERIR, ATUALIZAR ou DELETAR produtos.
-- O papel 'admin' será salvo no raw_user_meta_data ->> 'role'
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT 
WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

CREATE POLICY "Admins can update products" ON public.products FOR UPDATE 
USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

CREATE POLICY "Admins can delete products" ON public.products FOR DELETE 
USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- Categories:
-- Todo mundo pode LER categorias.
CREATE POLICY "Categories are viewable by everyone." 
ON public.categories FOR SELECT USING (true);

-- Apenas Admins podem INSERIR, ATUALIZAR ou DELETAR categorias.
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT 
WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE 
USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE 
USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- Orders:
-- Clientes podem INSERIR seus próprios pedidos.
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Clientes podem LER seus próprios pedidos, Admins podem ler todos.
CREATE POLICY "Users can view their own orders or Admins view all" ON public.orders FOR SELECT 
USING (auth.uid() = user_id OR auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- Apenas Admins podem ATUALIZAR pedidos (ex: mudar status).
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE 
USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- Order Items:
-- Clientes podem INSERIR itens no seu pedido, Admins podem tudo.
CREATE POLICY "Users can insert order items" ON public.order_items FOR INSERT 
WITH CHECK (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()) 
    OR auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
);

CREATE POLICY "Users can view their own order items" ON public.order_items FOR SELECT 
USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    OR auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
);


-- =================================================================================
-- 3. Dummy Data (Opcional - Produtos de exemplo da Vitta)
-- =================================================================================

INSERT INTO public.categories (name, slug, image, "itemCount", description) VALUES
('Camisetas', 'camisetas', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80', 24, 'Camisetas básicas em algodão pima'),
('Calças', 'calcas', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80', 16, 'Calças de alfaiataria e jeans premium'),
('Casacos', 'casacos', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80', 12, 'Casacos e blusas de frio essenciais');

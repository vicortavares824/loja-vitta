-- =================================================================================
-- TomatoPHP Inventory Plugin - Supabase SQL Schema & RLS Policies
-- Reference: https://docs.tomatophp.com/plugins/tomato-inventory
-- =================================================================================

-- 1. Create inventory_items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "productId" UUID REFERENCES public.products(id) ON DELETE CASCADE,
    "productName" TEXT NOT NULL,
    sku TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 5,
    "maxStock" INTEGER NOT NULL DEFAULT 100,
    unit TEXT NOT NULL DEFAULT 'un',
    "imageUrl" TEXT,
    status TEXT NOT NULL DEFAULT 'in_stock',
    "lastUpdated" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create stock_movements table
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "inventoryItemId" UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
    quantity INTEGER NOT NULL,
    reason TEXT NOT NULL,
    "createdBy" UUID REFERENCES auth.users(id),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Public can read inventory items for stock display
CREATE POLICY "Public Read Inventory" ON public.inventory_items
    FOR SELECT USING (true);

-- Authenticated admins can manage inventory items
CREATE POLICY "Admin All Inventory" ON public.inventory_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role' = 'admin' OR auth.users.raw_app_meta_data->>'role' = 'admin')
        )
    );

-- Admins can view and create stock movements
CREATE POLICY "Admin Stock Movements" ON public.stock_movements
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role' = 'admin' OR auth.users.raw_app_meta_data->>'role' = 'admin')
        )
    );

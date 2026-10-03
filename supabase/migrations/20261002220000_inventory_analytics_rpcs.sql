-- =================================================================================
-- TomatoPHP Inventory Analytics - Curva ABC & Previsão de Ruptura (Stockout)
-- Functions: get_inventory_abc_curve() e get_stockout_predictions()
-- Description: Processamento de inteligência de estoque e previsão analítica
--              executado server-side via Supabase RPCs.
-- =================================================================================

-- 1. Curva ABC de Estoque (Volume de Saídas últimos 90 dias)
CREATE OR REPLACE FUNCTION public.get_inventory_abc_curve()
RETURNS TABLE (
  inventory_item_id UUID,
  product_name TEXT,
  sku TEXT,
  current_stock INTEGER,
  min_stock INTEGER,
  status TEXT,
  total_out_qty BIGINT,
  percentage NUMERIC,
  cum_percentage NUMERIC,
  classification TEXT,
  image_url TEXT,
  category_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_volume NUMERIC;
BEGIN
  -- Total geral de saídas nos últimos 90 dias
  SELECT COALESCE(SUM(sm.quantity), 0)
  INTO v_total_volume
  FROM public.stock_movements sm
  WHERE sm.type = 'out'
    AND sm."createdAt" >= (timezone('utc'::text, now()) - INTERVAL '90 days');

  -- Fallback de segurança se não houver registros nos 90 dias
  IF v_total_volume = 0 THEN
    SELECT COALESCE(SUM(sm.quantity), 0)
    INTO v_total_volume
    FROM public.stock_movements sm
    WHERE sm.type = 'out';
  END IF;

  RETURN QUERY
  WITH item_sales AS (
    SELECT 
      ii.id AS item_id,
      ii."productName"::TEXT AS item_name,
      ii.sku::TEXT AS item_sku,
      ii."currentStock"::INTEGER AS item_stock,
      ii."minStock"::INTEGER AS item_min_stock,
      ii.status::TEXT AS item_status,
      COALESCE(SUM(sm.quantity), 0)::BIGINT AS item_out_qty,
      ii."imageUrl"::TEXT AS item_image,
      ii."categoryName"::TEXT AS item_category
    FROM public.inventory_items ii
    LEFT JOIN public.stock_movements sm 
      ON sm."inventoryItemId" = ii.id 
     AND sm.type = 'out'
     AND sm."createdAt" >= (timezone('utc'::text, now()) - INTERVAL '90 days')
    GROUP BY ii.id, ii."productName", ii.sku, ii."currentStock", ii."minStock", ii.status, ii."imageUrl", ii."categoryName"
  ),
  ranked_items AS (
    SELECT 
      *,
      CASE 
        WHEN v_total_volume > 0 THEN ROUND((item_out_qty::NUMERIC / v_total_volume) * 100, 2)
        ELSE 0
      END AS pct,
      SUM(CASE WHEN v_total_volume > 0 THEN (item_out_qty::NUMERIC / v_total_volume) * 100 ELSE 0 END) 
        OVER (ORDER BY item_out_qty DESC, item_stock DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_pct
    FROM item_sales
  )
  SELECT 
    ri.item_id,
    ri.item_name,
    ri.item_sku,
    ri.item_stock,
    ri.item_min_stock,
    ri.item_status,
    ri.item_out_qty,
    ri.pct,
    ROUND(ri.cum_pct, 2),
    CASE 
      WHEN ri.cum_pct <= 80 OR (ri.cum_pct - ri.pct <= 0) THEN 'A'
      WHEN ri.cum_pct <= 95 THEN 'B'
      ELSE 'C'
    END AS cls,
    ri.item_image,
    ri.item_category
  FROM ranked_items ri
  ORDER BY ri.item_out_qty DESC, ri.item_stock DESC;
END;
$$;

-- 2. Previsão de Ruptura (Stockout Prediction - itens com risco em < 15 dias)
CREATE OR REPLACE FUNCTION public.get_stockout_predictions()
RETURNS TABLE (
  inventory_item_id UUID,
  product_name TEXT,
  sku TEXT,
  current_stock INTEGER,
  min_stock INTEGER,
  avg_daily_sales NUMERIC,
  days_until_stockout NUMERIC,
  status TEXT,
  image_url TEXT,
  category_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH sales_30d AS (
    SELECT 
      ii.id AS item_id,
      ii."productName"::TEXT AS item_name,
      ii.sku::TEXT AS item_sku,
      ii."currentStock"::INTEGER AS item_stock,
      ii."minStock"::INTEGER AS item_min_stock,
      ii.status::TEXT AS item_status,
      ii."imageUrl"::TEXT AS item_image,
      ii."categoryName"::TEXT AS item_category,
      -- Vendas nos últimos 30 dias / 30 dias
      ROUND(COALESCE(SUM(sm.quantity), 0)::NUMERIC / 30.0, 2) AS daily_velocity
    FROM public.inventory_items ii
    LEFT JOIN public.stock_movements sm 
      ON sm."inventoryItemId" = ii.id 
     AND sm.type = 'out'
     AND sm."createdAt" >= (timezone('utc'::text, now()) - INTERVAL '30 days')
    GROUP BY ii.id, ii."productName", ii.sku, ii."currentStock", ii."minStock", ii.status, ii."imageUrl", ii."categoryName"
  ),
  predictions AS (
    SELECT 
      s.item_id,
      s.item_name,
      s.item_sku,
      s.item_stock,
      s.item_min_stock,
      s.daily_velocity,
      CASE 
        WHEN s.item_stock <= 0 THEN 0.0
        WHEN s.daily_velocity > 0 THEN ROUND(s.item_stock::NUMERIC / s.daily_velocity, 1)
        ELSE 999.0
      END AS days_left,
      s.item_status,
      s.item_image,
      s.item_category
    FROM sales_30d s
  )
  SELECT 
    p.item_id,
    p.item_name,
    p.item_sku,
    p.item_stock,
    p.item_min_stock,
    p.daily_velocity,
    p.days_left,
    p.item_status,
    p.item_image,
    p.item_category
  FROM predictions p
  WHERE p.item_stock <= 0 OR (p.daily_velocity > 0 AND p.days_left <= 15.0)
  ORDER BY p.days_left ASC, p.daily_velocity DESC;
END;
$$;

-- Permissões de execução
GRANT EXECUTE ON FUNCTION public.get_inventory_abc_curve() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stockout_predictions() TO authenticated;

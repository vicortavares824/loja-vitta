-- Reverte 20261126000000_shipping_melhor_envio.sql
DROP FUNCTION IF EXISTS public.set_order_tracking(uuid, text);
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_tracking_code_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_shipping_cep_check;
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS tracking_code,
  DROP COLUMN IF EXISTS shipping_service_name,
  DROP COLUMN IF EXISTS shipping_service_id,
  DROP COLUMN IF EXISTS shipping_cep;

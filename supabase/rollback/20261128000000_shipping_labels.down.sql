-- Reverte 20261128000000_shipping_labels.sql
DROP INDEX IF EXISTS public.orders_label_sync_idx;
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS label_claimed_at,
  DROP COLUMN IF EXISTS label_generated_at,
  DROP COLUMN IF EXISTS label_url,
  DROP COLUMN IF EXISTS me_order_id,
  DROP COLUMN IF EXISTS shipping_address_parts;

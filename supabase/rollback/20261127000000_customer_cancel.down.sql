-- Reverte 20261127000000_customer_cancel.sql
DROP FUNCTION IF EXISTS public.cancel_paid_order(uuid, text);

-- Volta o trigger para a versão de 20261122000000_secure_checkout.sql (sem a trava).
CREATE OR REPLACE FUNCTION public.orders_guard_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF to_jsonb(NEW) - 'status' IS DISTINCT FROM to_jsonb(OLD) - 'status' THEN
    RAISE EXCEPTION 'ORDER_FIELDS_LOCKED';
  END IF;
  IF NOT ((OLD.status = 'processing' AND NEW.status = 'shipped')
       OR (OLD.status = 'shipped'    AND NEW.status = 'delivered')
       OR  OLD.status = NEW.status) THEN
    RAISE EXCEPTION 'ORDER_STATUS_TRANSITION_NOT_ALLOWED';
  END IF;
  RETURN NEW;
END $$;

ALTER TABLE public.orders DROP COLUMN IF EXISTS cancel_requested_at;

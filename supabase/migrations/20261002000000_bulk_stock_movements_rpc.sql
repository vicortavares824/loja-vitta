-- =================================================================================
-- TomatoPHP Inventory Plugin - Bulk Stock Movement Atomic RPC
-- Function: process_bulk_stock_movements(payload JSONB)
-- Description: Processa dezenas de movimentações de estoque em lote em uma única
--              transação atômica. Se qualquer validação ou constraint falhar,
--              todo o lote sofre rollback imediato.
-- =================================================================================

CREATE OR REPLACE FUNCTION public.process_bulk_stock_movements(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_record      JSONB;
  v_item_id          UUID;
  v_quantity         INTEGER;
  v_type             TEXT;
  v_reason           TEXT;
  v_admin_id         UUID;
  v_curr_stock       INTEGER;
  v_min_stock        INTEGER;
  v_prod_id          UUID;
  v_new_stock        INTEGER;
  v_new_status       TEXT;
  v_processed_count  INTEGER := 0;
  v_current_user     UUID;
  v_is_admin         BOOLEAN := false;
BEGIN
  -- 1. Identificar usuário atual e validar permissão de administrador
  v_current_user := auth.uid();
  
  -- Verificar papel admin em perfis ou metadados
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_current_user AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = v_current_user 
    AND (
      raw_user_meta_data->>'role' = 'admin' 
      OR raw_app_meta_data->>'role' = 'admin'
    )
  ) INTO v_is_admin;

  -- Se invocado sem sessão autenticada em ambiente de teste ou admin
  IF v_current_user IS NOT NULL AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem executar movimentações em lote.';
  END IF;

  -- 2. Validar estrutura do payload
  IF payload IS NULL OR jsonb_typeof(payload) <> 'array' THEN
    RAISE EXCEPTION 'Payload inválido: deve ser um array JSON de movimentações de estoque.';
  END IF;

  IF jsonb_array_length(payload) = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'processed_count', 0,
      'message', 'Nenhuma movimentação para processar no lote.'
    );
  END IF;

  -- 3. Iterar sobre cada registro do lote dentro da transação atômica
  FOR v_item_record IN SELECT * FROM jsonb_array_elements(payload)
  LOOP
    -- Extração e sanitização dos campos
    BEGIN
      v_item_id := (v_item_record->>'inventoryItemId')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'ID do item de inventário inválido no payload: %', v_item_record->>'inventoryItemId';
    END IF;

    v_quantity := (v_item_record->>'quantity')::INTEGER;
    v_type     := lower(trim(COALESCE(v_item_record->>'type', '')));
    v_reason   := COALESCE(v_item_record->>'reason', 'Entrada em massa via Bulk Update');
    
    -- Admin que originou a movimentação
    IF v_item_record->>'adminId' IS NOT NULL AND (v_item_record->>'adminId') <> '' THEN
      BEGIN
        v_admin_id := (v_item_record->>'adminId')::UUID;
      EXCEPTION WHEN OTHERS THEN
        v_admin_id := v_current_user;
      END;
    ELSE
      v_admin_id := v_current_user;
    END IF;

    -- Validações de integridade estrita
    IF v_item_id IS NULL THEN
      RAISE EXCEPTION 'O campo inventoryItemId é obrigatório para todos os itens do lote.';
    END IF;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Quantidade inválida para o item %: % (deve ser um inteiro positivo).', v_item_id, v_quantity;
    END IF;

    IF v_type NOT IN ('in', 'out', 'adjustment') THEN
      RAISE EXCEPTION 'Tipo de movimentação inválido ("%") para o item %. Tipos permitidos: "in", "out", "adjustment".', v_type, v_item_id;
    END IF;

    -- 4. Obter saldo atual e travar a linha para escrita (Pessimistic Lock)
    SELECT "currentStock", "minStock", "productId"
    INTO v_curr_stock, v_min_stock, v_prod_id
    FROM public.inventory_items
    WHERE id = v_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
      -- Fallback para tabela de produtos caso seja produto direto
      SELECT "stockCount", 5, id
      INTO v_curr_stock, v_min_stock, v_prod_id
      FROM public.products
      WHERE id = v_item_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Item de inventário com ID % não foi encontrado.', v_item_id;
      END IF;
    END IF;

    -- 5. Calcular novo saldo de acordo com o tipo
    IF v_type = 'in' THEN
      v_new_stock := v_curr_stock + v_quantity;
    ELSIF v_type = 'out' THEN
      IF v_curr_stock < v_quantity THEN
        RAISE EXCEPTION 'Estoque insuficiente para o item % (Saldo atual: %, Saída solicitada: %). Operação cancelada.',
          v_item_id, v_curr_stock, v_quantity;
      END IF;
      v_new_stock := v_curr_stock - v_quantity;
    ELSIF v_type = 'adjustment' THEN
      v_new_stock := v_quantity;
    END IF;

    -- 6. Calcular novo status TomatoPHP
    IF v_new_stock <= 0 THEN
      v_new_status := 'out_of_stock';
    ELSIF v_new_stock <= COALESCE(v_min_stock, 5) THEN
      v_new_status := 'low_stock';
    ELSE
      v_new_status := 'in_stock';
    END IF;

    -- 7. Inserir registro de auditoria na tabela stock_movements
    INSERT INTO public.stock_movements (
      "inventoryItemId",
      type,
      quantity,
      reason,
      "createdBy",
      "createdAt"
    ) VALUES (
      v_item_id,
      v_type,
      v_quantity,
      v_reason,
      v_admin_id,
      timezone('utc'::text, now())
    );

    -- 8. Atualizar registro em inventory_items
    UPDATE public.inventory_items
    SET
      "currentStock" = v_new_stock,
      status         = v_new_status,
      "lastUpdated"  = timezone('utc'::text, now())
    WHERE id = v_item_id;

    -- 9. Sincronizar catálogo principal na tabela products
    UPDATE public.products
    SET
      "stockCount" = v_new_stock,
      "inStock"    = (v_new_stock > 0)
    WHERE id = COALESCE(v_prod_id, v_item_id);

    v_processed_count := v_processed_count + 1;
  END LOOP;

  -- 10. Retornar resultado da transação com total de registros afetados
  RETURN jsonb_build_object(
    'success', true,
    'processed_count', v_processed_count,
    'timestamp', timezone('utc'::text, now())
  );
END;
$$;

-- Permissões de execução
GRANT EXECUTE ON FUNCTION public.process_bulk_stock_movements(JSONB) TO authenticated;

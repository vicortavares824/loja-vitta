import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layers, Plus, Trash2, Clipboard, CheckCircle2, AlertCircle,
  Loader2, ArrowUpRight, ArrowDownRight,
  Check, X, FileSpreadsheet
} from 'lucide-react';
import type {
  InventoryItem,
  BulkStockMovementItem,
  BulkUpdateRow,
  BulkUpdateResult
} from '../../types/inventory';
import { inventoryService } from '../../services/inventoryService';
import { observability } from '../../services/observability';

interface BulkInventoryPanelProps {
  onSuccess?: () => void;
}

export const BulkInventoryPanel: React.FC<BulkInventoryPanelProps> = ({ onSuccess }) => {
  // Lista de itens cadastrados no inventário para seleção rápida
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // Linhas da folha de cálculo (DataGrid)
  const [rows, setRows] = useState<BulkUpdateRow[]>([]);
  
  // Modal de colar do Excel / Google Sheets
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Ações em massa globais
  const [globalReason, setGlobalReason] = useState('Entrada de Estoque - Compra Fornecedor');
  const [globalType, setGlobalType] = useState<'in' | 'out' | 'adjustment'>('in');

  // Estado de submissão da transação atômica
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string;
  } | null>(null);

  // Carregar itens de inventário para alimentar o DataGrid
  const loadInventory = useCallback(async () => {
    setLoadingItems(true);
    try {
      const items = await inventoryService.getInventoryItems('all');
      setInventoryItems(items);

      // Inicializar com 3 linhas vazias se a planilha estiver vazia
      if (rows.length === 0 && items.length > 0) {
        const initialRows: BulkUpdateRow[] = items.slice(0, 3).map((item, idx) => ({
          id: `row-${Date.now()}-${idx}`,
          inventoryItemId: String(item.id),
          productName: item.productName,
          sku: item.sku,
          size: item.sizes?.[0] || 'M',
          color: item.color || 'Preto',
          currentStock: item.currentStock,
          quantity: 10,
          type: 'in',
          reason: 'Entrada de Estoque - Lote Inicial'
        }));
        setRows(initialRows);
      }
    } catch (err: any) {
      observability.captureException(err, { action: 'BulkInventoryPanel.loadInventory' });
      setFeedback({
        type: 'error',
        message: 'Falha ao carregar itens de inventário para a planilha.'
      });
    } finally {
      setLoadingItems(false);
    }
  }, [rows.length]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Mapa rápido de busca por ID e SKU para agilizar seleção
  const itemsMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    inventoryItems.forEach((item) => {
      map.set(String(item.id), item);
      if (item.sku) map.set(item.sku.toUpperCase(), item);
    });
    return map;
  }, [inventoryItems]);

  // Adicionar uma nova linha na folha de cálculo
  const handleAddRow = () => {
    const defaultItem = inventoryItems[0];
    const newRow: BulkUpdateRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      inventoryItemId: defaultItem ? String(defaultItem.id) : '',
      productName: defaultItem ? defaultItem.productName : '',
      sku: defaultItem ? defaultItem.sku : '',
      size: defaultItem?.sizes?.[0] || 'M',
      color: defaultItem?.color || 'Preto',
      currentStock: defaultItem ? defaultItem.currentStock : 0,
      quantity: 5,
      type: globalType,
      reason: globalReason
    };
    setRows((prev) => [...prev, newRow]);
  };

  // Remover uma linha
  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Limpar todas as linhas
  const handleClearAll = () => {
    if (rows.length > 0 && confirm('Deseja realmente limpar todas as linhas da folha de cálculo?')) {
      setRows([]);
      setFeedback(null);
    }
  };

  // Alteração de item selecionado em uma linha
  const handleItemSelect = (rowId: string, selectedItemId: string) => {
    const selectedItem = itemsMap.get(selectedItemId);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          inventoryItemId: selectedItemId,
          productName: selectedItem ? selectedItem.productName : '',
          sku: selectedItem ? selectedItem.sku : '',
          size: selectedItem?.sizes?.[0] || 'M',
          color: selectedItem?.color || 'Preto',
          currentStock: selectedItem ? selectedItem.currentStock : 0
        };
      })
    );
  };

  // Alteração de campo individual de uma linha
  const handleRowChange = (rowId: string, field: keyof BulkUpdateRow, value: any) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return { ...row, [field]: value };
      })
    );
  };

  // Aplicar motivo global a todas as linhas
  const handleApplyGlobalReason = () => {
    if (!globalReason.trim()) return;
    setRows((prev) => prev.map((r) => ({ ...r, reason: globalReason.trim() })));
  };

  // Aplicar tipo global a todas as linhas
  const handleApplyGlobalType = (type: 'in' | 'out' | 'adjustment') => {
    setGlobalType(type);
    setRows((prev) => prev.map((r) => ({ ...r, type })));
  };

  // Processar texto colado do Excel ou Google Sheets (TSV / CSV)
  const handleProcessPastedData = () => {
    setPasteError(null);
    if (!pastedText.trim()) {
      setPasteError('Cole os dados no campo de texto para continuar.');
      return;
    }

    const lines = pastedText.trim().split(/\r?\n/);
    const parsedRows: BulkUpdateRow[] = [];
    const unmatchedSkus: string[] = [];

    lines.forEach((line, index) => {
      // Separar por tabulação (Excel/Sheets) ou vírgula
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length === 0 || !parts[0].trim()) return;

      const rawIdentifier = parts[0].trim();
      const rawQty = parts[1] ? parseInt(parts[1].trim(), 10) : 1;
      const rawType = parts[2] ? parts[2].trim().toLowerCase() : globalType;
      const rawReason = parts[3] ? parts[3].trim() : globalReason;

      // Buscar item por ID ou SKU
      const matched = itemsMap.get(rawIdentifier) || itemsMap.get(rawIdentifier.toUpperCase());

      if (matched) {
        parsedRows.push({
          id: `paste-row-${Date.now()}-${index}`,
          inventoryItemId: String(matched.id),
          productName: matched.productName,
          sku: matched.sku,
          size: matched.sizes?.[0] || 'M',
          color: matched.color || 'Preto',
          currentStock: matched.currentStock,
          quantity: isNaN(rawQty) || rawQty <= 0 ? 1 : rawQty,
          type: (['in', 'out', 'adjustment'].includes(rawType) ? rawType : 'in') as any,
          reason: rawReason || 'Importação rápida em massa'
        });
      } else {
        unmatchedSkus.push(rawIdentifier);
      }
    });

    if (parsedRows.length === 0) {
      setPasteError('Nenhum item correspondente foi encontrado com base nos SKUs/IDs colados.');
      return;
    }

    setRows((prev) => [...prev, ...parsedRows]);
    setIsPasteModalOpen(false);
    setPastedText('');

    if (unmatchedSkus.length > 0) {
      setFeedback({
        type: 'error',
        message: `${parsedRows.length} linhas adicionadas. ${unmatchedSkus.length} SKU(s) não foram encontrados no inventário.`,
        details: `Itens não localizados: ${unmatchedSkus.slice(0, 5).join(', ')}${unmatchedSkus.length > 5 ? '...' : ''}`
      });
    } else {
      setFeedback({
        type: 'success',
        message: `${parsedRows.length} linhas importadas com sucesso da planilha!`
      });
    }
  };

  // Calcular novo saldo projetado para uma linha
  const calculateProjectedStock = (current: number, qty: number, type: 'in' | 'out' | 'adjustment') => {
    const safeQty = Math.max(0, Number(qty) || 0);
    if (type === 'in') return current + safeQty;
    if (type === 'out') return Math.max(0, current - safeQty);
    if (type === 'adjustment') return safeQty;
    return current;
  };

  // Submeter lote atômico ao Supabase via RPC
  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    // Validações no frontend antes de enviar à RPC
    if (rows.length === 0) {
      setFeedback({
        type: 'error',
        message: 'A folha de cálculo está vazia. Adicione ao menos uma movimentação.'
      });
      return;
    }

    const invalidRow = rows.find((r) => !r.inventoryItemId || r.quantity <= 0);
    if (invalidRow) {
      setFeedback({
        type: 'error',
        message: 'Existem linhas com produto não selecionado ou quantidade menor/igual a zero.',
        details: `Verifique a linha com SKU: "${invalidRow.sku || 'Sem SKU'}"`
      });
      return;
    }

    // Alerta de estoque negativo em caso de saída
    const negativeStockRow = rows.find(
      (r) => r.type === 'out' && r.currentStock < r.quantity
    );
    if (negativeStockRow) {
      setFeedback({
        type: 'error',
        message: 'Estoque insuficiente detectado para uma das saídas.',
        details: `Produto "${negativeStockRow.productName}" possui saldo ${negativeStockRow.currentStock}, mas a saída solicitada é de ${negativeStockRow.quantity}.`
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload: BulkStockMovementItem[] = rows.map((r) => ({
        inventoryItemId: r.inventoryItemId,
        quantity: Math.floor(Number(r.quantity)),
        type: r.type,
        reason: r.reason.trim() || 'Entrada em massa via painel administrativo'
      }));

      // Invocação da transação atômica
      const result: BulkUpdateResult = await inventoryService.processBulkUpdate(payload);

      setFeedback({
        type: 'success',
        message: `Transação Atômica concluída com sucesso! ${result.processed_count} itens de inventário atualizados e movimentações auditadas.`,
        details: `Timestamp: ${result.timestamp || new Date().toLocaleTimeString()}`
      });

      // Recarregar os dados para atualizar os saldos
      await loadInventory();

      // Limpar ou notificar pai se desejado
      if (onSuccess) onSuccess();
    } catch (err: any) {
      observability.captureException(err, {
        action: 'BulkInventoryPanel.handleSubmitBatch',
        totalRows: rows.length
      });
      setFeedback({
        type: 'error',
        message: 'Falha na Transação Atômica: todo o lote sofreu rollback.',
        details: err?.message || 'Erro desconhecido ao processar a função RPC no Supabase.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="bulk-inventory-panel">
      {/* HEADER / INTRODUÇÃO */}
      <div className="bg-zinc-950/80 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-gray-300 tracking-wider uppercase">
              <Layers className="w-3.5 h-3.5 text-white" />
              <span>Entrada em Massa & Transação Atômica</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              Folha de Cálculo de Inventário
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
              Atualize dezenas de itens simultaneamente em uma única transação atômica protegida por rollback.
              Cole dados do Excel ou preencha a grade abaixo.
            </p>
          </div>

          {/* AÇÕES PRINCIPAIS DO TOPO */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPasteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all shadow-sm"
              data-testid="bulk-paste-btn"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Colar da Planilha (Excel / Sheets)</span>
            </button>

            <button
              type="button"
              onClick={handleAddRow}
              disabled={loadingItems}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-black hover:bg-gray-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50"
              data-testid="bulk-add-row-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Linha</span>
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              disabled={rows.length === 0}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/10 transition-colors disabled:opacity-30"
              title="Limpar todas as linhas"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BARRA DE APLICAÇÃO GLOBAL */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">
              Tipo Padrão do Lote
            </label>
            <div className="flex rounded-xl bg-black/40 border border-white/10 p-1">
              <button
                type="button"
                onClick={() => handleApplyGlobalType('in')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                  globalType === 'in'
                    ? 'bg-emerald-500 text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                + Entrada
              </button>
              <button
                type="button"
                onClick={() => handleApplyGlobalType('out')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                  globalType === 'out'
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                - Saída
              </button>
              <button
                type="button"
                onClick={() => handleApplyGlobalType('adjustment')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                  globalType === 'adjustment'
                    ? 'bg-blue-500 text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                = Ajuste
              </button>
            </div>
          </div>

          <div className="md:col-span-2 flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">
                Motivo / Justificativa Padrão
              </label>
              <input
                type="text"
                value={globalReason}
                onChange={(e) => setGlobalReason(e.target.value)}
                placeholder="Ex: Compra NF-e #8812, Ajuste Balanço..."
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyGlobalReason}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors border border-white/10 flex-shrink-0"
              title="Aplica este motivo em todas as linhas da tabela"
            >
              Replicar Motivo
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-start gap-3 backdrop-blur-md transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
          data-testid="bulk-feedback-banner"
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-bold text-sm">{feedback.message}</p>
            {feedback.details && <p className="opacity-90 font-mono text-[11px]">{feedback.details}</p>}
          </div>
        </div>
      )}

      {/* TABELA DATAGRID */}
      <form onSubmit={handleSubmitBatch} className="space-y-4">
        <div className="bg-zinc-950/70 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/[0.04] border-b border-white/10 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[240px]">Produto / SKU *</th>
                  <th className="py-3 px-3 min-w-[100px]">Grade (Tam/Cor)</th>
                  <th className="py-3 px-3 text-center min-w-[90px]">Estoque Atual</th>
                  <th className="py-3 px-3 min-w-[120px]">Tipo *</th>
                  <th className="py-3 px-3 min-w-[100px]">Qtd *</th>
                  <th className="py-3 px-3 text-center min-w-[100px]">Novo Saldo</th>
                  <th className="py-3 px-4 min-w-[220px]">Motivo / Referência</th>
                  <th className="py-3 px-3 w-12 text-center">Remover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileSpreadsheet className="w-8 h-8 text-gray-600" />
                        <p className="text-sm font-semibold">Nenhuma movimentação inserida.</p>
                        <p className="text-xs text-gray-500">
                          Clique em &quot;Nova Linha&quot; ou use &quot;Colar da Planilha&quot; para iniciar.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => {
                    const projected = calculateProjectedStock(row.currentStock, row.quantity, row.type);
                    const isInvalid = !row.inventoryItemId || row.quantity <= 0;
                    const isDangerousOut = row.type === 'out' && row.currentStock < row.quantity;

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors hover:bg-white/[0.02] ${
                          isDangerousOut
                            ? 'bg-red-500/[0.06] border-red-500/20'
                            : isInvalid
                            ? 'bg-amber-500/[0.03]'
                            : ''
                        }`}
                        data-testid={`bulk-row-${index}`}
                      >
                        {/* Índice */}
                        <td className="py-3 px-4 text-center font-mono text-gray-500 text-[11px]">
                          {index + 1}
                        </td>

                        {/* Seletor de Produto */}
                        <td className="py-3 px-4">
                          <select
                            value={row.inventoryItemId}
                            onChange={(e) => handleItemSelect(row.id, e.target.value)}
                            className="w-full bg-black/50 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white font-medium"
                            data-testid={`bulk-item-select-${index}`}
                          >
                            <option value="" disabled>
                              Selecione um item...
                            </option>
                            {inventoryItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.productName} ({item.sku}) - Atual: {item.currentStock}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Tamanho e Cor */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 text-gray-300">
                            <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px] font-bold">
                              {row.size}
                            </span>
                            <span className="text-[11px] text-gray-400 truncate max-w-[80px]">
                              {row.color}
                            </span>
                          </div>
                        </td>

                        {/* Saldo Atual */}
                        <td className="py-3 px-3 text-center font-mono text-gray-300 text-xs">
                          {row.currentStock}
                        </td>

                        {/* Tipo de Movimentação */}
                        <td className="py-3 px-3">
                          <select
                            value={row.type}
                            onChange={(e) =>
                              handleRowChange(row.id, 'type', e.target.value as any)
                            }
                            className={`w-full rounded-xl px-2 py-1.5 text-xs font-bold border focus:outline-none ${
                              row.type === 'in'
                                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                                : row.type === 'out'
                                ? 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                                : 'bg-blue-950/40 border-blue-500/30 text-blue-400'
                            }`}
                            data-testid={`bulk-type-select-${index}`}
                          >
                            <option value="in">+ Entrada</option>
                            <option value="out">- Saída</option>
                            <option value="adjustment">= Ajuste Físico</option>
                          </select>
                        </td>

                        {/* Quantidade */}
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) =>
                              handleRowChange(row.id, 'quantity', parseInt(e.target.value, 10) || 0)
                            }
                            className="w-full bg-black/50 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-white"
                            data-testid={`bulk-qty-input-${index}`}
                          />
                        </td>

                        {/* Novo Saldo Projetado */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 font-mono font-bold">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-xs ${
                                isDangerousOut
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : projected <= 5
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {projected}
                            </span>
                            {row.type === 'in' && (
                              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            {row.type === 'out' && (
                              <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </div>
                        </td>

                        {/* Motivo */}
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={row.reason}
                            onChange={(e) => handleRowChange(row.id, 'reason', e.target.value)}
                            placeholder="Motivo da movimentação..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-white/30"
                            data-testid={`bulk-reason-input-${index}`}
                          />
                        </td>

                        {/* Ação Remover */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="text-gray-500 hover:text-red-400 p-1 rounded-lg transition-colors"
                            data-testid={`bulk-remove-row-${index}`}
                            title="Remover linha"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* RODAPÉ DA FOLHA / RESUMO & SUBMISSÃO */}
          <div className="p-4 sm:p-6 bg-white/[0.02] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-xs text-gray-400">
              <div>
                <span>Total de Linhas: </span>
                <strong className="text-white font-mono">{rows.length}</strong>
              </div>
              <div>
                <span>Unidades a Movimentar: </span>
                <strong className="text-white font-mono">
                  {rows.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="submit"
                disabled={submitting || rows.length === 0}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-white hover:bg-gray-200 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="bulk-submit-btn"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processando Transação Atômica...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Executar Atualização Atômica ({rows.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* MODAL: COLAR DA PLANILHA (TSV / CSV) */}
      {isPasteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          data-testid="bulk-paste-modal"
        >
          <div className="bg-zinc-950 border border-white/20 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-black uppercase text-white">
                  Colar da Planilha (Excel / Google Sheets)
                </h3>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-300">
                Copie as linhas da sua folha de cálculo e cole diretamente abaixo. O sistema aceita dados separados por <strong>Tabulação</strong> (padrão de Ctrl+C do Excel) ou <strong>Vírgula</strong>:
              </p>
              <div className="bg-black/60 border border-white/10 p-3 rounded-xl font-mono text-[11px] text-gray-400">
                <code>SKU [Tab] Quantidade [Tab] Tipo (in/out/adjustment) [Tab] Motivo</code>
                <div className="text-gray-500 mt-1">Exemplo: BLAZER-NOIR &nbsp;&nbsp;&nbsp;&nbsp; 15 &nbsp;&nbsp;&nbsp;&nbsp; in &nbsp;&nbsp;&nbsp;&nbsp; Reposição Semanal</div>
              </div>

              {pasteError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold">
                  {pasteError}
                </div>
              )}

              <textarea
                rows={8}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Cole os dados aqui..."
                className="w-full bg-black/50 border border-white/20 rounded-2xl p-4 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-white resize-none"
                data-testid="bulk-paste-textarea"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProcessPastedData}
                className="px-6 py-2.5 rounded-xl bg-white text-black hover:bg-gray-200 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md"
                data-testid="bulk-paste-confirm-btn"
              >
                <Clipboard className="w-4 h-4" />
                <span>Importar Linhas</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, AlertTriangle, RefreshCw, Layers,
  ArrowUpRight, Package, Image as ImageIcon, ShieldAlert
} from 'lucide-react';
import type { InventoryAbcItem } from '../../../types/inventory';
import { inventoryService } from '../../../services/inventoryService';
import { observability } from '../../../services/observability';

interface AbcCurveWidgetProps {
  onSelectItem?: (itemId: string) => void;
  className?: string;
}

export const AbcCurveWidget: React.FC<AbcCurveWidgetProps> = ({ onSelectItem, className = '' }) => {
  const [items, setItems] = useState<InventoryAbcItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const abcData = await inventoryService.getAbcCurve();
      // Filtrar produtos Curva A com estoque baixo ou esgotado
      const criticalAItems = abcData
        .filter((item) => item.classification === 'A' && (item.status === 'low_stock' || item.status === 'out_of_stock' || item.current_stock <= item.min_stock))
        .slice(0, 5);

      setItems(criticalAItems);
    } catch (err: any) {
      observability.captureException(err, { action: 'AbcCurveWidget.loadData' });
      setError('Falha ao carregar métricas da Curva ABC.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div
      className={`bg-zinc-950/80 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col justify-between ${className}`}
      data-testid="abc-curve-widget"
    >
      {/* Glow ambiente sutil */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/[0.04] rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400 tracking-wider uppercase">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            <span>Curva A • Alto Volume (90d)</span>
          </div>
          <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
            <span>Produtos A em Risco</span>
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono">
              {items.length}
            </span>
          </h3>
          <p className="text-[11px] text-gray-400 leading-tight">
            Top 5 itens responsáveis pelo maior giro com estoque em nível de alerta.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-40"
          title="Recarregar Curva ABC"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Conteúdo / Lista */}
      <div className="flex-1 space-y-2.5 relative z-10">
        {loading ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded-2xl bg-white/[0.03] animate-pulse border border-white/5"
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center flex flex-col items-center justify-center gap-1">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <span>{error}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20 text-center flex flex-col items-center justify-center gap-2 my-2">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-emerald-400">Estoque dos Itens &quot;A&quot; Seguro!</p>
            <p className="text-[11px] text-gray-400 max-w-xs">
              Nenhum produto de alta rotação (Curva A) está atualmente com estoque abaixo da margem de segurança.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.inventory_item_id}
              onClick={() => onSelectItem?.(item.inventory_item_id)}
              className="group p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3 cursor-pointer"
              data-testid={`abc-item-${item.sku}`}
            >
              {/* Miniatura & Info do Produto */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-black/60 border border-white/15 flex-shrink-0 flex items-center justify-center">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="absolute top-0.5 left-0.5 bg-amber-500 text-black text-[8px] font-black uppercase px-1 rounded">
                    A
                  </span>
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                    {item.product_name}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span className="font-mono">{item.sku}</span>
                    <span>•</span>
                    <span className="text-amber-400/90 font-semibold">
                      {item.total_out_qty} saídas ({item.percentage}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Saldo vs Mínimo & Badge */}
              <div className="flex items-center gap-2 flex-shrink-0 text-right">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-mono font-bold text-red-400 flex items-center justify-end gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span>{item.current_stock} un</span>
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono">
                    mín: {item.min_stock} un
                  </div>
                </div>

                <div className="w-6 h-6 rounded-lg bg-white/5 group-hover:bg-amber-500/20 flex items-center justify-center text-gray-400 group-hover:text-amber-300 transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer / Nota Metodológica */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 relative z-10">
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3 text-gray-600" />
          Regra de Pareto 80/20 (90 dias)
        </span>
        <span className="font-mono text-gray-400">Prioridade Máxima</span>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, AlertCircle, RefreshCw, Flame,
  ArrowRight, Image as ImageIcon, ShieldCheck
} from 'lucide-react';
import type { StockoutPredictionItem } from '../../../types/inventory';
import { inventoryService } from '../../../services/inventoryService';
import { observability } from '../../../services/observability';

interface StockoutAlertWidgetProps {
  onRestockClick?: (itemId: string) => void;
  className?: string;
}

export const StockoutAlertWidget: React.FC<StockoutAlertWidgetProps> = ({ onRestockClick, className = '' }) => {
  const [predictions, setPredictions] = useState<StockoutPredictionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getStockoutPredictions();
      setPredictions(data.slice(0, 6)); // Top 6 itens mais urgentes
    } catch (err: any) {
      observability.captureException(err, { action: 'StockoutAlertWidget.loadData' });
      setError('Falha ao calcular previsões de ruptura de estoque.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Função para retornar estilo do badge com base nos dias restantes
  const getUrgencyBadge = (days: number, stock: number) => {
    if (stock <= 0) {
      return {
        label: 'Esgotado',
        className: 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse font-black'
      };
    }
    if (days <= 3) {
      return {
        label: `Esgota em ${Math.max(1, Math.round(days))}d`,
        className: 'bg-red-500/20 text-red-300 border-red-500/30 font-bold'
      };
    }
    if (days <= 7) {
      return {
        label: `Esgota em ${Math.round(days)}d`,
        className: 'bg-orange-500/20 text-orange-300 border-orange-500/30 font-bold'
      };
    }
    return {
      label: `Esgota em ${Math.round(days)}d`,
      className: 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold'
    };
  };

  return (
    <div
      className={`bg-zinc-950/80 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col justify-between ${className}`}
      data-testid="stockout-alert-widget"
    >
      {/* Glow ambiente vermelho/laranja */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/[0.04] rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400 tracking-wider uppercase">
            <Flame className="w-3 h-3 text-red-400" />
            <span>Previsão de Ruptura (&lt; 15 dias)</span>
          </div>
          <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
            <span>Risco Iminente de Esgotamento</span>
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono">
              {predictions.length}
            </span>
          </h3>
          <p className="text-[11px] text-gray-400 leading-tight">
            Baseado no ritmo diário de saídas nos últimos 30 dias.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-40"
          title="Recalcular previsões"
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
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span>{error}</span>
          </div>
        ) : predictions.length === 0 ? (
          <div className="p-6 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20 text-center flex flex-col items-center justify-center gap-2 my-2">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-emerald-400">Ruptura Zero Prevista!</p>
            <p className="text-[11px] text-gray-400 max-w-xs">
              Nenhuma peça corre risco de esgotar nos próximos 15 dias com a velocidade de vendas atual.
            </p>
          </div>
        ) : (
          predictions.map((item) => {
            const urgency = getUrgencyBadge(item.days_until_stockout, item.current_stock);

            return (
              <div
                key={item.inventory_item_id}
                onClick={() => onRestockClick?.(item.inventory_item_id)}
                className="group p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 hover:border-red-500/40 transition-all flex items-center justify-between gap-3 cursor-pointer"
                data-testid={`stockout-item-${item.sku}`}
              >
                {/* Imagem & Produto */}
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
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-red-300 transition-colors">
                      {item.product_name}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="font-mono">{item.sku}</span>
                      <span>•</span>
                      <span className="text-gray-300">
                        {item.avg_daily_sales} un/dia
                      </span>
                    </div>
                  </div>
                </div>

                {/* Badge de Esgotamento & Ação */}
                <div className="flex items-center gap-2.5 flex-shrink-0 text-right">
                  <div className="space-y-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] ${urgency.className}`}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      {urgency.label}
                    </span>
                    <div className="text-[10px] font-mono text-gray-400">
                      Saldo: <strong className="text-white">{item.current_stock}</strong>
                    </div>
                  </div>

                  <div className="w-6 h-6 rounded-lg bg-white/5 group-hover:bg-red-500/20 flex items-center justify-center text-gray-400 group-hover:text-red-300 transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 relative z-10">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-600" />
          Velocidade de Venda = Saídas / 30 dias
        </span>
        <span className="font-mono text-gray-400">Ação Recomendada: Reposição</span>
      </div>
    </div>
  );
};

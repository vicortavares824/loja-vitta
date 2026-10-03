import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AbcCurveWidget } from '../../components/admin/widgets/AbcCurveWidget';
import { StockoutAlertWidget } from '../../components/admin/widgets/StockoutAlertWidget';
import { inventoryService } from '../../services/inventoryService';

const mockAbcItems = [
  {
    inventory_item_id: 'item-1',
    product_name: 'Blazer Alfaiataria Noir',
    sku: 'BLAZER-NOIR',
    current_stock: 3,
    min_stock: 5,
    status: 'low_stock' as const,
    total_out_qty: 120,
    percentage: 35.5,
    cum_percentage: 35.5,
    classification: 'A' as const,
    category_name: 'Alfaiataria'
  },
  {
    inventory_item_id: 'item-2',
    product_name: 'Calça Alfaiataria Slim',
    sku: 'CAL-ALF-002',
    current_stock: 12,
    min_stock: 5,
    status: 'in_stock' as const,
    total_out_qty: 80,
    percentage: 25.0,
    cum_percentage: 60.5,
    classification: 'A' as const,
    category_name: 'Alfaiataria'
  },
  {
    inventory_item_id: 'item-3',
    product_name: 'Camiseta Algodão Egípcio',
    sku: 'TEE-EGIPTO',
    current_stock: 1,
    min_stock: 5,
    status: 'low_stock' as const,
    total_out_qty: 15,
    percentage: 5.0,
    cum_percentage: 95.0,
    classification: 'C' as const,
    category_name: 'Básicos'
  }
];

const mockStockoutItems = [
  {
    inventory_item_id: 'item-1',
    product_name: 'Blazer Alfaiataria Noir',
    sku: 'BLAZER-NOIR',
    current_stock: 3,
    min_stock: 5,
    avg_daily_sales: 1.5,
    days_until_stockout: 2.0,
    status: 'low_stock' as const,
    category_name: 'Alfaiataria'
  },
  {
    inventory_item_id: 'item-4',
    product_name: 'Camisa Linho Off-White',
    sku: 'CAM-LINHO',
    current_stock: 6,
    min_stock: 5,
    avg_daily_sales: 1.0,
    days_until_stockout: 6.0,
    status: 'in_stock' as const,
    category_name: 'Camisas'
  }
];

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getAbcCurve: vi.fn(() => Promise.resolve(mockAbcItems)),
    getStockoutPredictions: vi.fn(() => Promise.resolve(mockStockoutItems)),
  },
}));

vi.mock('../../services/observability', () => ({
  observability: {
    captureException: vi.fn(),
    trackEvent: vi.fn(),
  },
}));

describe('Inventory Analytics Widgets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (inventoryService.getAbcCurve as any).mockResolvedValue(mockAbcItems);
    (inventoryService.getStockoutPredictions as any).mockResolvedValue(mockStockoutItems);
  });

  describe('AbcCurveWidget', () => {
    it('should render top 5 Curva A products with low stock', async () => {
      const mockSelect = vi.fn();
      render(<AbcCurveWidget onSelectItem={mockSelect} />);

      await waitFor(() => {
        expect(screen.getByText('Curva A • Alto Volume (90d)')).toBeInTheDocument();
        expect(screen.getByText('Blazer Alfaiataria Noir')).toBeInTheDocument();
        expect(screen.getByText('BLAZER-NOIR')).toBeInTheDocument();
        expect(screen.getByText(/120 saídas/)).toBeInTheDocument();
      });

      // Item 2 has high stock (12 > min 5), so it should NOT be in the low stock list
      expect(screen.queryByText('Calça Alfaiataria Slim')).not.toBeInTheDocument();

      // Click on item
      fireEvent.click(screen.getByTestId('abc-item-BLAZER-NOIR'));
      expect(mockSelect).toHaveBeenCalledWith('item-1');
    });

    it('should display positive message when no Curva A items are low on stock', async () => {
      (inventoryService.getAbcCurve as any).mockResolvedValueOnce([
        { ...mockAbcItems[0], current_stock: 50, status: 'in_stock' },
      ]);

      render(<AbcCurveWidget />);

      await waitFor(() => {
        expect(screen.getByText('Estoque dos Itens "A" Seguro!')).toBeInTheDocument();
      });
    });
  });

  describe('StockoutAlertWidget', () => {
    it('should render items with predicted stockout in under 15 days', async () => {
      const mockRestock = vi.fn();
      render(<StockoutAlertWidget onRestockClick={mockRestock} />);

      await waitFor(() => {
        expect(screen.getByText('Previsão de Ruptura (< 15 dias)')).toBeInTheDocument();
        expect(screen.getByText('Blazer Alfaiataria Noir')).toBeInTheDocument();
        expect(screen.getByText('Esgota em 2d')).toBeInTheDocument();
        expect(screen.getByText('1.5 un/dia')).toBeInTheDocument();
        expect(screen.getByText('Esgota em 6d')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('stockout-item-BLAZER-NOIR'));
      expect(mockRestock).toHaveBeenCalledWith('item-1');
    });

    it('should display zero rupture message when no items have stockout risk', async () => {
      (inventoryService.getStockoutPredictions as any).mockResolvedValueOnce([]);

      render(<StockoutAlertWidget />);

      await waitFor(() => {
        expect(screen.getByText('Ruptura Zero Prevista!')).toBeInTheDocument();
      });
    });
  });
});

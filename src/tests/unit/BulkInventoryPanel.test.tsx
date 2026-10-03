import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkInventoryPanel } from '../../components/admin/BulkInventoryPanel';
import { inventoryService } from '../../services/inventoryService';

const mockInventoryItems = [
  {
    id: 'item-uuid-1',
    productId: 'prod-1',
    productName: 'Blazer Alfaiataria Noir',
    sku: 'BLAZER-NOIR',
    categoryId: 'tailoring',
    categoryName: 'Alfaiataria',
    currentStock: 10,
    minStock: 5,
    maxStock: 50,
    unit: 'un',
    status: 'in_stock' as const,
    lastUpdated: '2026-10-01T00:00:00Z',
    sizes: ['P', 'M', 'G'],
    color: 'Preto'
  },
  {
    id: 'item-uuid-2',
    productId: 'prod-2',
    productName: 'Camiseta Algodão Egípcio',
    sku: 'TEE-EGIPTO',
    categoryId: 'basics',
    categoryName: 'Básicos',
    currentStock: 2,
    minStock: 5,
    maxStock: 50,
    unit: 'un',
    status: 'low_stock' as const,
    lastUpdated: '2026-10-01T00:00:00Z',
    sizes: ['M', 'GG'],
    color: 'Branco'
  }
];

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getInventoryItems: vi.fn(() => Promise.resolve(mockInventoryItems)),
    processBulkUpdate: vi.fn(() =>
      Promise.resolve({ success: true, processed_count: 2, timestamp: '2026-10-02T22:00:00Z' })
    ),
  },
}));

vi.mock('../../services/observability', () => ({
  observability: {
    captureException: vi.fn(),
    trackEvent: vi.fn(),
  },
}));

describe('BulkInventoryPanel (DataGrid Atomic Bulk Movement Component)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (inventoryService.getInventoryItems as any).mockResolvedValue(mockInventoryItems);
    (inventoryService.processBulkUpdate as any).mockResolvedValue({
      success: true,
      processed_count: 2,
      timestamp: '2026-10-02T22:00:00Z'
    });
  });

  it('should render the Bulk Inventory DataGrid with luxury dark theme', async () => {
    render(<BulkInventoryPanel />);

    await waitFor(() => {
      expect(screen.getByText('Folha de Cálculo de Inventário')).toBeInTheDocument();
      expect(screen.getByTestId('bulk-add-row-btn')).toBeInTheDocument();
      expect(screen.getByTestId('bulk-paste-btn')).toBeInTheDocument();
      expect(screen.getByTestId('bulk-submit-btn')).toBeInTheDocument();
    });
  });

  it('should allow adding new rows to the spreadsheet grid', async () => {
    render(<BulkInventoryPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('bulk-row-0')).toBeInTheDocument();
    });

    const initialRowsCount = screen.getAllByTestId(/bulk-row-/).length;

    // Click on '+ Nova Linha'
    fireEvent.click(screen.getByTestId('bulk-add-row-btn'));

    expect(screen.getAllByTestId(/bulk-row-/).length).toBe(initialRowsCount + 1);
  });

  it('should support pasting data from spreadsheet (TSV) and parse into rows', async () => {
    render(<BulkInventoryPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('bulk-paste-btn')).toBeInTheDocument();
    });

    // Open paste modal
    fireEvent.click(screen.getByTestId('bulk-paste-btn'));

    expect(screen.getByTestId('bulk-paste-modal')).toBeInTheDocument();
    expect(screen.getByText('Colar da Planilha (Excel / Google Sheets)')).toBeInTheDocument();

    // Paste TSV lines: SKU \t Qty \t Type \t Reason
    const tsvData = 'BLAZER-NOIR\t25\tin\tCompra Lote Fornecedor\nTEE-EGIPTO\t10\tin\tReposição Semanal';
    fireEvent.change(screen.getByTestId('bulk-paste-textarea'), {
      target: { value: tsvData }
    });

    fireEvent.click(screen.getByTestId('bulk-paste-confirm-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('bulk-paste-modal')).not.toBeInTheDocument();
      expect(screen.getByText(/linhas importadas com sucesso da planilha/)).toBeInTheDocument();
    });
  });

  it('should submit atomic bulk update via inventoryService.processBulkUpdate on form submission', async () => {
    const mockOnSuccess = vi.fn();
    render(<BulkInventoryPanel onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.getByTestId('bulk-submit-btn')).toBeInTheDocument();
    });

    // Submit batch
    fireEvent.click(screen.getByTestId('bulk-submit-btn'));

    await waitFor(() => {
      expect(inventoryService.processBulkUpdate).toHaveBeenCalled();
      expect(screen.getByText(/Transação Atômica concluída com sucesso/)).toBeInTheDocument();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should display error details when atomic transaction rolls back', async () => {
    (inventoryService.processBulkUpdate as any).mockRejectedValueOnce(
      new Error('Estoque insuficiente para o item BLAZER-NOIR.')
    );

    render(<BulkInventoryPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('bulk-submit-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('bulk-submit-btn'));

    await waitFor(() => {
      expect(screen.getByText(/Falha na Transação Atômica: todo o lote sofreu rollback/)).toBeInTheDocument();
      expect(screen.getByText('Estoque insuficiente para o item BLAZER-NOIR.')).toBeInTheDocument();
    });
  });
});

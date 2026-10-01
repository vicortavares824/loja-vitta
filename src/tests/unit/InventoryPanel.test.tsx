import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InventoryPanel } from '../../components/admin/InventoryPanel';
import { inventoryService } from '../../services/inventoryService';
import { uploadImage } from '../../services/cloudinary';

// Mock useCart hook
const mockShowToast = vi.fn();
vi.mock('../../context/CartContext', () => ({
  useCart: () => ({
    showToast: mockShowToast,
    formatPrice: (p: number) => `R$ ${p.toFixed(2)}`,
  }),
}));

const mockCategories = [
  { id: 'tailoring', name: 'Alfaiataria', slug: 'tailoring', itemCount: 4 },
  { id: 'basics', name: 'Básicos', slug: 'basics', itemCount: 6 },
];

const mockItems = [
  {
    id: 'prod-1',
    productId: 'prod-1',
    productName: 'Blazer Alfaiataria Noir',
    sku: 'BLAZER-NOIR',
    categoryId: 'tailoring',
    categoryName: 'Alfaiataria',
    currentStock: 10,
    minStock: 5,
    maxStock: 50,
    unit: 'un',
    imageUrl: 'https://example.com/blazer.jpg',
    status: 'in_stock' as const,
    lastUpdated: '2026-09-27T00:00:00Z',
  },
  {
    id: 'prod-2',
    productId: 'prod-2',
    productName: 'Camiseta Algodão Egípcio',
    sku: 'TEE-EGIPTO',
    categoryId: 'basics',
    categoryName: 'Básicos',
    currentStock: 2,
    minStock: 5,
    maxStock: 50,
    unit: 'un',
    imageUrl: '',
    status: 'low_stock' as const,
    lastUpdated: '2026-09-27T00:00:00Z',
  },
];

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getInventoryCategories: vi.fn(() => Promise.resolve(mockCategories)),
    getInventoryItems: vi.fn(() => Promise.resolve(mockItems)),
    updateStock: vi.fn(() => Promise.resolve(true)),
    saveInventoryItem: vi.fn((item: any) =>
      Promise.resolve({ id: item.id || 'new-item-id', ...item })
    ),
    deleteInventoryItem: vi.fn(() => Promise.resolve(true)),
    createInventoryCategory: vi.fn((name: string) =>
      Promise.resolve({ id: 'new-cat', name, slug: 'new-cat', itemCount: 0 })
    ),
    updateProductImage: vi.fn(() => Promise.resolve(true)),
  },
}));

vi.mock('../../services/cloudinary', () => ({
  uploadImage: vi.fn(() =>
    Promise.resolve({
      url: 'https://cloudinary.com/uploaded.jpg',
      publicId: 'uploaded_id',
      width: 800,
      height: 600,
      format: 'jpg',
    })
  ),
}));

describe('InventoryPanel (Tomato Inventory Admin Component)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (inventoryService.getInventoryCategories as any).mockResolvedValue(mockCategories);
    (inventoryService.getInventoryItems as any).mockResolvedValue(mockItems);
    (inventoryService.updateStock as any).mockResolvedValue(true);
    (inventoryService.updateProductImage as any).mockResolvedValue(true);
    (uploadImage as any).mockResolvedValue({
      url: 'https://cloudinary.com/uploaded.jpg',
      publicId: 'uploaded_id',
      width: 800,
      height: 600,
      format: 'jpg',
    });
  });

  it('should render inventory panel with KPI metrics and products table', async () => {
    render(<InventoryPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('inventory-panel')).toBeInTheDocument();
      expect(screen.getByText('Blazer Alfaiataria Noir')).toBeInTheDocument();
      expect(screen.getByText('Camiseta Algodão Egípcio')).toBeInTheDocument();
    });

    // Check KPIs
    expect(screen.getByText('Total de Peças')).toBeInTheDocument();
    expect(screen.getByText('Unidades em Estoque')).toBeInTheDocument();
    expect(screen.getByText('Estoque Crítico')).toBeInTheDocument();
  });

  it('should render category selection dropdown and filter pills', async () => {
    render(<InventoryPanel />);

    await waitFor(() => {
      const select = screen.getByTestId('category-select');
      expect(select).toBeInTheDocument();
      expect(screen.getByText(/Alfaiataria \(4 itens\)/)).toBeInTheDocument();
      expect(screen.getByText(/Básicos \(6 itens\)/)).toBeInTheDocument();
    });

    const pills = screen.getByTestId('category-pills');
    expect(pills).toBeInTheDocument();
  });

  it('should open create inventory item modal and submit new item', async () => {
    render(<InventoryPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('create-inventory-item-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('create-inventory-item-btn'));

    expect(screen.getByText('Novo Item no Inventário')).toBeInTheDocument();

    const nameInput = screen.getByTestId('item-modal-name-input');
    fireEvent.change(nameInput, { target: { value: 'Suéter Gola Alta' } });

    fireEvent.click(screen.getByTestId('item-modal-save-btn'));

    await waitFor(() => {
      expect(inventoryService.saveInventoryItem).toHaveBeenCalledWith(
        expect.objectContaining({
          productName: 'Suéter Gola Alta',
        })
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('cadastrado no inventário!'),
        'success'
      );
    });
  });

  it('should trigger stock increment and decrement actions', async () => {
    render(<InventoryPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('stock-in-prod-1')).toBeInTheDocument();
    });

    // Click increment (+)
    fireEvent.click(screen.getByTestId('stock-in-prod-1'));

    await waitFor(() => {
      expect(inventoryService.updateStock).toHaveBeenCalledWith(
        expect.objectContaining({
          inventoryItemId: 'prod-1',
          type: 'in',
          quantity: 1,
        })
      );
    });

    // Click decrement (-)
    fireEvent.click(screen.getByTestId('stock-out-prod-1'));
    await waitFor(() => {
      expect(inventoryService.updateStock).toHaveBeenCalledWith(
        expect.objectContaining({
          inventoryItemId: 'prod-1',
          type: 'out',
          quantity: 1,
        })
      );
    });
  });

  it('should open image verification modal when a valid image is selected', async () => {
    render(<InventoryPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('upload-image-btn-prod-1')).toBeInTheDocument();
    });

    // Trigger image select
    fireEvent.click(screen.getByTestId('upload-image-btn-prod-1'));

    const fileInput = screen.getByTestId('image-upload-input');
    const validFile = new File(['mock content'], 'new-blazer.jpg', { type: 'image/jpeg' });
    Object.defineProperty(validFile, 'size', { value: 1024 * 300 });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Verification modal should display file verification details
    await waitFor(() => {
      expect(screen.getByTestId('image-verification-modal')).toBeInTheDocument();
      expect(screen.getByText('Verificar Envio de Imagem')).toBeInTheDocument();
      expect(screen.getByText('new-blazer.jpg')).toBeInTheDocument();
      expect(screen.getByText('300 KB (Limite: 10 MB)')).toBeInTheDocument();
      expect(screen.getByText('Arquivo validado e apto para sincronização')).toBeInTheDocument();
    });

    // Confirm upload
    fireEvent.click(screen.getByTestId('confirm-upload-btn'));

    await waitFor(() => {
      expect(uploadImage).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Upload verificado'),
        'success'
      );
    });
  });
});

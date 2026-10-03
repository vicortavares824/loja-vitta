import { describe, it, expect, vi, beforeEach } from 'vitest';

// Chainable mock builder for Supabase
function createMockQuery(returnData: any[] = [], returnError: any = null) {
  const query: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData[0] || null, error: returnError }),
    maybeSingle: vi.fn().mockResolvedValue({ data: returnData[0] || null, error: returnError }),
    or: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    then: (resolve: Function) => resolve({ data: returnData, error: returnError }),
  };
  return query;
}

const mockQuery = createMockQuery();

const mockSupabase = {
  from: vi.fn(() => mockQuery),
  rpc: vi.fn().mockResolvedValue({ data: { success: true, processed_count: 2 }, error: null }),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'admin-123' } } }, error: null }),
  },
};

vi.mock('../../config/supabase', () => ({
  supabase: mockSupabase,
}));

vi.mock('../../services/observability', () => ({
  observability: {
    captureException: vi.fn(),
    trackEvent: vi.fn(),
  },
}));

describe('InventoryService - Tomato Inventory Supabase Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockImplementation(() => mockQuery);
    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.insert.mockReturnValue(mockQuery);
    mockQuery.update.mockReturnValue(mockQuery);
    mockQuery.delete.mockReturnValue(mockQuery);
    mockQuery.eq.mockReturnValue(mockQuery);
    mockQuery.order.mockReturnValue(mockQuery);
    mockQuery.or.mockReturnValue(mockQuery);
    mockQuery.upsert.mockReturnValue(mockQuery);
    mockQuery.single.mockResolvedValue({ data: null, error: null });
    mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockQuery.then = (resolve: Function) => resolve({ data: [], error: null });
  });

  describe('getInventoryItems', () => {
    it('should query inventory_items table first', async () => {
      const mockItems = [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Camisa Linho',
          sku: 'LINHO-01',
          categoryId: 'camisas',
          categoryName: 'Camisas',
          currentStock: 12,
          minStock: 5,
          maxStock: 50,
          unit: 'un',
          status: 'in_stock'
        }
      ];

      mockQuery.then = (resolve: Function) => resolve({ data: mockItems, error: null });

      const { inventoryService } = await import('../../services/inventoryService');
      const items = await inventoryService.getInventoryItems();

      expect(mockSupabase.from).toHaveBeenCalledWith('inventory_items');
      expect(items.length).toBe(1);
      expect(items[0].productName).toBe('Camisa Linho');
      expect(items[0].status).toBe('in_stock');
    });

    it('should apply category filter when specified', async () => {
      const { inventoryService } = await import('../../services/inventoryService');
      await inventoryService.getInventoryItems('tailoring');
      expect(mockQuery.or).toHaveBeenCalled();
    });

    it('should fallback to products table when inventory_items returns empty or error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        const q: any = {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };

        if (table === 'inventory_items') {
          q.then = (resolve: Function) => resolve({ data: [], error: null });
        } else {
          q.then = (resolve: Function) => resolve({
            data: [
              {
                id: 'prod-fallback',
                name: 'Blazer Alfaiataria',
                slug: 'blazer-noir',
                category: 'Alfaiataria',
                categorySlug: 'tailoring',
                stockCount: 8,
                images: ['https://example.com/blazer.jpg']
              }
            ],
            error: null
          });
        }
        return q;
      });

      const { inventoryService } = await import('../../services/inventoryService');
      const items = await inventoryService.getInventoryItems();

      expect(items.length).toBe(1);
      expect(items[0].productName).toBe('Blazer Alfaiataria');
      expect(items[0].currentStock).toBe(8);
      expect(items[0].imageUrl).toBe('https://example.com/blazer.jpg');
    });
  });

  describe('getInventoryCategories & createInventoryCategory', () => {
    it('should fetch categories from categories table', async () => {
      const mockCats = [
        { id: 'cat-1', name: 'Alfaiataria', slug: 'tailoring', itemCount: 4 },
        { id: 'cat-2', name: 'Camisas', slug: 'shirts', itemCount: 6 }
      ];
      mockQuery.then = (resolve: Function) => resolve({ data: mockCats, error: null });

      const { inventoryService } = await import('../../services/inventoryService');
      const cats = await inventoryService.getInventoryCategories();

      expect(mockSupabase.from).toHaveBeenCalledWith('categories');
      expect(cats.length).toBe(2);
      expect(cats[0].name).toBe('Alfaiataria');
    });

    it('should create new category with slugified name', async () => {
      const newCat = {
        id: 'new-id',
        name: 'Casacos de Inverno',
        slug: 'casacos-de-inverno',
        itemCount: 0
      };
      mockQuery.single.mockResolvedValueOnce({ data: newCat, error: null });

      const { inventoryService } = await import('../../services/inventoryService');
      const result = await inventoryService.createInventoryCategory('Casacos de Inverno', 'Peças quentes');

      expect(mockSupabase.from).toHaveBeenCalledWith('categories');
      expect(mockQuery.insert).toHaveBeenCalled();
      expect(result.name).toBe('Casacos de Inverno');
      expect(result.slug).toBe('casacos-de-inverno');
    });
  });

  describe('updateStock', () => {
    it('should increment stock on "in" movement', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { id: 'item-1', currentStock: 10 },
        error: null
      });

      const { inventoryService } = await import('../../services/inventoryService');
      const success = await inventoryService.updateStock({
        inventoryItemId: 'item-1',
        quantity: 5,
        type: 'in',
        reason: 'Reposição fornecedor'
      });

      expect(success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ stockCount: 15, inStock: true })
      );
    });

    it('should decrement stock on "out" movement without dropping below zero', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { id: 'item-1', currentStock: 3 },
        error: null
      });

      const { inventoryService } = await import('../../services/inventoryService');
      const success = await inventoryService.updateStock({
        inventoryItemId: 'item-1',
        quantity: 10,
        type: 'out',
        reason: 'Venda de balcão'
      });

      expect(success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ stockCount: 0, inStock: false })
      );
    });

    it('should set absolute value on "adjustment" movement', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { id: 'item-1', currentStock: 20 },
        error: null
      });

      const { inventoryService } = await import('../../services/inventoryService');
      const success = await inventoryService.updateStock({
        inventoryItemId: 'item-1',
        quantity: 42,
        type: 'adjustment',
        reason: 'Inventário físico anual'
      });

      expect(success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ stockCount: 42, inStock: true })
      );
    });
  });

  describe('updateProductImage', () => {
    it('should update product image and prepend new URL to existing images', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { images: ['https://example.com/old.jpg'] },
        error: null
      });

      const { inventoryService } = await import('../../services/inventoryService');
      const success = await inventoryService.updateProductImage('item-1', 'https://example.com/new.jpg');

      expect(success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          images: ['https://example.com/new.jpg', 'https://example.com/old.jpg']
        })
      );
    });
  });

  describe('importInventoryItems', () => {
    it('should import items sequentially and handle JSON string or array', async () => {
      // Mock category lookup (not found) and product insert
      mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
      mockQuery.single.mockResolvedValue({ data: { id: 'new-prod-123' }, error: null });

      const { inventoryService } = await import('../../services/inventoryService');
      const payload = [
        {
          name: 'Camiseta Algodão Pima',
          sku: 'CAM-PIMA-001',
          category: 'Camisetas',
          price: 149.90,
          stock: 30,
          sizes: ['P', 'M', 'G'],
          colors: [{ name: 'Preto', hex: '#000000' }],
        }
      ];

      const result = await inventoryService.importInventoryItems(payload);

      expect(result.total).toBe(1);
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.items[0].sku).toBe('CAM-PIMA-001');
      expect(result.items[0].status).toBe('success');
    });

    it('should accept JSON string format', async () => {
      mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
      mockQuery.single.mockResolvedValue({ data: { id: 'new-prod-456' }, error: null });

      const { inventoryService } = await import('../../services/inventoryService');
      const jsonString = JSON.stringify([
        {
          name: 'Calça Alfaiataria Slim',
          sku: 'CAL-ALF-002',
          category: 'Calças',
          price: 299.90,
          stock: 15
        }
      ]);

      const result = await inventoryService.importInventoryItems(jsonString);

      expect(result.total).toBe(1);
      expect(result.successCount).toBe(1);
      expect(result.items[0].sku).toBe('CAL-ALF-002');
    });
  });

  describe('processBulkUpdate', () => {
    it('should invoke process_bulk_stock_movements RPC with sanitized payload and track event', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { success: true, processed_count: 2 },
        error: null,
      });

      const { inventoryService } = await import('../../services/inventoryService');
      const { observability } = await import('../../services/observability');

      const movements = [
        {
          inventoryItemId: 'item-uuid-1',
          quantity: 10,
          type: 'in' as const,
          reason: 'Entrada fornecedor',
        },
        {
          inventoryItemId: 'item-uuid-2',
          quantity: 3,
          type: 'out' as const,
          reason: 'Venda externa',
        },
      ];

      const result = await inventoryService.processBulkUpdate(movements);

      expect(result.success).toBe(true);
      expect(result.processed_count).toBe(2);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('process_bulk_stock_movements', {
        payload: expect.arrayContaining([
          expect.objectContaining({
            inventoryItemId: 'item-uuid-1',
            quantity: 10,
            type: 'in',
            adminId: 'admin-123',
          }),
          expect.objectContaining({
            inventoryItemId: 'item-uuid-2',
            quantity: 3,
            type: 'out',
            adminId: 'admin-123',
          }),
        ]),
      });

      expect(observability.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'bulk_inventory_updated',
          properties: expect.objectContaining({ count: 2, processedCount: 2 }),
        })
      );
    });

    it('should throw and capture exception if RPC fails', async () => {
      const mockError = new Error('Estoque insuficiente para o item');
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

      const { inventoryService } = await import('../../services/inventoryService');
      const { observability } = await import('../../services/observability');

      await expect(
        inventoryService.processBulkUpdate([
          {
            inventoryItemId: 'item-uuid-1',
            quantity: 9999,
            type: 'out',
            reason: 'Saída excessiva',
          },
        ])
      ).rejects.toThrow();

      expect(observability.captureException).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({ action: 'processBulkUpdate', count: 1 })
      );
    });

    it('should return immediately with zero count if empty payload is passed', async () => {
      const { inventoryService } = await import('../../services/inventoryService');
      const result = await inventoryService.processBulkUpdate([]);
      expect(result.success).toBe(true);
      expect(result.processed_count).toBe(0);
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });
  });
});


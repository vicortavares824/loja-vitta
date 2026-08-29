import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase - build chainable query mock
function createMockQuery(returnData: any[] = [], returnError: any = null) {
  const query: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData[0] || null, error: returnError }),
    or: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    then: (resolve: Function) => resolve({ data: returnData, error: returnError }),
  };
  return query;
}

const mockQuery = createMockQuery();

const mockSupabase = {
  from: vi.fn(() => mockQuery),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  },
};

vi.mock('../../config/supabase', () => ({
  supabase: mockSupabase,
}));

describe('TomatoAPI - Supabase Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock chain
    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.insert.mockReturnValue(mockQuery);
    mockQuery.update.mockReturnValue(mockQuery);
    mockQuery.delete.mockReturnValue(mockQuery);
    mockQuery.eq.mockReturnValue(mockQuery);
    mockQuery.order.mockReturnValue(mockQuery);
    mockQuery.or.mockReturnValue(mockQuery);
    mockQuery.upsert.mockReturnValue(mockQuery);
    mockQuery.single.mockResolvedValue({ data: null, error: null });
  });

  describe('getProducts', () => {
    it('should call Supabase with correct table', async () => {
      const { tomatoApi } = await import('../../services/tomatoApi');
      await tomatoApi.getProducts();
      expect(mockSupabase.from).toHaveBeenCalledWith('products');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
    });

    it('should filter by categorySlug', async () => {
      const { tomatoApi } = await import('../../services/tomatoApi');
      await tomatoApi.getProducts('tailoring');
      expect(mockQuery.eq).toHaveBeenCalledWith('categorySlug', 'tailoring');
    });

    it('should sanitize search input (remove PostgREST filter chars)', async () => {
      const { tomatoApi } = await import('../../services/tomatoApi');
      await tomatoApi.getProducts(undefined, "test%(.)injection");
      expect(mockQuery.or).toHaveBeenCalled();
      // The or() call contains: name.ilike.%<search>%,description.ilike.%<search>%
      // The search part should have special chars stripped
      const orCall = mockQuery.or.mock.calls[0][0];
      const searchPart = orCall.split('name.ilike.%')[1]?.split('%')[0];
      expect(searchPart).not.toContain('(');
      expect(searchPart).not.toContain(')');
      expect(searchPart).not.toContain('.');
    });

    it('should sort by price ascending', async () => {
      const { tomatoApi } = await import('../../services/tomatoApi');
      await tomatoApi.getProducts(undefined, undefined, 'price-asc');
      expect(mockQuery.order).toHaveBeenCalledWith('price', { ascending: true });
    });

    it('should sort by price descending', async () => {
      const { tomatoApi } = await import('../../services/tomatoApi');
      await tomatoApi.getProducts(undefined, undefined, 'price-desc');
      expect(mockQuery.order).toHaveBeenCalledWith('price', { ascending: false });
    });

    it('should sort by rating', async () => {
      const { tomatoApi } = await import('../../services/tomatoApi');
      await tomatoApi.getProducts(undefined, undefined, 'rating');
      expect(mockQuery.order).toHaveBeenCalledWith('rating', { ascending: false });
    });

    it('should truncate search to 100 chars max', async () => {
      const { tomatoApi } = await import('../../services/tomatoApi');
      const longSearch = 'a'.repeat(200);
      await tomatoApi.getProducts(undefined, longSearch);
      const orCall = mockQuery.or.mock.calls[0][0];
      // The search part in the or() should be max 100 chars
      // Format: name.ilike.%<search>%,description.ilike.%<search>%
      const searchPart = orCall.split('name.ilike.%')[1]?.split('%')[0];
      expect(searchPart.length).toBeLessThanOrEqual(100);
    });

    it('should skip empty search after sanitization', async () => {
      const { tomatoApi } = await import('../../services/tomatoApi');
      await tomatoApi.getProducts(undefined, '%%%');
      expect(mockQuery.or).not.toHaveBeenCalled();
    });
  });

  describe('deleteProduct', () => {
    it('should delete product by ID', async () => {
      const { tomatoApi } = await import('../../services/tomatoApi');
      await tomatoApi.deleteProduct('uuid-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('products');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'uuid-123');
    });
  });

  describe('getCategories', () => {
    it('should fetch categories from Supabase', async () => {
      const { tomatoApi } = await import('../../services/tomatoApi');
      await tomatoApi.getCategories();
      expect(mockSupabase.from).toHaveBeenCalledWith('categories');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
    });
  });

  describe('getCoupons', () => {
    it('should fetch coupons from Supabase', async () => {
      const { tomatoApi } = await import('../../services/tomatoApi');
      await tomatoApi.getCoupons();
      expect(mockSupabase.from).toHaveBeenCalledWith('coupons');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
    });
  });

  describe('applyCoupon', () => {
    it('should look up coupon by code', async () => {
      const { tomatoApi } = await import('../../services/tomatoApi');
      await tomatoApi.applyCoupon('VITTA15');
      expect(mockSupabase.from).toHaveBeenCalledWith('coupons');
      expect(mockQuery.eq).toHaveBeenCalledWith('code', 'VITTA15');
      expect(mockQuery.single).toHaveBeenCalled();
    });

    it('should uppercase coupon code', async () => {
      const { tomatoApi } = await import('../../services/tomatoApi');
      await tomatoApi.applyCoupon('vitta15');
      expect(mockQuery.eq).toHaveBeenCalledWith('code', 'VITTA15');
    });
  });

  describe('getOrders', () => {
    it('should require authentication', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
      const { tomatoApi } = await import('../../services/tomatoApi');
      await expect(tomatoApi.getOrders()).rejects.toThrow('Não autenticado');
    });

    it('should fetch orders when authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { user: { id: 'user-1' }, access_token: 'token' } },
        error: null,
      });
      const { tomatoApi } = await import('../../services/tomatoApi');
      await tomatoApi.getOrders();
      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status', async () => {
      const { tomatoApi } = await import('../../services/tomatoApi');
      await tomatoApi.updateOrderStatus('order-123', 'shipped');
      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'shipped' });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'order-123');
    });
  });

  describe('createOrder', () => {
    it('should require authentication', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
      const { tomatoApi } = await import('../../services/tomatoApi');
      await expect(tomatoApi.createOrder({})).rejects.toThrow('Não autenticado');
    });
  });
});

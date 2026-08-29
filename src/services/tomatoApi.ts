import type { Product, Category, Coupon, Order } from '../types/ecommerce';
import { supabase } from '../config/supabase';

// Empty defaults - all data comes from Supabase
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_CATEGORIES: Category[] = [];
export const INITIAL_COUPONS: Record<string, Coupon> = {};
export const INITIAL_ORDERS: Order[] = [];

export const tomatoApi = {
  // --- PRODUTOS ---
  async getProducts(categorySlug?: string, search?: string, sort?: string): Promise<Product[]> {
    let query = supabase.from('products').select('*');
    
    if (categorySlug && categorySlug !== 'all') {
      query = query.eq('categorySlug', categorySlug);
    }
    
    if (search) {
      const sanitizedSearch = search
        .replace(/[%(),.]/g, '')
        .trim()
        .slice(0, 100);
      
      if (sanitizedSearch) {
        query = query.or(`name.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`);
      }
    }
    
    if (sort === 'price-asc') query = query.order('price', { ascending: true });
    else if (sort === 'price-desc') query = query.order('price', { ascending: false });
    else if (sort === 'rating') query = query.order('rating', { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map((row: any) => ({
      ...row,
      images: Array.isArray(row.images) ? row.images : [],
      colors: Array.isArray(row.colors) ? row.colors : [],
      sizes: Array.isArray(row.sizes) ? row.sizes : [],
      details: Array.isArray(row.details) ? row.details : [],
    })) as Product[];
  },

  async getProductById(id: string | number): Promise<Product | null> {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Product | null;
  },

  async saveProduct(product: Partial<Product>): Promise<Product> {
    if (product.id) {
      const { data, error } = await supabase.from('products').update(product).eq('id', product.id).select().single();
      if (error) throw error;
      return data as Product;
    } else {
      const { id, ...newProductData } = product as any;
      const insertData = {
        ...newProductData,
        slug: product.name ? product.name.toLowerCase().replace(/\s+/g, '-') : `prod-${Date.now()}`
      };
      const { data, error } = await supabase.from('products').insert([insertData]).select().single();
      if (error) throw error;
      return data as Product;
    }
  },

  async deleteProduct(id: string | number): Promise<boolean> {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // --- CATEGORIAS ---
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) throw error;
    return (data || []) as Category[];
  },

  async saveCategory(cat: Partial<Category>): Promise<Category> {
    if (cat.id) {
      const { data, error } = await supabase.from('categories').update(cat).eq('id', cat.id).select().single();
      if (error) throw error;
      return data as Category;
    } else {
      const { id, ...newCatData } = cat as any;
      const insertData = {
        ...newCatData,
        slug: cat.name ? cat.name.toLowerCase().replace(/\s+/g, '-') : `cat-${Date.now()}`
      };
      const { data, error } = await supabase.from('categories').insert([insertData]).select().single();
      if (error) throw error;
      return data as Category;
    }
  },

  // --- PEDIDOS (ORDERS) ---
  async getOrders(): Promise<Order[]> {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) throw new Error('Não autenticado');
    
    const { data, error } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
    if (error) throw error;
    
    return (data || []).map((o: any) => ({
      id: o.id,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      items: o.order_items || [],
      totalAmount: o.totalAmount,
      status: o.status,
      createdAt: o.created_at,
      paymentMethod: o.paymentMethod,
      shippingAddress: o.shippingAddress,
      couponUsed: o.couponUsed
    })) as Order[];
  },

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<boolean> {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) throw error;
    return true;
  },

  async createOrder(orderPayload: Partial<Order>): Promise<{ success: boolean; orderId: string }> {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) throw new Error('Não autenticado');

    const { data: newOrder, error: orderError } = await supabase.from('orders').insert([{
      user_id: sessionData.session.user.id,
      customerName: orderPayload.customerName || 'Cliente Vitta',
      customerEmail: orderPayload.customerEmail || sessionData.session.user.email || '',
      totalAmount: orderPayload.totalAmount || 0,
      status: 'processing',
      paymentMethod: orderPayload.paymentMethod || 'Cartão de Crédito',
      shippingAddress: orderPayload.shippingAddress || 'Endereço Principal',
      couponUsed: orderPayload.couponUsed
    }]).select().single();

    if (orderError) throw orderError;

    if (orderPayload.items && orderPayload.items.length > 0) {
      const itemsToInsert = orderPayload.items.map(item => ({
        order_id: newOrder.id,
        product_id: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
        image: item.image
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;
    }
    
    return { success: true, orderId: newOrder.id };
  },

  // --- CUPONS ---
  async getCoupons(): Promise<Record<string, Coupon>> {
    const { data, error } = await supabase.from('coupons').select('*');
    if (error) throw error;
    
    const coupons: Record<string, Coupon> = {};
    (data || []).forEach((c: any) => {
      coupons[c.code.toUpperCase()] = c as Coupon;
    });
    return coupons;
  },

  async applyCoupon(code: string): Promise<Coupon | null> {
    const cleanCode = code.trim().toUpperCase();
    const { data, error } = await supabase.from('coupons').select('*').eq('code', cleanCode).single();
    if (error || !data) return null;
    return data as Coupon;
  },

  async saveCoupon(coupon: Coupon): Promise<Coupon> {
    const { data, error } = await supabase.from('coupons').upsert({
      code: coupon.code.toUpperCase(),
      discountPercentage: coupon.discountPercentage,
      discountFixed: coupon.discountFixed,
      minAmount: coupon.minAmount,
      description: coupon.description
    }).select().single();
    
    if (error) throw error;
    return data as Coupon;
  },

  async deleteCoupon(code: string): Promise<boolean> {
    const { error } = await supabase.from('coupons').delete().eq('code', code.toUpperCase());
    if (error) throw error;
    return true;
  }
};

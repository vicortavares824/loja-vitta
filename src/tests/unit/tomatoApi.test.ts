import { describe, it, expect, beforeEach } from 'vitest';
import { tomatoApi } from '../../services/tomatoApi';

describe('TomatoPHP API Service Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should fetch all products from Tomato API', async () => {
    const products = await tomatoApi.getProducts();
    expect(products.length).toBeGreaterThan(0);
    expect(products[0]).toHaveProperty('id');
    expect(products[0]).toHaveProperty('name');
    expect(products[0]).toHaveProperty('price');
  });

  it('should filter products by categorySlug', async () => {
    const tailoringProducts = await tomatoApi.getProducts('tailoring');
    expect(tailoringProducts.length).toBeGreaterThan(0);
    expect(tailoringProducts.every(p => p.categorySlug === 'tailoring')).toBe(true);
  });

  it('should search products by text query', async () => {
    const searchResults = await tomatoApi.getProducts(undefined, 'blazer');
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults.some(p => p.name.toLowerCase().includes('blazer'))).toBe(true);
  });

  it('should save a new product into the database and retrieve it', async () => {
    const newProd = {
      name: 'Vestido Minimalista Exclusivo',
      category: 'Vestidos',
      categorySlug: 'dresses',
      price: 2100,
      description: 'Vestido de linho puro',
      stockCount: 8
    };

    const saved = await tomatoApi.saveProduct(newProd);
    expect(saved.id).toBeDefined();
    expect(saved.name).toBe(newProd.name);

    const allProducts = await tomatoApi.getProducts();
    expect(allProducts.some(p => p.name === newProd.name)).toBe(true);
  });

  it('should create an order and record in order history', async () => {
    const orderPayload = {
      customerName: 'Mariana Duarte',
      customerEmail: 'mariana@email.com',
      totalAmount: 1890,
      paymentMethod: 'PIX',
      shippingAddress: 'Rua Bela Cintra, 120 - SP',
      items: [
        {
          productId: 'prod-1',
          productName: 'Blazer Alfaiataria',
          price: 1890,
          quantity: 1,
          selectedColor: 'Preto',
          selectedSize: 'M',
          image: ''
        }
      ]
    };

    const result = await tomatoApi.createOrder(orderPayload);
    expect(result.success).toBe(true);
    expect(result.orderId).toBeDefined();

    const orders = await tomatoApi.getOrders();
    expect(orders.some(o => o.id === result.orderId)).toBe(true);
  });
});

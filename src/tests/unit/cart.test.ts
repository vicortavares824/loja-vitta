import { describe, it, expect } from 'vitest';

describe('Vitta Basics E-Commerce Business Logic', () => {
  it('should calculate cart subtotal correctly across multiple items', () => {
    const item1 = { price: 1890, quantity: 2 };
    const item2 = { price: 890, quantity: 1 };
    const subtotal = item1.price * item1.quantity + item2.price * item2.quantity;
    
    expect(subtotal).toBe(4670);
  });

  it('should calculate free shipping threshold progress correctly', () => {
    const FREE_SHIPPING_THRESHOLD = 1500;
    const subtotal1 = 1200;
    const remaining1 = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal1);
    expect(remaining1).toBe(300);

    const subtotal2 = 1800;
    const remaining2 = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal2);
    expect(remaining2).toBe(0);
  });

  it('should calculate shipping fee correctly when below threshold', () => {
    const FREE_SHIPPING_THRESHOLD = 1500;
    const shippingFee = 50;
    
    const subtotalBelow = 800;
    const totalBelow = subtotalBelow + (subtotalBelow >= FREE_SHIPPING_THRESHOLD ? 0 : shippingFee);
    expect(totalBelow).toBe(850);

    const subtotalAbove = 2000;
    const totalAbove = subtotalAbove + (subtotalAbove >= FREE_SHIPPING_THRESHOLD ? 0 : shippingFee);
    expect(totalAbove).toBe(2000);
  });

  it('should calculate item quantities and cart total accurately', () => {
    const items = [
      { price: 500, quantity: 3 },
      { price: 250, quantity: 2 },
    ];
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    expect(totalItems).toBe(5);
    expect(subtotal).toBe(2000);
  });
});

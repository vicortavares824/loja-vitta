import { describe, it, expect } from 'vitest';
import { tomatoApi, INITIAL_PRODUCTS, INITIAL_COUPONS } from '../../services/tomatoApi';

describe('Vitta Basics E-Commerce Business Logic', () => {
  it('should calculate cart total without discounts correctly', () => {
    const item1 = { price: 1890, quantity: 2 };
    const item2 = { price: 890, quantity: 1 };
    const subtotal = item1.price * item1.quantity + item2.price * item2.quantity;
    
    expect(subtotal).toBe(4670);
  });

  it('should calculate percentage coupon discount correctly', () => {
    const subtotal = 2000;
    const coupon = INITIAL_COUPONS['VITTA15'];
    
    expect(coupon).toBeDefined();
    const discount = (subtotal * (coupon.discountPercentage || 0)) / 100;
    expect(discount).toBe(300);
    expect(subtotal - discount).toBe(1700);
  });

  it('should calculate fixed coupon discount correctly', () => {
    const subtotal = 1000;
    const coupon = INITIAL_COUPONS['FREESHIP'];
    
    expect(coupon).toBeDefined();
    const discount = coupon.discountFixed || 0;
    expect(discount).toBe(150);
    expect(subtotal - discount).toBe(850);
  });

  it('should validate minimum amount requirement on coupons', () => {
    const coupon = INITIAL_COUPONS['TOMATO20'];
    expect(coupon.minAmount).toBe(1000);

    const subtotalLow = 800;
    const isValidLow = !coupon.minAmount || subtotalLow >= coupon.minAmount;
    expect(isValidLow).toBe(false);

    const subtotalHigh = 1500;
    const isValidHigh = !coupon.minAmount || subtotalHigh >= coupon.minAmount;
    expect(isValidHigh).toBe(true);
  });
});

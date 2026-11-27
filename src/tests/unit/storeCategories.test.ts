import { describe, expect, it } from 'vitest';
import type { Category, Product } from '../../types/ecommerce';
import { toStoreCategories } from '../../services/storeCategories';

const category = (slug: string, overrides: Partial<Category> = {}): Category => ({
  id: slug,
  name: slug,
  slug,
  image: `https://stock.example/${slug}.jpg`,
  itemCount: 99,
  description: '',
  ...overrides,
});

const product = (id: string, categorySlug: string, images: string[] = [`/real/${id}.webp`]): Product => ({
  id,
  name: id,
  slug: id,
  price: 10,
  category: categorySlug,
  categorySlug,
  images,
  description: '',
  colors: [],
  sizes: [],
  rating: 0,
  reviewsCount: 0,
  inStock: true,
  stockCount: 1,
});

describe('toStoreCategories', () => {
  it('replaces the stored item count with the real number of products', () => {
    const result = toStoreCategories([category('camisetas')], [product('a', 'camisetas'), product('b', 'camisetas')]);
    expect(result[0].itemCount).toBe(2);
  });

  it('hides categories that have no products', () => {
    const result = toStoreCategories([category('camisetas'), category('casacos')], [product('a', 'camisetas')]);
    expect(result.map((c) => c.slug)).toEqual(['camisetas']);
  });

  it('uses the first real product photo as the category image', () => {
    const result = toStoreCategories([category('camisetas')], [product('a', 'camisetas', []), product('b', 'camisetas')]);
    expect(result[0].image).toBe('/real/b.webp');
  });

  it('keeps the stored image when no product in the category has a photo', () => {
    const result = toStoreCategories([category('camisetas')], [product('a', 'camisetas', [])]);
    expect(result[0].image).toBe('https://stock.example/camisetas.jpg');
  });

  it('does not mutate the input categories', () => {
    const input = [category('camisetas')];
    toStoreCategories(input, [product('a', 'camisetas')]);
    expect(input[0].itemCount).toBe(99);
  });
});

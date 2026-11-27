import type { Category, Product } from '../types/ecommerce';
import { tomatoApi } from './tomatoApi';

/**
 * Categorias como a vitrine deve mostrá-las, a partir dos produtos reais:
 *  - `itemCount` = quantidade real de produtos (o valor gravado no banco é ignorado);
 *  - categorias sem nenhum produto ficam de fora;
 *  - a foto é a do primeiro produto da categoria que tenha foto
 *    (mantém a foto gravada só se nenhum produto tiver).
 * O painel admin continua usando `tomatoApi.getCategories()` sem filtro.
 */
export function toStoreCategories(categories: readonly Category[], products: readonly Product[]): Category[] {
  const bySlug = new Map<string, Product[]>();
  for (const p of products) {
    const list = bySlug.get(p.categorySlug);
    if (list) list.push(p);
    else bySlug.set(p.categorySlug, [p]);
  }

  return categories.flatMap((category) => {
    const items = bySlug.get(category.slug) ?? [];
    if (items.length === 0) return [];
    const photo = items.find((p) => p.images?.[0])?.images[0];
    return [{ ...category, itemCount: items.length, image: photo ?? category.image }];
  });
}

/** Busca categorias e produtos e devolve só as categorias com produtos reais. */
export async function getStoreCategories(): Promise<Category[]> {
  const [categories, products] = await Promise.all([tomatoApi.getCategories(), tomatoApi.getProducts('all')]);
  return toStoreCategories(categories, products);
}

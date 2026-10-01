/**
 * Tomato Inventory Service
 * Integrates with TomatoPHP Inventory Plugin via Supabase.
 * Layer: services — depends only on types, config, observability.
 */

import type {
  InventoryItem,
  InventoryCategory,
  StockMovement,
  StockUpdatePayload
} from '../types/inventory';
import { getInventoryStatus } from '../types/inventory';
import { supabase } from '../config/supabase';
import { observability } from './observability';

export const inventoryService = {
  // --- INVENTORY ITEMS ---
  async getInventoryItems(categoryId?: string | number): Promise<InventoryItem[]> {
    try {
      let query = supabase.from('inventory_items').select('*');

      if (categoryId && categoryId !== 'all') {
        query = query.or(`categoryId.eq.${categoryId},categorySlug.eq.${categoryId}`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((row: any) => ({
          ...row,
          status: getInventoryStatus(Number(row.currentStock) || 0, Number(row.minStock) || 5)
        })) as InventoryItem[];
      }
    } catch {
      // Fallback to products table if inventory_items doesn't exist
    }

    // Fallback: Read from products table
    try {
      let prodQuery = supabase.from('products').select('*');
      if (categoryId && categoryId !== 'all') {
        prodQuery = prodQuery.or(`categorySlug.eq.${categoryId},category.eq.${categoryId}`);
      }

      const { data: prodData, error: prodError } = await prodQuery;
      if (prodError) throw prodError;

      return (prodData || []).map((p: any) => {
        const stock = typeof p.stockCount === 'number' ? p.stockCount : 10;
        const images = Array.isArray(p.images) ? p.images : [];
        return {
          id: p.id,
          productId: p.id,
          productName: p.name,
          sku: (p.slug || `SKU-${p.id}`).toUpperCase(),
          categoryId: p.categorySlug || p.category || 'geral',
          categoryName: p.category || 'Geral',
          currentStock: stock,
          minStock: 5,
          maxStock: 100,
          unit: 'un',
          imageUrl: images[0] || '',
          status: getInventoryStatus(stock, 5),
          lastUpdated: p.created_at || new Date().toISOString()
        } as InventoryItem;
      });
    } catch (err) {
      observability.captureException(err, { action: 'getInventoryItems', categoryId });
      throw err;
    }
  },

  async getInventoryItemById(id: string | number): Promise<InventoryItem | null> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return {
          ...data,
          status: getInventoryStatus(Number(data.currentStock) || 0, Number(data.minStock) || 5)
        } as InventoryItem;
      }
    } catch {
      // Fallback to products
    }

    try {
      const { data: p, error: prodError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (prodError || !p) return null;

      const stock = typeof p.stockCount === 'number' ? p.stockCount : 0;
      const images = Array.isArray(p.images) ? p.images : [];
      return {
        id: p.id,
        productId: p.id,
        productName: p.name,
        sku: (p.slug || `SKU-${p.id}`).toUpperCase(),
        categoryId: p.categorySlug || p.category || 'geral',
        categoryName: p.category || 'Geral',
        currentStock: stock,
        minStock: 5,
        maxStock: 100,
        unit: 'un',
        imageUrl: images[0] || '',
        status: getInventoryStatus(stock, 5),
        lastUpdated: p.created_at || new Date().toISOString()
      };
    } catch (err) {
      observability.captureException(err, { action: 'getInventoryItemById', id });
      return null;
    }
  },

  // --- CATEGORIES ---
  async getInventoryCategories(): Promise<InventoryCategory[]> {
    try {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.slug || row.id,
        name: row.name,
        slug: row.slug,
        itemCount: row.itemCount || 0
      })) as InventoryCategory[];
    } catch (err) {
      observability.captureException(err, { action: 'getInventoryCategories' });
      return [];
    }
  },

  async createInventoryCategory(name: string, description?: string): Promise<InventoryCategory> {
    const slug = name.toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^\w-]/g, '');
    const newCategory = {
      name: name.trim(),
      slug: slug || `cat-${Date.now()}`,
      description: description?.trim() || `Peças e itens da categoria ${name}`,
      image: '',
      itemCount: 0
    };

    const { data, error } = await supabase.from('categories').insert([newCategory]).select().single();
    if (error) {
      observability.captureException(error, { action: 'createInventoryCategory', name });
      throw error;
    }

    observability.trackEvent({
      name: 'inventory_category_created',
      category: 'admin',
      properties: { name, slug }
    });

    return {
      id: data.id || data.slug,
      name: data.name,
      slug: data.slug,
      description: data.description,
      image: data.image,
      itemCount: data.itemCount || 0
    };
  },

  async saveCategory(cat: Partial<InventoryCategory>): Promise<InventoryCategory> {
    const slug = cat.slug || (cat.name ? cat.name.toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^\w-]/g, '') : `cat-${Date.now()}`);
    
    if (cat.id) {
      const { data, error } = await supabase
        .from('categories')
        .update({
          name: cat.name,
          slug,
          description: cat.description || '',
          image: cat.image || '',
        })
        .eq('id', cat.id)
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        image: data.image,
        itemCount: data.itemCount || 0
      };
    } else {
      const insertData = {
        name: cat.name,
        slug,
        description: cat.description || '',
        image: cat.image || '',
        itemCount: 0
      };
      const { data, error } = await supabase.from('categories').insert([insertData]).select().single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        image: data.image,
        itemCount: data.itemCount || 0
      };
    }
  },

  async deleteCategory(id: string | number): Promise<boolean> {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async saveInventoryItem(item: Partial<InventoryItem>): Promise<InventoryItem> {
    const stock = Number(item.currentStock) || 0;
    const min = Number(item.minStock) || 5;
    const max = Number(item.maxStock) || 100;
    const status = getInventoryStatus(stock, min);

    if (item.id) {
      try {
        await supabase
          .from('inventory_items')
          .update({
            productName: item.productName,
            sku: item.sku,
            categoryId: item.categoryId,
            categoryName: item.categoryName,
            currentStock: stock,
            minStock: min,
            maxStock: max,
            unit: item.unit || 'un',
            imageUrl: item.imageUrl || '',
            status,
            lastUpdated: new Date().toISOString()
          })
          .eq('id', item.id);
      } catch {
        // fallback
      }

      await supabase
        .from('products')
        .update({
          name: item.productName,
          category: item.categoryName,
          categorySlug: item.categoryId,
          stockCount: stock,
          inStock: stock > 0,
          images: item.imageUrl ? [item.imageUrl] : undefined
        })
        .eq('id', item.id);

      return {
        ...item,
        currentStock: stock,
        minStock: min,
        maxStock: max,
        status,
        lastUpdated: new Date().toISOString()
      } as InventoryItem;
    } else {
      const newSlug = (item.sku || item.productName || `item-${Date.now()}`).toLowerCase().replace(/[\s_]+/g, '-');
      const { data: newProd, error } = await supabase
        .from('products')
        .insert([{
          name: item.productName || 'Novo Item',
          slug: newSlug,
          price: 99,
          category: item.categoryName || 'Geral',
          categorySlug: item.categoryId || 'geral',
          description: `Peça de vestuário e item de inventário ${item.productName}`,
          stockCount: stock,
          inStock: stock > 0,
          images: item.imageUrl ? [item.imageUrl] : []
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        id: newProd.id,
        productId: newProd.id,
        productName: newProd.name,
        sku: (item.sku || newSlug).toUpperCase(),
        categoryId: newProd.categorySlug,
        categoryName: newProd.category,
        currentStock: stock,
        minStock: min,
        maxStock: max,
        unit: item.unit || 'un',
        imageUrl: newProd.images?.[0] || '',
        status,
        lastUpdated: newProd.created_at || new Date().toISOString()
      };
    }
  },

  async deleteInventoryItem(id: string | number): Promise<boolean> {
    try {
      await supabase.from('inventory_items').delete().eq('id', id);
    } catch {
      // fallback
    }
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // --- STOCK UPDATES ---
  async updateStock(payload: StockUpdatePayload): Promise<boolean> {
    const { inventoryItemId, quantity, type, reason } = payload;

    // First attempt on inventory_items table
    let itemCurrentStock: number | null = null;
    let isInventoryTable = false;

    try {
      const { data: invItem } = await supabase
        .from('inventory_items')
        .select('currentStock')
        .eq('id', inventoryItemId)
        .single();
      if (invItem) {
        itemCurrentStock = Number(invItem.currentStock) || 0;
        isInventoryTable = true;
      }
    } catch {
      // Ignore
    }

    if (!isInventoryTable) {
      // Fallback on products table
      const { data: prodItem, error: prodErr } = await supabase
        .from('products')
        .select('stockCount')
        .eq('id', inventoryItemId)
        .single();

      if (prodErr || !prodItem) {
        observability.captureException(prodErr || new Error('Item não encontrado'), {
          action: 'updateStock',
          inventoryItemId
        });
        throw prodErr || new Error('Item de inventário não encontrado.');
      }
      itemCurrentStock = typeof prodItem.stockCount === 'number' ? prodItem.stockCount : 0;
    }

    // Calculate new stock
    let newStock = itemCurrentStock ?? 0;
    if (type === 'in') {
      newStock += quantity;
    } else if (type === 'out') {
      newStock -= quantity;
      if (newStock < 0) newStock = 0;
    } else {
      newStock = Math.max(0, quantity);
    }

    // Apply update
    if (isInventoryTable) {
      await supabase
        .from('inventory_items')
        .update({
          currentStock: newStock,
          lastUpdated: new Date().toISOString()
        })
        .eq('id', inventoryItemId);
    }

    // Also sync products table stockCount & inStock
    await supabase
      .from('products')
      .update({
        stockCount: newStock,
        inStock: newStock > 0
      })
      .eq('id', inventoryItemId);

    // Record stock movement (safe fire-and-forget)
    try {
      await supabase
        .from('stock_movements')
        .insert([{
          inventoryItemId,
          type,
          quantity,
          reason,
          createdAt: new Date().toISOString()
        }]);
    } catch {
      // Safe fallback if movements table not migrated
    }

    observability.trackEvent({
      name: 'inventory_stock_updated',
      category: 'admin',
      properties: { inventoryItemId, type, quantity, newStock }
    });

    return true;
  },

  // --- STOCK MOVEMENTS ---
  async getStockMovements(inventoryItemId: string | number): Promise<StockMovement[]> {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('inventoryItemId', inventoryItemId)
        .order('createdAt', { ascending: false });

      if (!error && data) {
        return data as StockMovement[];
      }
    } catch {
      // safe fallback
    }
    return [];
  },

  // --- IMAGE UPLOAD & VERIFICATION ---
  async updateProductImage(
    inventoryItemId: string | number,
    imageUrl: string
  ): Promise<boolean> {
    try {
      // Update inventory_items if available
      await supabase
        .from('inventory_items')
        .update({ imageUrl, lastUpdated: new Date().toISOString() })
        .eq('id', inventoryItemId);
    } catch {
      // safe fallback
    }

    // Update products table images array
    try {
      const { data: prod } = await supabase
        .from('products')
        .select('images')
        .eq('id', inventoryItemId)
        .single();

      const existingImages = Array.isArray(prod?.images) ? prod.images : [];
      const updatedImages = [imageUrl, ...existingImages.filter((img: string) => img !== imageUrl)];

      const { error: prodErr } = await supabase
        .from('products')
        .update({ images: updatedImages })
        .eq('id', inventoryItemId);

      if (prodErr) throw prodErr;
    } catch (err) {
      observability.captureException(err, { action: 'updateProductImage', inventoryItemId });
      throw err;
    }

    observability.trackEvent({
      name: 'inventory_image_updated',
      category: 'admin',
      properties: { inventoryItemId, imageUrl }
    });

    return true;
  }
};

/**
 * Tomato Inventory Service
 * Integrates with TomatoPHP Inventory Plugin via Supabase.
 * Layer: services — depends only on types, config, observability.
 */

import type {
  InventoryItem,
  InventoryCategory,
  StockMovement,
  StockUpdatePayload,
  InventoryImportItem,
  InventoryImportResult,
  BulkStockMovementItem,
  BulkUpdateResult,
  InventoryAbcItem,
  StockoutPredictionItem
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
          sizes: Array.isArray(row.sizes) ? row.sizes : (typeof row.sizes === 'string' ? JSON.parse(row.sizes) : ['P', 'M', 'G', 'GG']),
          color: row.color || (row.colors?.[0]?.name) || 'Preto',
          colorHex: row.colorHex || (row.colors?.[0]?.hex) || '#000000',
          colors: Array.isArray(row.colors) ? row.colors : [{ name: row.color || 'Preto', hex: row.colorHex || '#000000' }],
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
        const prodSizes = Array.isArray(p.sizes) ? p.sizes : (typeof p.sizes === 'string' ? JSON.parse(p.sizes) : ['P', 'M', 'G', 'GG']);
        const prodColors = Array.isArray(p.colors) && p.colors.length > 0 ? p.colors : [{ name: 'Preto', hex: '#000000' }];
        const primaryColor = p.color || prodColors[0]?.name || 'Preto';
        const primaryHex = p.colorHex || prodColors[0]?.hex || '#000000';
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
          sizes: prodSizes,
          color: primaryColor,
          colorHex: primaryHex,
          colors: prodColors,
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
          sizes: Array.isArray(data.sizes) ? data.sizes : (typeof data.sizes === 'string' ? JSON.parse(data.sizes) : ['P', 'M', 'G', 'GG']),
          color: data.color || data.colors?.[0]?.name || 'Preto',
          colorHex: data.colorHex || data.colors?.[0]?.hex || '#000000',
          colors: Array.isArray(data.colors) ? data.colors : [{ name: data.color || 'Preto', hex: data.colorHex || '#000000' }],
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
      const prodSizes = Array.isArray(p.sizes) ? p.sizes : (typeof p.sizes === 'string' ? JSON.parse(p.sizes) : ['P', 'M', 'G', 'GG']);
      const prodColors = Array.isArray(p.colors) && p.colors.length > 0 ? p.colors : [{ name: 'Preto', hex: '#000000' }];
      const primaryColor = p.color || prodColors[0]?.name || 'Preto';
      const primaryHex = p.colorHex || prodColors[0]?.hex || '#000000';
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
        sizes: prodSizes,
        color: primaryColor,
        colorHex: primaryHex,
        colors: prodColors,
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
    const itemSizes = Array.isArray(item.sizes) && item.sizes.length > 0 ? item.sizes : ['P', 'M', 'G', 'GG'];
    const itemColor = item.color || item.colors?.[0]?.name || 'Preto';
    const itemColorHex = item.colorHex || item.colors?.[0]?.hex || '#000000';
    const itemColors = Array.isArray(item.colors) && item.colors.length > 0
      ? item.colors
      : [{ name: itemColor, hex: itemColorHex }];

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
            sizes: itemSizes,
            color: itemColor,
            colorHex: itemColorHex,
            colors: itemColors,
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
          images: item.imageUrl ? [item.imageUrl] : undefined,
          sizes: itemSizes,
          colors: itemColors
        })
        .eq('id', item.id);

      return {
        ...item,
        sizes: itemSizes,
        color: itemColor,
        colorHex: itemColorHex,
        colors: itemColors,
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
          images: item.imageUrl ? [item.imageUrl] : [],
          sizes: itemSizes,
          colors: itemColors
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
        sizes: itemSizes,
        color: itemColor,
        colorHex: itemColorHex,
        colors: itemColors,
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

  // --- ATOMIC BULK STOCK MOVEMENTS (RPC) ---
  async processBulkUpdate(movements: BulkStockMovementItem[]): Promise<BulkUpdateResult> {
    if (!Array.isArray(movements) || movements.length === 0) {
      return { success: true, processed_count: 0, message: 'Nenhuma movimentação para processar.' };
    }

    try {
      // Obter ID do admin autenticado para auditoria
      const { data: sessionData } = await supabase.auth.getSession();
      const currentAdminId = sessionData?.session?.user?.id;

      const sanitizedPayload = movements.map((m) => ({
        inventoryItemId: String(m.inventoryItemId),
        quantity: Math.max(1, Math.floor(Number(m.quantity) || 1)),
        type: m.type,
        reason: m.reason?.trim() || 'Entrada em massa via painel administrativo',
        adminId: m.adminId || currentAdminId || null
      }));

      const { data, error } = await supabase.rpc('process_bulk_stock_movements', {
        payload: sanitizedPayload
      });

      if (error) {
        observability.captureException(error, {
          action: 'processBulkUpdate',
          count: movements.length
        });
        throw error;
      }

      observability.trackEvent({
        name: 'bulk_inventory_updated',
        category: 'admin',
        properties: {
          count: movements.length,
          processedCount: data?.processed_count ?? movements.length
        }
      });

      return (data as BulkUpdateResult) || {
        success: true,
        processed_count: movements.length,
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      observability.captureException(err, {
        action: 'processBulkUpdate',
        count: movements.length
      });
      throw err;
    }
  },

  // --- INVENTORY ANALYTICS & INTELLIGENCE (RPCs) ---
  async getAbcCurve(): Promise<InventoryAbcItem[]> {
    try {
      const { data, error } = await supabase.rpc('get_inventory_abc_curve');
      if (!error && Array.isArray(data)) {
        return data as InventoryAbcItem[];
      }
    } catch {
      // safe fallback if RPC not yet deployed
    }

    try {
      const [items, movements] = await Promise.all([
        this.getInventoryItems('all'),
        supabase
          .from('stock_movements')
          .select('*')
          .eq('type', 'out')
      ]);

      const movementsData = movements.data || [];
      const salesMap = new Map<string, number>();
      let totalOut = 0;

      movementsData.forEach((m: any) => {
        const qty = Number(m.quantity) || 0;
        const current = salesMap.get(String(m.inventoryItemId)) || 0;
        salesMap.set(String(m.inventoryItemId), current + qty);
        totalOut += qty;
      });

      const ranked = items.map((item) => {
        const outQty = salesMap.get(String(item.id)) || 0;
        return {
          inventory_item_id: String(item.id),
          product_name: item.productName,
          sku: item.sku,
          current_stock: item.currentStock,
          min_stock: item.minStock,
          status: item.status,
          total_out_qty: outQty,
          percentage: totalOut > 0 ? Number(((outQty / totalOut) * 100).toFixed(2)) : 0,
          cum_percentage: 0,
          classification: 'C' as const,
          image_url: item.imageUrl,
          category_name: item.categoryName
        };
      }).sort((a, b) => b.total_out_qty - a.total_out_qty || b.current_stock - a.current_stock);

      let cum = 0;
      return ranked.map((r) => {
        cum += r.percentage;
        const cumPct = Number(cum.toFixed(2));
        let classification: 'A' | 'B' | 'C' = 'C';
        if (cumPct <= 80 || cumPct === r.percentage) {
          classification = 'A';
        } else if (cumPct <= 95) {
          classification = 'B';
        }
        return {
          ...r,
          cum_percentage: cumPct,
          classification
        };
      });
    } catch (err) {
      observability.captureException(err, { action: 'getAbcCurve' });
      return [];
    }
  },

  async getStockoutPredictions(): Promise<StockoutPredictionItem[]> {
    try {
      const { data, error } = await supabase.rpc('get_stockout_predictions');
      if (!error && Array.isArray(data)) {
        return data as StockoutPredictionItem[];
      }
    } catch {
      // safe fallback if RPC not yet deployed
    }

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [items, movements] = await Promise.all([
        this.getInventoryItems('all'),
        supabase
          .from('stock_movements')
          .select('*')
          .eq('type', 'out')
          .gte('createdAt', thirtyDaysAgo)
      ]);

      const movementsData = movements.data || [];
      const salesMap = new Map<string, number>();

      movementsData.forEach((m: any) => {
        const qty = Number(m.quantity) || 0;
        const current = salesMap.get(String(m.inventoryItemId)) || 0;
        salesMap.set(String(m.inventoryItemId), current + qty);
      });

      const predictions: StockoutPredictionItem[] = [];

      items.forEach((item) => {
        const outLast30d = salesMap.get(String(item.id)) || 0;
        const avgDaily = Number((outLast30d / 30.0).toFixed(2));
        let daysLeft = 999;

        if (item.currentStock <= 0) {
          daysLeft = 0;
        } else if (avgDaily > 0) {
          daysLeft = Number((item.currentStock / avgDaily).toFixed(1));
        }

        if (item.currentStock <= 0 || (avgDaily > 0 && daysLeft <= 15.0)) {
          predictions.push({
            inventory_item_id: String(item.id),
            product_name: item.productName,
            sku: item.sku,
            current_stock: item.currentStock,
            min_stock: item.minStock,
            avg_daily_sales: avgDaily,
            days_until_stockout: daysLeft,
            status: item.status,
            image_url: item.imageUrl,
            category_name: item.categoryName
          });
        }
      });

      return predictions.sort((a, b) => a.days_until_stockout - b.days_until_stockout || b.avg_daily_sales - a.avg_daily_sales);
    } catch (err) {
      observability.captureException(err, { action: 'getStockoutPredictions' });
      return [];
    }
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
  },

  // --- BULK INVENTORY IMPORT ---
  async importInventoryItems(
    itemsInput: InventoryImportItem[] | string
  ): Promise<InventoryImportResult> {
    let items: InventoryImportItem[] = [];

    if (typeof itemsInput === 'string') {
      try {
        const parsed = JSON.parse(itemsInput);
        items = Array.isArray(parsed) ? parsed : [parsed];
      } catch (err) {
        console.error('❌ Erro: Formato JSON inválido passado para importInventory.', err);
        throw new Error('Formato JSON inválido. Certifique-se de passar um array de itens válido.');
      }
    } else if (Array.isArray(itemsInput)) {
      items = itemsInput;
    } else if (typeof itemsInput === 'object' && itemsInput !== null) {
      items = [itemsInput];
    } else {
      throw new Error('Parâmetro inválido. Passe um array de itens ou uma string JSON.');
    }

    console.log(
      `%c🚀 [Vitta Inventory] Iniciando importação sequencial de ${items.length} itens...`,
      'color: #3b82f6; font-weight: bold; font-size: 13px;'
    );

    const result: InventoryImportResult = {
      total: items.length,
      successCount: 0,
      failedCount: 0,
      items: []
    };

    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      const itemName = (raw.name || raw.productName || `Item ${i + 1}`).trim();
      const rawSlug = (raw.sku || itemName).toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^\w-]/g, '');
      const slug = rawSlug || `item-${Date.now()}-${i + 1}`;
      const itemSku = (raw.sku || slug).toUpperCase().trim();

      const catName = (raw.category || raw.categoryName || 'Geral').trim();
      const catSlug = (raw.categorySlug || raw.categoryId || catName).toString().toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^\w-]/g, '') || 'geral';

      const stock = Number(raw.currentStock ?? raw.stock ?? raw.stockCount ?? 10);
      const minStock = Number(raw.minStock ?? 5);
      const maxStock = Number(raw.maxStock ?? Math.max(100, stock * 2));
      const price = Number(raw.price ?? 99);
      const originalPrice = raw.originalPrice ? Number(raw.originalPrice) : undefined;
      const unit = raw.unit || 'un';

      const rawImages = Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : (raw.imageUrl ? [raw.imageUrl] : []);
      const images = rawImages.length > 0 ? rawImages : [];
      const primaryImage = images[0] || '';

      const sizes = Array.isArray(raw.sizes) && raw.sizes.length > 0 ? raw.sizes : ['PP', 'P', 'M', 'G', 'GG'];
      
      let colors: { name: string; hex: string }[] = [];
      if (Array.isArray(raw.colors) && raw.colors.length > 0) {
        colors = raw.colors;
      } else if (raw.color) {
        colors = [{ name: raw.color, hex: raw.colorHex || '#000000' }];
      } else {
        colors = [{ name: 'Preto', hex: '#000000' }];
      }

      const description = raw.description || `Peça ${itemName} da coleção Vitta. Qualidade e acabamento refinado.`;
      const details = Array.isArray(raw.details) ? raw.details : [];
      const isNew = typeof raw.isNew === 'boolean' ? raw.isNew : true;
      const isFeatured = typeof raw.isFeatured === 'boolean' ? raw.isFeatured : false;
      const tag = raw.tag || (isNew ? 'Novo' : undefined);
      const status = getInventoryStatus(stock, minStock);

      try {
        // 1. Garantir categoria na tabela categories
        try {
          const { data: catExists } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', catSlug)
            .maybeSingle();

          if (!catExists) {
            await supabase.from('categories').insert([{
              name: catName,
              slug: catSlug,
              description: `Coleção de ${catName}`,
              image: primaryImage,
              itemCount: 1
            }]);
          }
        } catch {
          // ignore category insert error
        }

        // 2. Inserir ou atualizar na tabela products
        let productId: string | number;
        const { data: existingProd } = await supabase
          .from('products')
          .select('id')
          .or(`slug.eq.${slug},name.eq.${itemName}`)
          .maybeSingle();

        if (existingProd) {
          productId = existingProd.id;
          const { error: updErr } = await supabase
            .from('products')
            .update({
              name: itemName,
              price,
              originalPrice,
              category: catName,
              categorySlug: catSlug,
              images,
              description,
              details,
              colors,
              sizes,
              stockCount: stock,
              inStock: stock > 0,
              isNew,
              isFeatured,
              tag
            })
            .eq('id', productId);

          if (updErr) throw updErr;
        } else {
          const { data: newProd, error: insErr } = await supabase
            .from('products')
            .insert([{
              name: itemName,
              slug,
              price,
              originalPrice,
              category: catName,
              categorySlug: catSlug,
              images,
              description,
              details,
              colors,
              sizes,
              stockCount: stock,
              inStock: stock > 0,
              isNew,
              isFeatured,
              tag
            }])
            .select('id')
            .single();

          if (insErr) throw insErr;
          productId = newProd.id;
        }

        // 3. Sincronizar na tabela inventory_items (Tomato Inventory)
        try {
          await supabase.from('inventory_items').upsert({
            id: productId,
            productId,
            productName: itemName,
            sku: itemSku,
            categoryId: catSlug,
            categoryName: catName,
            currentStock: stock,
            minStock,
            maxStock,
            unit,
            imageUrl: primaryImage,
            status,
            lastUpdated: new Date().toISOString()
          }, { onConflict: 'id' });
        } catch {
          // fallback
        }

        // 4. Registrar movimentação de estoque
        try {
          await supabase.from('stock_movements').insert([{
            inventoryItemId: productId,
            type: 'in',
            quantity: stock,
            reason: 'Importação inicial de lote',
            createdAt: new Date().toISOString()
          }]);
        } catch {
          // safe fallback
        }

        result.successCount++;
        result.items.push({
          name: itemName,
          sku: itemSku,
          category: catName,
          stock,
          price,
          status: 'success'
        });

        console.log(
          `%c[${i + 1}/${items.length}] ✅ "${itemName}" | SKU: ${itemSku} | Estoque: ${stock} | Preço: R$ ${price.toFixed(2)}`,
          'color: #10b981; font-weight: bold;'
        );
      } catch (err: any) {
        result.failedCount++;
        const errMsg = err?.message || 'Erro ao processar item';
        result.items.push({
          name: itemName,
          sku: itemSku,
          category: catName,
          stock,
          price,
          status: 'error',
          error: errMsg
        });

        console.error(
          `%c[${i + 1}/${items.length}] ❌ Erro ao importar "${itemName}": ${errMsg}`,
          'color: #ef4444; font-weight: bold;'
        );
      }
    }

    console.log(
      `%c🎉 [Vitta Inventory] Importação Concluída! Total: ${result.total} | Sucessos: ${result.successCount} | Falhas: ${result.failedCount}`,
      'color: #6366f1; font-weight: bold; font-size: 13px;'
    );
    console.table(result.items);

    observability.trackEvent({
      name: 'inventory_bulk_import_completed',
      category: 'admin',
      properties: {
        total: result.total,
        successCount: result.successCount,
        failedCount: result.failedCount
      }
    });

    return result;
  }
};

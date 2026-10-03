/**
 * Tomato Inventory Types
 * Based on TomatoPHP Inventory Plugin (https://docs.tomatophp.com/plugins/tomato-inventory)
 */

export interface InventoryItem {
  id: string | number;
  productId: string | number;
  productName: string;
  sku: string;
  categoryId: string | number;
  categoryName: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  imageUrl?: string;
  status: InventoryStatus;
  lastUpdated: string;
  sizes?: string[];
  color?: string;
  colorHex?: string;
  colors?: { name: string; hex: string }[];
}

export const DEFAULT_AVAILABLE_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'Único'];

export const DEFAULT_AVAILABLE_COLORS: { name: string; hex: string }[] = [
  { name: 'Preto', hex: '#000000' },
  { name: 'Branco', hex: '#FFFFFF' },
  { name: 'Off-White', hex: '#F5F5F0' },
  { name: 'Bege', hex: '#D2B48C' },
  { name: 'Azul Marinho', hex: '#0B1B3D' },
  { name: 'Verde Oliva', hex: '#4A5D4E' },
  { name: 'Marrom', hex: '#5C4033' },
  { name: 'Cinza Mescla', hex: '#808080' },
  { name: 'Bordô', hex: '#6B1D2F' },
  { name: 'Terracota', hex: '#C86D51' },
];

export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface StockMovement {
  id: string;
  inventoryItemId: string | number;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  createdAt: string;
  createdBy?: string;
}

export interface InventoryCategory {
  id: string | number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  itemCount: number;
}

export interface InventoryImportItem {
  name?: string;
  productName?: string;
  sku?: string;
  category?: string;
  categoryName?: string;
  categorySlug?: string;
  categoryId?: string | number;
  price?: number;
  originalPrice?: number;
  stock?: number;
  currentStock?: number;
  stockCount?: number;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  imageUrl?: string;
  images?: string[];
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  color?: string;
  colorHex?: string;
  description?: string;
  details?: string[];
  isNew?: boolean;
  isFeatured?: boolean;
  tag?: string;
}

export interface InventoryImportResult {
  total: number;
  successCount: number;
  failedCount: number;
  items: {
    name: string;
    sku: string;
    category: string;
    stock: number;
    price: number;
    status: 'success' | 'error';
    error?: string;
  }[];
}

export interface StockUpdatePayload {
  inventoryItemId: string | number;
  quantity: number;
  type: StockMovement['type'];
  reason: string;
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  file?: File;
  preview?: string;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

/**
 * Validates an image file before upload.
 */
export function validateImageFile(file: File): ImageValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido: ${file.type}. Use JPEG, PNG, WebP ou GIF.`
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Arquivo muito grande (${sizeMB}MB). Tamanho máximo: ${MAX_IMAGE_SIZE_MB}MB.`
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'Arquivo está vazio.'
    };
  }

  return {
    valid: true,
    file,
    preview: URL.createObjectURL(file)
  };
}

/**
 * Determines inventory status based on stock levels.
 */
export function getInventoryStatus(currentStock: number, minStock: number): InventoryStatus {
  if (currentStock <= 0) return 'out_of_stock';
  if (currentStock <= minStock) return 'low_stock';
  return 'in_stock';
}

/**
 * Bulk Stock Movement Payloads (Atomic RPC)
 */
export interface BulkStockMovementItem {
  inventoryItemId: string | number;
  quantity: number;
  type: 'in' | 'out' | 'adjustment';
  reason: string;
  adminId?: string;
}

export interface BulkUpdateRow {
  id: string;
  inventoryItemId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  currentStock: number;
  quantity: number;
  type: 'in' | 'out' | 'adjustment';
  reason: string;
}

export interface BulkUpdateResult {
  success: boolean;
  processed_count: number;
  message?: string;
  timestamp?: string;
}

/**
 * ABC Curve Analysis Item
 */
export interface InventoryAbcItem {
  inventory_item_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  min_stock: number;
  status: InventoryStatus;
  total_out_qty: number;
  percentage: number;
  cum_percentage: number;
  classification: 'A' | 'B' | 'C';
  image_url?: string;
  category_name?: string;
}

/**
 * Stockout Prediction Item (Previsão de Ruptura)
 */
export interface StockoutPredictionItem {
  inventory_item_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  min_stock: number;
  avg_daily_sales: number;
  days_until_stockout: number;
  status: InventoryStatus;
  image_url?: string;
  category_name?: string;
}



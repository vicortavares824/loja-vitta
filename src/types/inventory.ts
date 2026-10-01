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
}

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

import { describe, it, expect, vi } from 'vitest';
import {
  validateImageFile,
  getInventoryStatus,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES
} from '../../types/inventory';

describe('Tomato Inventory - Business Logic & Image Verification', () => {
  describe('validateImageFile (Image Verification Rules)', () => {
    it('should approve valid JPEG image under 10MB', () => {
      const file = new File(['valid content'], 'blazer.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 * 500 }); // 500 KB

      const result = validateImageFile(file);
      expect(result.valid).toBe(true);
      expect(result.file).toBe(file);
      expect(result.preview).toBeDefined();
    });

    it('should approve valid PNG, WebP and GIF images', () => {
      ['image/png', 'image/webp', 'image/gif'].forEach((mime) => {
        const file = new File(['img-content'], `photo.${mime.split('/')[1]}`, { type: mime });
        Object.defineProperty(file, 'size', { value: 1024 * 100 });
        const result = validateImageFile(file);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject non-image file types (e.g. PDF, TXT, executable)', () => {
      const badFile = new File(['bad'], 'document.pdf', { type: 'application/pdf' });
      const result = validateImageFile(badFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Tipo de arquivo não permitido');
    });

    it('should reject images larger than 10MB', () => {
      const largeFile = new File([''], 'huge.png', { type: 'image/png' });
      Object.defineProperty(largeFile, 'size', { value: MAX_IMAGE_SIZE_BYTES + 1024 });

      const result = validateImageFile(largeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Arquivo muito grande');
    });

    it('should reject empty image files (0 bytes)', () => {
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
      Object.defineProperty(emptyFile, 'size', { value: 0 });

      const result = validateImageFile(emptyFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Arquivo está vazio');
    });
  });

  describe('getInventoryStatus (Stock Threshold Logic)', () => {
    it('should return "out_of_stock" when current stock is 0 or negative', () => {
      expect(getInventoryStatus(0, 5)).toBe('out_of_stock');
      expect(getInventoryStatus(-2, 5)).toBe('out_of_stock');
    });

    it('should return "low_stock" when stock is at or below minStock', () => {
      expect(getInventoryStatus(5, 5)).toBe('low_stock');
      expect(getInventoryStatus(3, 5)).toBe('low_stock');
      expect(getInventoryStatus(1, 10)).toBe('low_stock');
    });

    it('should return "in_stock" when current stock exceeds minStock', () => {
      expect(getInventoryStatus(6, 5)).toBe('in_stock');
      expect(getInventoryStatus(25, 5)).toBe('in_stock');
    });
  });

  describe('Tomato Inventory Category Contracts', () => {
    it('should support allowed image types whitelist matching standard web formats', () => {
      expect(ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
      expect(ALLOWED_IMAGE_TYPES).toContain('image/png');
      expect(ALLOWED_IMAGE_TYPES).toContain('image/webp');
      expect(ALLOWED_IMAGE_TYPES).toContain('image/gif');
      expect(ALLOWED_IMAGE_TYPES).not.toContain('application/pdf');
    });
  });
});

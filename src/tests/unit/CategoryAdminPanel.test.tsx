import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CategoryAdminPanel } from '../../components/admin/CategoryAdminPanel';
import { inventoryService } from '../../services/inventoryService';

const mockShowToast = vi.fn();
vi.mock('../../context/CartContext', () => ({
  useCart: () => ({
    showToast: mockShowToast,
    formatPrice: (p: number) => `R$ ${p.toFixed(2)}`,
  }),
}));

const mockCategories = [
  {
    id: 'cat-1',
    name: 'Alfaiataria Minimalista',
    slug: 'alfaiataria',
    description: 'Blazers, calças e cortes refinados',
    image: 'https://example.com/tailoring.jpg',
    itemCount: 4,
  },
  {
    id: 'cat-2',
    name: 'Básicos Essenciais',
    slug: 'basicos',
    description: 'Camisetas e regatas em algodão egípcio',
    image: 'https://example.com/basics.jpg',
    itemCount: 8,
  },
];

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getInventoryCategories: vi.fn(() => Promise.resolve(mockCategories)),
    saveCategory: vi.fn((cat: any) =>
      Promise.resolve({ id: cat.id || 'new-cat-id', ...cat })
    ),
    deleteCategory: vi.fn(() => Promise.resolve(true)),
  },
}));

vi.mock('../../services/cloudinary', () => ({
  uploadImage: vi.fn(() =>
    Promise.resolve({
      url: 'https://cloudinary.com/cat-image.jpg',
      publicId: 'cat_img_id',
      width: 800,
      height: 600,
      format: 'jpg',
    })
  ),
}));

describe('CategoryAdminPanel (Dedicated Categories Management)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (inventoryService.getInventoryCategories as any).mockResolvedValue(mockCategories);
    (inventoryService.saveCategory as any).mockImplementation((cat: any) =>
      Promise.resolve({ id: cat.id || 'cat-saved', ...cat })
    );
    (inventoryService.deleteCategory as any).mockResolvedValue(true);
  });

  it('should render category cards with names, descriptions and piece count', async () => {
    render(<CategoryAdminPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('category-admin-panel')).toBeInTheDocument();
      expect(screen.getByText('Alfaiataria Minimalista')).toBeInTheDocument();
      expect(screen.getByText('Básicos Essenciais')).toBeInTheDocument();
      expect(screen.getByText('4 peças')).toBeInTheDocument();
      expect(screen.getByText('8 peças')).toBeInTheDocument();
    });
  });

  it('should open modal to create a new category and save', async () => {
    render(<CategoryAdminPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('create-new-category-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('create-new-category-btn'));

    expect(screen.getByText('Criar Nova Categoria')).toBeInTheDocument();

    const nameInput = screen.getByTestId('category-modal-name-input');
    fireEvent.change(nameInput, { target: { value: 'Sapatos e Calçados' } });

    fireEvent.click(screen.getByTestId('category-modal-save-btn'));

    await waitFor(() => {
      expect(inventoryService.saveCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sapatos e Calçados',
        })
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('criada!'),
        'success'
      );
    });
  });

  it('should open modal with existing data to edit category', async () => {
    render(<CategoryAdminPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('edit-category-btn-cat-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('edit-category-btn-cat-1'));

    expect(screen.getByText('Editar Categoria')).toBeInTheDocument();
    const nameInput = screen.getByTestId('category-modal-name-input') as HTMLInputElement;
    expect(nameInput.value).toBe('Alfaiataria Minimalista');

    fireEvent.change(nameInput, { target: { value: 'Alfaiataria Premium' } });
    fireEvent.click(screen.getByTestId('category-modal-save-btn'));

    await waitFor(() => {
      expect(inventoryService.saveCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cat-1',
          name: 'Alfaiataria Premium',
        })
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('atualizada com sucesso!'),
        'success'
      );
    });
  });

  it('should prompt and delete category when delete button clicked', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<CategoryAdminPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-category-btn-cat-2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('delete-category-btn-cat-2'));

    await waitFor(() => {
      expect(inventoryService.deleteCategory).toHaveBeenCalledWith('cat-2');
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('excluída com sucesso'),
        'info'
      );
    });
  });
});

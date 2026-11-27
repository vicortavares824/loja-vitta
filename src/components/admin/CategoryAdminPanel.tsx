import React, { useState, useEffect, useRef } from 'react';
import {
  FolderTree, Plus, Edit2, Trash2, RefreshCw, X, Check,
  Upload, Loader2, Image as ImageIcon, Layers
} from 'lucide-react';
import type { InventoryCategory } from '../../types/inventory';
import { validateImageFile } from '../../types/inventory';
import { inventoryService } from '../../services/inventoryService';
import { uploadImage } from '../../services/cloudinary';
import { useCart } from '../../context/CartContext';

export const CategoryAdminPanel: React.FC = () => {
  const { showToast } = useCart();
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<InventoryCategory> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Image Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getInventoryCategories();
      setCategories(data);
    } catch {
      showToast('Erro ao carregar categorias.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenNew = () => {
    setEditingCategory({
      name: '',
      slug: '',
      description: '',
      image: '',
      itemCount: 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: InventoryCategory) => {
    setEditingCategory({ ...cat });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name?.trim()) {
      showToast('Nome da categoria é obrigatório.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await inventoryService.saveCategory(editingCategory);
      showToast(
        editingCategory.id ? 'Categoria atualizada com sucesso!' : 'Nova categoria criada!',
        'success'
      );
      setIsModalOpen(false);
      setEditingCategory(null);
      await loadCategories();
    } catch {
      showToast('Erro ao salvar categoria.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string | number, name: string) => {
    if (!confirm(`Deseja realmente excluir a categoria "${name}"?`)) return;

    try {
      await inventoryService.deleteCategory(id);
      showToast(`Categoria "${name}" excluída com sucesso.`, 'info');
      await loadCategories();
    } catch {
      showToast('Erro ao excluir categoria.', 'error');
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCategory) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      showToast(validation.error || 'Imagem inválida.', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const res = await uploadImage(file, (p) => setUploadProgress(p.percentage));
      setEditingCategory({ ...editingCategory, image: res.url });
      showToast('Imagem verificada e enviada com sucesso!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao enviar imagem.', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8" data-testid="category-admin-panel">
      {/* Header */}
      <div className="bg-gradient-to-r from-white/10 via-white/5 to-transparent p-6 rounded-[2px] border border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-black uppercase tracking-widest bg-ink-3 text-paper border border-line-strong">
              Gestão de Categorias
            </span>
            <span className="text-xs text-mute font-medium">Classificação e Catálogo</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-paper">
            Categorias de Produtos
          </h2>
          <p className="text-xs text-paper-2 mt-1">
            Crie, edite e organize as categorias do e-commerce de forma independente do inventário.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-5 py-2.5 bg-paper text-ink hover:bg-paper-2 rounded-[2px] text-xs font-black uppercase tracking-wider transition-all"
            data-testid="create-new-category-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Categoria</span>
          </button>
          <button
            onClick={loadCategories}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-ink-3 hover:bg-ink-3 text-paper rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'motion-safe:animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Grid of Categories */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-ink-2 rounded-[2px] border border-line space-y-3">
          <Loader2 className="w-8 h-8 motion-safe:animate-spin text-paper" />
          <p className="text-xs text-mute font-semibold uppercase tracking-wider">
            Carregando categorias...
          </p>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 bg-ink-2 rounded-[2px] border border-line text-mute space-y-3">
          <Layers className="w-12 h-12 mx-auto opacity-30" />
          <p className="text-base font-bold text-paper">Nenhuma categoria cadastrada</p>
          <p className="text-xs text-mute">
            Clique no botão acima para criar sua primeira categoria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-ink-2 border border-line hover:border-line-strong rounded-[2px] overflow-hidden transition-all flex flex-col justify-between"
              data-testid={`category-card-${cat.id}`}
            >
              <div className="relative aspect-[16/9] w-full bg-ink overflow-hidden">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-mute">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-ink/80 px-3 py-1 rounded-[2px] text-[11px] font-bold text-paper border border-line-strong">
                  {cat.itemCount || 0} peças
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-paper uppercase tracking-wide">
                    {cat.name}
                  </h3>
                  <code className="text-[11px] font-mono text-mute bg-ink-2 px-2 py-0.5 rounded-[2px]">
                    slug: {cat.slug}
                  </code>
                  {cat.description && (
                    <p className="text-xs text-paper-2 mt-2 line-clamp-2">
                      {cat.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-ink-3 hover:bg-ink-3 text-paper text-xs font-semibold transition-colors"
                    data-testid={`edit-category-btn-${cat.id}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-semibold transition-colors"
                    data-testid={`delete-category-btn-${cat.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CRIAR OU EDITAR CATEGORIA */}
      {isModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 bg-ink/80 flex items-center justify-center p-4">
          <div className="bg-ink-2 border border-line-strong rounded-[2px] p-6 sm:p-8 max-w-lg w-full space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-paper" />
                <h3 className="text-lg font-black uppercase text-paper">
                  {editingCategory.id ? 'Editar Categoria' : 'Criar Nova Categoria'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCategory(null);
                }}
                className="text-mute hover:text-paper p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-paper-2 mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alfaiataria Minimalista"
                  value={editingCategory.name || ''}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      name: e.target.value,
                      slug: editingCategory.id ? editingCategory.slug : e.target.value.toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^\w-]/g, '')
                    })
                  }
                  className="w-full bg-ink-2 border border-line-strong rounded-[2px] px-4 py-2.5 text-sm text-paper placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-paper"
                  data-testid="category-modal-name-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-paper-2 mb-1">
                  Slug (Identificador URL)
                </label>
                <input
                  type="text"
                  placeholder="Ex: alfaiataria-minimalista"
                  value={editingCategory.slug || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                  className="w-full bg-ink-2 border border-line-strong rounded-[2px] px-4 py-2.5 text-sm font-mono text-paper-2 placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-paper"
                  data-testid="category-modal-slug-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-paper-2 mb-1">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  placeholder="Descrição da categoria para clientes e catálogo..."
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="w-full bg-ink-2 border border-line-strong rounded-[2px] px-4 py-2.5 text-sm text-paper placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-paper"
                />
              </div>

              {/* Category Image & Upload */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-paper-2 mb-1">
                  Imagem de Capa da Categoria
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded-[2px] overflow-hidden bg-ink border border-line-strong flex-shrink-0">
                    {editingCategory.image ? (
                      <img
                        src={editingCategory.image}
                        alt="Prévia"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <ImageIcon className="w-5 h-5 text-mute" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="URL da imagem da categoria..."
                      value={editingCategory.image || ''}
                      onChange={(e) => setEditingCategory({ ...editingCategory, image: e.target.value })}
                      className="w-full bg-ink-2 border border-line-strong rounded-[2px] px-3 py-1.5 text-xs text-paper placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-paper mb-2"
                    />

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleImageFileChange}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-3 py-1.5 bg-ink-3 hover:bg-ink-3 text-paper rounded-[2px] text-xs font-semibold transition-colors disabled:opacity-50"
                      data-testid="category-upload-image-btn"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" />
                          <span>Enviando ({uploadProgress}%)...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Enviar Nova Imagem</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2.5 rounded-[2px] text-xs font-bold uppercase tracking-wider text-mute hover:text-paper"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="px-6 py-2.5 rounded-[2px] bg-paper text-ink hover:bg-paper-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-50"
                  data-testid="category-modal-save-btn"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 motion-safe:animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{editingCategory.id ? 'Atualizar Categoria' : 'Salvar Categoria'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

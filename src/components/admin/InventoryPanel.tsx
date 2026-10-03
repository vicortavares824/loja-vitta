import React, { useState, useEffect, useRef } from 'react';
import {
  Package, RefreshCw, Plus, Minus, Upload, Loader2, AlertTriangle,
  CheckCircle2, XCircle, Image as ImageIcon, Filter, Edit2, Trash2,
  Check, X, ShieldCheck, Tag, ShoppingBag, Palette
} from 'lucide-react';
import type { InventoryItem, InventoryCategory } from '../../types/inventory';
import { validateImageFile, DEFAULT_AVAILABLE_SIZES, DEFAULT_AVAILABLE_COLORS } from '../../types/inventory';
import { inventoryService } from '../../services/inventoryService';
import { uploadImage } from '../../services/cloudinary';
import { useCart } from '../../context/CartContext';

interface InventoryPanelProps {
  formatPrice?: (price: number) => string;
  onCreateProductFromItem?: (item: InventoryItem) => void;
}

interface ImagePendingVerification {
  file: File;
  previewUrl: string;
  itemId: string | number;
  itemName: string;
  sizeKb: number;
  dimensions?: { width: number; height: number };
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ formatPrice: _formatPrice, onCreateProductFromItem }) => {
  const { showToast } = useCart();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);

  // Create / Edit Inventory Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [savingItem, setSavingItem] = useState(false);
  const [itemModalUploading, setItemModalUploading] = useState(false);
  const [itemModalUploadProgress, setItemModalUploadProgress] = useState(0);
  const itemModalFileInputRef = useRef<HTMLInputElement>(null);

  // Image Upload & Verification State
  const [pendingImage, setPendingImage] = useState<ImagePendingVerification | null>(null);
  const [uploadingId, setUploadingId] = useState<string | number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [verifiedUploads, setVerifiedUploads] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFileTargetItem, setCurrentFileTargetItem] = useState<{ id: string | number; name: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, inv] = await Promise.all([
        inventoryService.getInventoryCategories(),
        inventoryService.getInventoryItems(selectedCategory !== 'all' ? selectedCategory : undefined)
      ]);
      setCategories(cats);
      setItems(inv);
    } catch {
      showToast('Erro ao carregar dados do inventário TomatoPHP.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  // Toggle size in editingItem
  const handleToggleSize = (size: string) => {
    if (!editingItem) return;
    const currentSizes = editingItem.sizes || [];
    const updated = currentSizes.includes(size)
      ? currentSizes.filter((s) => s !== size)
      : [...currentSizes, size];
    setEditingItem({ ...editingItem, sizes: updated });
  };

  // Add custom size (e.g. 38, 40, GG, Único)
  const handleAddCustomSize = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customSizeInput.trim().toUpperCase();
    if (!trimmed || !editingItem) return;
    const currentSizes = editingItem.sizes || [];
    if (!currentSizes.includes(trimmed)) {
      setEditingItem({ ...editingItem, sizes: [...currentSizes, trimmed] });
    }
    setCustomSizeInput('');
  };

  // Remove a specific size
  const handleRemoveSize = (size: string) => {
    if (!editingItem) return;
    const currentSizes = editingItem.sizes || [];
    setEditingItem({
      ...editingItem,
      sizes: currentSizes.filter((s) => s !== size)
    });
  };

  // Handle stock addition/reduction
  const handleStockUpdate = async (
    itemId: string | number,
    type: 'in' | 'out',
    quantity: number = 1
  ) => {
    setUpdatingId(itemId);
    try {
      await inventoryService.updateStock({
        inventoryItemId: itemId,
        quantity,
        type,
        reason: type === 'in' ? 'Entrada manual via Tomato Inventory' : 'Saída manual via Tomato Inventory'
      });
      showToast(
        type === 'in' ? 'Estoque abastecido com sucesso!' : 'Baixa de estoque efetuada!',
        'success'
      );
      await loadData();
    } catch {
      showToast('Erro ao atualizar estoque.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Open modal to create a new inventory item
  const handleOpenNewItem = () => {
    setEditingItem({
      productName: '',
      sku: '',
      categoryId: categories[0]?.slug || 'alfaiataria',
      categoryName: categories[0]?.name || 'Alfaiataria',
      currentStock: 10,
      minStock: 5,
      maxStock: 50,
      unit: 'un',
      imageUrl: '',
      sizes: ['P', 'M', 'G', 'GG'],
      color: 'Preto',
      colorHex: '#000000',
      colors: [{ name: 'Preto', hex: '#000000' }]
    });
    setCustomSizeInput('');
    setIsItemModalOpen(true);
  };

  // Open modal to edit an existing inventory item
  const handleOpenEditItem = (item: InventoryItem) => {
    const primaryColor = item.color || item.colors?.[0]?.name || 'Preto';
    const primaryHex = item.colorHex || item.colors?.[0]?.hex || '#000000';
    setEditingItem({
      ...item,
      sizes: item.sizes && item.sizes.length > 0 ? [...item.sizes] : ['P', 'M', 'G', 'GG'],
      color: primaryColor,
      colorHex: primaryHex,
      colors: item.colors && item.colors.length > 0 ? [...item.colors] : [{ name: primaryColor, hex: primaryHex }]
    });
    setCustomSizeInput('');
    setIsItemModalOpen(true);
  };

  // Save (Create or Update) Inventory Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.productName?.trim()) {
      showToast('Nome do produto é obrigatório.', 'error');
      return;
    }

    setSavingItem(true);
    try {
      // Find matching category name
      const selectedCat = categories.find(c => (c.slug || c.id) === editingItem.categoryId);
      const payload: Partial<InventoryItem> = {
        ...editingItem,
        categoryName: selectedCat ? selectedCat.name : editingItem.categoryName || 'Geral'
      };

      await inventoryService.saveInventoryItem(payload);
      showToast(
        editingItem.id ? 'Item de inventário atualizado!' : 'Novo item cadastrado no inventário!',
        'success'
      );
      setIsItemModalOpen(false);
      setEditingItem(null);
      await loadData();
    } catch {
      showToast('Erro ao salvar item no inventário.', 'error');
    } finally {
      setSavingItem(false);
    }
  };

  // Delete inventory item
  const handleDeleteItem = async (id: string | number, name: string) => {
    if (!confirm(`Deseja realmente excluir o item "${name}" do inventário?`)) return;

    try {
      await inventoryService.deleteInventoryItem(id);
      showToast(`Item "${name}" excluído do inventário.`, 'info');
      await loadData();
    } catch {
      showToast('Erro ao excluir item do inventário.', 'error');
    }
  };

  // Direct Cloudinary Upload for Item Modal (Create or Edit)
  const handleItemModalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      showToast(validation.error || 'Arquivo de imagem inválido.', 'error');
      return;
    }

    setItemModalUploading(true);
    setItemModalUploadProgress(0);

    try {
      const result = await uploadImage(file, (progress) => {
        setItemModalUploadProgress(progress.percentage);
      });

      setEditingItem((prev) => (prev ? { ...prev, imageUrl: result.url } : null));
      showToast('Imagem enviada para o Cloudinary com sucesso!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Falha ao enviar imagem para o Cloudinary.', 'error');
    } finally {
      setItemModalUploading(false);
      setItemModalUploadProgress(0);
      if (itemModalFileInputRef.current) {
        itemModalFileInputRef.current.value = '';
      }
    }
  };

  // Image Selection Handler (Triggers Verification First)
  const handleTriggerImageSelect = (item: InventoryItem) => {
    setCurrentFileTargetItem({ id: item.id, name: item.productName });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentFileTargetItem) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      showToast(validation.error || 'Arquivo de imagem inválido.', 'error');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingImage({
      file,
      previewUrl,
      itemId: currentFileTargetItem.id,
      itemName: currentFileTargetItem.name,
      sizeKb: Math.round(file.size / 1024),
      dimensions: { width: 800, height: 800 }
    });
  };

  // Confirm verified upload
  const handleConfirmImageUpload = async () => {
    if (!pendingImage) return;

    const { file, itemId, previewUrl } = pendingImage;
    setUploadingId(itemId);
    setUploadProgress(0);

    try {
      const result = await uploadImage(file, (progress) => {
        setUploadProgress(progress.percentage);
      });

      await inventoryService.updateProductImage(itemId, result.url);
      setVerifiedUploads(prev => ({ ...prev, [String(itemId)]: result.url }));
      showToast('Upload verificado e imagem sincronizada com sucesso!', 'success');
      setPendingImage(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Falha ao enviar imagem verificada.', 'error');
    } finally {
      setUploadingId(null);
      setUploadProgress(0);
      URL.revokeObjectURL(previewUrl);
    }
  };

  const cancelImageVerification = () => {
    if (pendingImage?.previewUrl) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }
    setPendingImage(null);
  };

  const getStatusBadge = (status: InventoryItem['status']) => {
    switch (status) {
      case 'in_stock':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Em Estoque
          </span>
        );
      case 'low_stock':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Estoque Baixo
          </span>
        );
      case 'out_of_stock':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" /> Esgotado
          </span>
        );
    }
  };

  const totalItems = items.length;
  const totalStock = items.reduce((sum, i) => sum + i.currentStock, 0);
  const lowStockCount = items.filter(i => i.status === 'low_stock').length;
  const outOfStockCount = items.filter(i => i.status === 'out_of_stock').length;

  return (
    <div className="space-y-8" data-testid="inventory-panel">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-white/10 via-white/5 to-transparent p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              TomatoPHP Inventory Plugin
            </span>
            <span className="text-xs text-gray-400 font-medium">Controle de Estoque & Peças</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
            Inventário de Peças & Estoque
          </h2>
          <p className="text-xs text-gray-300 mt-1">
            Cadastre novos itens, edite parâmetros de estoque (mínimo, máximo, saldo) e gerencie imagens com verificação.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenNewItem}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-black hover:bg-gray-200 rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-md"
            data-testid="create-inventory-item-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Item no Inventário</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            data-testid="refresh-inventory-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
          <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Total de Peças</p>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1">{totalItems}</p>
          <p className="text-[11px] text-gray-400 mt-1">Peças no inventário</p>
        </div>
        <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
          <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Unidades em Estoque</p>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1">{totalStock}</p>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Volume total ativo
          </p>
        </div>
        <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
          <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Estoque Crítico</p>
          <p className="text-2xl sm:text-3xl font-black text-yellow-400 mt-1">{lowStockCount}</p>
          <p className="text-[11px] text-yellow-400/80 mt-1">Abaixo do limite de segurança</p>
        </div>
        <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
          <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Esgotados</p>
          <p className="text-2xl sm:text-3xl font-black text-red-400 mt-1">{outOfStockCount}</p>
          <p className="text-[11px] text-red-400/80 mt-1">Necessitam reposição urgente</p>
        </div>
      </div>

      {/* Category Selection Filter Toolbar */}
      <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-300" />
            <label htmlFor="category-select-dropdown" className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Seleção de Categoria:
            </label>
            <select
              id="category-select-dropdown"
              data-testid="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-black/60 text-white border border-white/20 rounded-xl px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
            >
              <option value="all">Todas as Categorias ({items.length})</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug || cat.name}>
                  {cat.name} ({cat.itemCount || 0} itens)
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-gray-400">
            Mostrando <strong className="text-white">{items.length}</strong> itens de inventário
          </div>
        </div>

        {/* Quick Filter Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" data-testid="category-pills">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-white text-black'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategory === (cat.slug || cat.name);
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug || cat.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <span>{cat.name}</span>
                {cat.itemCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black text-white' : 'bg-white/20 text-gray-200'}`}>
                    {cat.itemCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFilePicked}
        data-testid="image-upload-input"
      />

      {/* Inventory Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-white/10 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
            Consultando Tomato Inventory...
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10 text-gray-400 space-y-3">
          <Package className="w-12 h-12 mx-auto opacity-30" />
          <p className="text-base font-bold text-white">Nenhum item no inventário</p>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Clique em "Criar Item no Inventário" para cadastrar sua primeira peça de estoque.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white/5 rounded-3xl border border-white/10">
          <table className="w-full text-left" data-testid="inventory-table">
            <thead>
              <tr className="border-b border-white/10 text-[11px] text-gray-400 uppercase tracking-widest font-black">
                <th className="py-4 px-5">Imagem & Verificação</th>
                <th className="py-4 px-5">Produto</th>
                <th className="py-4 px-5">SKU</th>
                <th className="py-4 px-5">Categoria</th>
                <th className="py-4 px-5">Qtd Estoque</th>
                <th className="py-4 px-5">Min / Max</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-center">Ajuste Rápido</th>
                <th className="py-4 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-white/[0.03] transition-colors"
                  data-testid={`inventory-row-${item.id}`}
                >
                  {/* Image & Verification Trigger */}
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleTriggerImageSelect(item)}
                        className="relative w-14 h-14 rounded-xl overflow-hidden bg-black/60 border border-white/20 hover:border-white/60 transition-all group flex-shrink-0"
                        title="Clique para verificar e trocar a imagem"
                        data-testid={`upload-image-btn-${item.id}`}
                      >
                        {uploadingId === item.id ? (
                          <div className="flex flex-col items-center justify-center w-full h-full bg-black/80">
                            <Loader2 className="w-5 h-5 animate-spin text-white" />
                            <span className="text-[9px] text-white mt-1">{uploadProgress}%</span>
                          </div>
                        ) : item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full">
                            <ImageIcon className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                          <Upload className="w-4 h-4" />
                          <span className="text-[9px] font-bold mt-0.5">Trocar</span>
                        </div>
                      </button>

                      {verifiedUploads[String(item.id)] && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" /> Verificada
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Product Details */}
                  <td className="py-3 px-5">
                    <p className="text-sm font-bold text-white line-clamp-1">{item.productName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-gray-400">ID: {String(item.id).slice(0, 8)}</span>
                      {item.color && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white border border-white/15" title={`Cor: ${item.color}`} data-testid={`item-color-${item.id}`}>
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-sm shrink-0"
                            style={{ backgroundColor: item.colorHex || '#000000' }}
                          />
                          <span>{item.color}</span>
                        </span>
                      )}
                      {item.sizes && item.sizes.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap" data-testid={`item-sizes-${item.id}`}>
                          {item.sizes.map((s) => (
                            <span
                              key={s}
                              className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-white/10 text-gray-200 border border-white/10 tracking-tight"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="py-3 px-5">
                    <code className="text-xs font-mono text-gray-300 bg-black/40 px-2 py-1 rounded border border-white/10">
                      {item.sku}
                    </code>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-5">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-300 bg-white/10 px-2.5 py-1 rounded-full">
                      <Tag className="w-3 h-3 text-gray-400" />
                      {item.categoryName}
                    </span>
                  </td>

                  {/* Current Stock */}
                  <td className="py-3 px-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-extrabold text-white">{item.currentStock}</span>
                      <span className="text-xs text-gray-500">{item.unit || 'un'}</span>
                    </div>
                  </td>

                  {/* Min / Max */}
                  <td className="py-3 px-5 text-xs text-gray-400">
                    <div>Min: <strong className="text-gray-200">{item.minStock}</strong></div>
                    <div>Max: <strong className="text-gray-200">{item.maxStock}</strong></div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-5">
                    {getStatusBadge(item.status)}
                  </td>

                  {/* Quick Stock Actions (+ / -) */}
                  <td className="py-3 px-5 text-center">
                    <div className="inline-flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
                      <button
                        data-testid={`stock-out-${item.id}`}
                        onClick={() => handleStockUpdate(item.id, 'out')}
                        disabled={updatingId === item.id || item.currentStock <= 0}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Subtrair 1 unidade do estoque"
                      >
                        {updatingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        data-testid={`stock-in-${item.id}`}
                        onClick={() => handleStockUpdate(item.id, 'in')}
                        disabled={updatingId === item.id}
                        className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all disabled:opacity-30"
                        title="Adicionar 1 unidade ao estoque"
                      >
                        {updatingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Edit / Delete / Create Product Item */}
                  <td className="py-3 px-5 text-right">
                    <div className="inline-flex items-center gap-2">
                      {onCreateProductFromItem && (
                        <button
                          onClick={() => onCreateProductFromItem(item)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors flex items-center gap-1.5 text-[11px] font-bold"
                          title="Criar anúncio de produto na loja a partir desta peça do inventário"
                          data-testid={`create-product-from-inventory-${item.id}`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Criar Anúncio</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                        title="Editar detalhes do item no inventário"
                        data-testid={`edit-inventory-item-${item.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.productName)}
                        className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                        title="Excluir item do inventário"
                        data-testid={`delete-inventory-item-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: CRIAR OU EDITAR ITEM DE INVENTÁRIO */}
      {isItemModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/20 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-white" />
                <h3 className="text-lg font-black uppercase text-white">
                  {editingItem.id ? 'Editar Item do Inventário' : 'Novo Item no Inventário'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsItemModalOpen(false);
                  setEditingItem(null);
                }}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Blazer Minimalista Preto"
                  value={editingItem.productName || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, productName: e.target.value })}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
                  data-testid="item-modal-name-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                    Código SKU
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: BLAZER-01"
                    value={editingItem.sku || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value.toUpperCase() })}
                    className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={editingItem.categoryId || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, categoryId: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
                    data-testid="item-modal-category-select"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug || c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                    Estoque Atual *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingItem.currentStock ?? 10}
                    onChange={(e) => setEditingItem({ ...editingItem, currentStock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                    Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.minStock ?? 5}
                    onChange={(e) => setEditingItem({ ...editingItem, minStock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                    Máximo
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingItem.maxStock ?? 50}
                    onChange={(e) => setEditingItem({ ...editingItem, maxStock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
                  />
                </div>
              </div>

              {/* Tamanhos do Item (P, M, G, GG, etc.) */}
              <div className="space-y-2.5 bg-white/[0.03] p-3.5 rounded-2xl border border-white/10" data-testid="item-modal-sizes-section">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white">
                      Tamanhos Disponíveis do Item *
                    </label>
                    <p className="text-[11px] text-gray-400">
                      Selecione os tamanhos da peça (ex: P, M, G, GG) ou adicione tamanhos específicos
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-gray-300 bg-white/10 px-2 py-0.5 rounded-full">
                    {(editingItem.sizes || []).length} selecionado(s)
                  </span>
                </div>

                {/* Seletores rápidos de tamanho (Pills) */}
                <div className="flex flex-wrap gap-2 pt-1" data-testid="sizes-toggle-container">
                  {DEFAULT_AVAILABLE_SIZES.map((size) => {
                    const isSelected = (editingItem.sizes || []).includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleToggleSize(size)}
                        data-testid={`size-toggle-${size}`}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-white text-black shadow-md shadow-white/10 scale-105'
                            : 'bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white border border-white/10'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{size}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Adicionar tamanho customizado (ex: 38, 40, etc.) */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Outro tamanho (ex: 36, 38, 40, XGG...)"
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSize();
                      }
                    }}
                    className="flex-1 bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white"
                    data-testid="item-modal-custom-size-input"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomSize()}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                    data-testid="item-modal-add-custom-size-btn"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {/* Lista de tamanhos ativos com botão de remoção */}
                {(editingItem.sizes || []).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-white/5">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mr-1">Tamanhos da peça:</span>
                    {(editingItem.sizes || []).map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase bg-white/20 text-white border border-white/20 shadow-sm"
                        data-testid={`active-size-tag-${s}`}
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => handleRemoveSize(s)}
                          className="hover:text-red-400 p-0.5 rounded-full transition-colors ml-0.5"
                          title={`Remover tamanho ${s}`}
                          data-testid={`remove-size-${s}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Cor da Peça no Inventário */}
              <div className="space-y-2.5 bg-white/[0.03] p-3.5 rounded-2xl border border-white/10" data-testid="item-modal-color-section">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-emerald-400" />
                    <label className="block text-xs font-bold uppercase tracking-wider text-white">
                      Cor da Peça *
                    </label>
                  </div>
                  <div className="flex items-center gap-2 bg-black/60 px-2.5 py-1 rounded-full border border-white/15">
                    <span
                      className="w-3 h-3 rounded-full border border-white/40 shadow-sm"
                      style={{ backgroundColor: editingItem.colorHex || '#000000' }}
                    />
                    <span className="text-[11px] font-bold text-white">
                      {editingItem.color || 'Preto'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400">
                  Selecione a cor da peça para o controle de estoque ou personalize o tom:
                </p>

                {/* Paleta rápida de cores */}
                <div className="flex flex-wrap gap-2 pt-1" data-testid="color-palette-container">
                  {DEFAULT_AVAILABLE_COLORS.map((c) => {
                    const isSelected = editingItem.color?.toLowerCase() === c.name.toLowerCase();
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setEditingItem({
                          ...editingItem,
                          color: c.name,
                          colorHex: c.hex,
                          colors: [{ name: c.name, hex: c.hex }]
                        })}
                        data-testid={`color-select-${c.name}`}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-white text-black shadow-md shadow-white/10 scale-105'
                            : 'bg-white/5 hover:bg-white/15 text-gray-300 border border-white/10'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-white/30 shrink-0 shadow-sm"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Personalizar Nome da Cor & Seletor Hex */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Nome da Cor</label>
                    <input
                      type="text"
                      placeholder="Ex: Preto Noir, Off-White, Verde Musgo"
                      value={editingItem.color || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        color: e.target.value,
                        colors: [{ name: e.target.value, hex: editingItem.colorHex || '#000000' }]
                      })}
                      className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white"
                      data-testid="item-modal-color-name-input"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Amostra / Tom Hex</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingItem.colorHex || '#000000'}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          colorHex: e.target.value,
                          colors: [{ name: editingItem.color || 'Custom', hex: e.target.value }]
                        })}
                        className="w-9 h-8 rounded-lg bg-transparent border border-white/20 cursor-pointer p-0.5"
                        data-testid="item-modal-color-picker"
                      />
                      <input
                        type="text"
                        value={editingItem.colorHex || '#000000'}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          colorHex: e.target.value,
                          colors: [{ name: editingItem.color || 'Custom', hex: e.target.value }]
                        })}
                        className="flex-1 bg-black/40 border border-white/20 rounded-xl px-2.5 py-1.5 text-xs font-mono text-gray-300 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Image & Cloudinary Upload */}
              <div className="space-y-3" data-testid="item-modal-image-section">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                    Imagem do Produto (Cloudinary)
                  </label>
                  {editingItem.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, imageUrl: '' })}
                      className="text-[11px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 font-semibold"
                      data-testid="item-modal-remove-image-btn"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remover foto
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                  {/* Thumbnail Preview */}
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-black/60 border border-white/20 flex-shrink-0 flex items-center justify-center">
                    {editingItem.imageUrl ? (
                      <>
                        <img
                          src={editingItem.imageUrl}
                          alt="Prévia do Produto"
                          className="w-full h-full object-cover"
                          data-testid="item-modal-image-preview"
                        />
                        {editingItem.imageUrl.includes('cloudinary.com') && (
                          <div className="absolute bottom-1 right-1 bg-emerald-500/90 text-black text-[8px] font-black uppercase px-1 py-0.5 rounded shadow">
                            Cloudinary
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-500 gap-1">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-[9px]">Sem imagem</span>
                      </div>
                    )}
                  </div>

                  {/* Actions & URL Input */}
                  <div className="flex-1 w-full space-y-2">
                    <input
                      ref={itemModalFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleItemModalImageUpload}
                      data-testid="item-modal-image-file-input"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => itemModalFileInputRef.current?.click()}
                        disabled={itemModalUploading}
                        className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                        data-testid="item-modal-upload-btn"
                      >
                        {itemModalUploading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Enviando para Cloudinary ({itemModalUploadProgress}%)...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 text-white" />
                            <span>{editingItem.imageUrl ? 'Trocar Imagem (Cloudinary)' : 'Enviar Imagem (Cloudinary)'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="https://res.cloudinary.com/... ou URL externa"
                        value={editingItem.imageUrl || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, imageUrl: e.target.value })}
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white font-mono"
                        data-testid="item-modal-image-url-input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsItemModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="px-6 py-2.5 rounded-xl bg-white text-black hover:bg-gray-200 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-50 shadow-md"
                  data-testid="item-modal-save-btn"
                >
                  {savingItem ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{editingItem.id ? 'Atualizar Item' : 'Criar Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VERIFICAR ENVIO DA IMAGEM */}
      {pendingImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          data-testid="image-verification-modal"
        >
          <div className="bg-zinc-950 border border-white/20 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-black uppercase text-white">Verificar Envio de Imagem</h3>
              </div>
              <button
                onClick={cancelImageVerification}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image Preview Box */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/80 border border-white/15 flex items-center justify-center">
              <img
                src={pendingImage.previewUrl}
                alt="Prévia de verificação"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold text-white border border-white/20">
                Prévia da Imagem
              </div>
            </div>

            {/* Verification Checklist Details */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-gray-300">
                <span className="text-gray-400">Produto Destino:</span>
                <span className="font-bold text-white">{pendingImage.itemName}</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span className="text-gray-400">Nome do Arquivo:</span>
                <span className="font-mono text-gray-200">{pendingImage.file.name}</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span className="text-gray-400">Tamanho Verificado:</span>
                <span className="font-semibold text-emerald-400">{pendingImage.sizeKb} KB (Limite: 10 MB)</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span className="text-gray-400">Tipo MIME:</span>
                <span className="font-mono text-gray-200">{pendingImage.file.type}</span>
              </div>
              {pendingImage.dimensions && (
                <div className="flex items-center justify-between text-gray-300">
                  <span className="text-gray-400">Resolução:</span>
                  <span className="font-semibold text-white">
                    {pendingImage.dimensions.width} x {pendingImage.dimensions.height} px
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Arquivo validado e apto para sincronização</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelImageVerification}
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmImageUpload}
                disabled={uploadingId !== null}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                data-testid="confirm-upload-btn"
              >
                {uploadingId !== null ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando... ({uploadProgress}%)</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Confirmar Envio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

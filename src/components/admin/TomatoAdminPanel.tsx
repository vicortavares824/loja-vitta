import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, Package, ShoppingCart, Terminal, Plus, Edit2, Trash2, 
  RefreshCw, X, Save, DollarSign, TrendingUp, ArrowUpRight, ShieldCheck,
  Upload, Loader2, Warehouse, FolderTree
} from 'lucide-react';
import type { Product, Category, Order } from '../../types/ecommerce';
import { tomatoApi } from '../../services/tomatoApi';
import { uploadImage } from '../../services/cloudinary';
import { useCart } from '../../context/CartContext';
import { InventoryPanel } from './InventoryPanel';
import { CategoryAdminPanel } from './CategoryAdminPanel';

export const TomatoAdminPanel: React.FC = () => {
  const { formatPrice, showToast } = useCart();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'categories' | 'inventory' | 'orders' | 'api'>('dashboard');
  
  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Product CRUD
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // API Tester State
  const [apiEndpoint, setApiEndpoint] = useState<string>('GET /api/products');
  const [apiResponse, setApiResponse] = useState<string>('');
  const [apiLoading, setApiLoading] = useState(false);

  // Image Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAllData = async () => {
    setLoading(true);
    const [prods, cats, ords] = await Promise.all([
      tomatoApi.getProducts(),
      tomatoApi.getCategories(),
      tomatoApi.getOrders()
    ]);
    setProducts(prods);
    setCategories(cats);
    setOrders(ords);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Product CRUD
  const handleOpenNewProduct = () => {
    setEditingProduct({
      name: '',
      category: categories[0]?.name || 'Alfaiataria',
      categorySlug: categories[0]?.slug || 'tailoring',
      price: 990,
      description: '',
      stockCount: 15,
      tag: 'NOVO',
      images: [],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [
        { name: 'Preto', hex: '#000000' },
        { name: 'Branco', hex: '#ffffff' }
      ]
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct({ ...prod });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name) return;

    await tomatoApi.saveProduct(editingProduct);
    showToast('Produto salvo com sucesso no banco TomatoPHP!', 'success');
    setIsProductModalOpen(false);
    setEditingProduct(null);
    loadAllData();
  };

  const handleDeleteProduct = async (id: string | number) => {
    if (confirm('Tem certeza que deseja excluir esta peça do catálogo?')) {
      await tomatoApi.deleteProduct(id);
      showToast('Produto excluído com sucesso.', 'info');
      loadAllData();
    }
  };

  // Order status update
  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    await tomatoApi.updateOrderStatus(orderId, status);
    showToast(`Status do pedido #${orderId} alterado para ${status.toUpperCase()}!`, 'success');
    loadAllData();
  };

  // Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const result = await uploadImage(file, (progress) => {
        setUploadProgress(progress.percentage);
      });

      // Update the product images with the new Cloudinary URL
      const currentImages = editingProduct.images || [];
      setEditingProduct({
        ...editingProduct,
        images: [result.url, ...currentImages.filter(img => img !== result.url)],
      });

      showToast('Imagem enviada com sucesso!', 'success');
    } catch (err: any) {
      setUploadError(err.message || 'Erro ao enviar imagem');
      showToast(err.message || 'Erro ao enviar imagem', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    if (!editingProduct) return;
    const newImages = [...(editingProduct.images || [])];
    newImages.splice(index, 1);
    setEditingProduct({ ...editingProduct, images: newImages });
  };

  // Run API Simulation
  const handleRunApiTest = async () => {
    setApiLoading(true);
    const start = performance.now();
    let resData: any;

    if (apiEndpoint.includes('/products')) {
      resData = await tomatoApi.getProducts();
    } else if (apiEndpoint.includes('/categories')) {
      resData = await tomatoApi.getCategories();
    } else if (apiEndpoint.includes('/orders')) {
      resData = await tomatoApi.getOrders();
    } else if (apiEndpoint.includes('/inventory')) {
      resData = await import('../../services/inventoryService').then(m => m.inventoryService.getInventoryItems());
    }

    const elapsed = Math.round(performance.now() - start);
    setApiResponse(JSON.stringify({
      status: 200,
      statusText: 'OK',
      responseTime: `${elapsed}ms`,
      engine: 'TomatoPHP Filament v3.x REST API',
      data: resData
    }, null, 2));
    setApiLoading(false);
  };

  // Metrics Calculations
  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
  const totalStock = products.reduce((sum, p) => sum + (p.stockCount || 0), 0);
  const averageTicket = orders.length > 0 ? totalRevenue / orders.length : 0;

  return (
    <div className="pt-28 pb-24 min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-6 rounded-3xl border border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs uppercase font-extrabold tracking-widest text-gray-300">
                TomatoPHP E-Commerce Core API
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white">
              Painel Administrativo Vitta
            </h1>
          </div>

          {/* Quick Info & Refresh */}
          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/15 text-xs text-gray-300">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Sessão Autenticada</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 scrollbar-none">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'products', label: `Produtos (${products.length})`, icon: Package },
            { id: 'categories', label: `Categorias (${categories.length})`, icon: FolderTree },
            { id: 'inventory', label: 'Inventário', icon: Warehouse },
            { id: 'orders', label: `Pedidos (${orders.length})`, icon: ShoppingCart },
            { id: 'api', label: 'Console REST API', icon: Terminal },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-black shadow-lg'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase tracking-wider">
                  <span>Receita Total</span>
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">
                  {formatPrice(totalRevenue)}
                </div>
                <div className="text-xs text-green-400 flex items-center gap-1 font-medium">
                  <TrendingUp className="w-3.5 h-3.5" /> +18.4% vs mês anterior
                </div>
              </div>

              <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase tracking-wider">
                  <span>Pedidos Realizados</span>
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">
                  {orders.length}
                </div>
                <div className="text-xs text-gray-400 font-medium">
                  {orders.filter(o => o.status === 'processing').length} em processamento
                </div>
              </div>

              <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase tracking-wider">
                  <span>Ticket Médio</span>
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">
                  {formatPrice(averageTicket)}
                </div>
                <div className="text-xs text-gray-400 font-medium">
                  Por pedido finalizado
                </div>
              </div>

              <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase tracking-wider">
                  <span>Estoque Total</span>
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">
                  {totalStock} unid.
                </div>
                <div className="text-xs text-gray-400 font-medium">
                  Em {products.length} modelos ativos
                </div>
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold uppercase tracking-wider text-white">
                  Últimos Pedidos Gerados
                </h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-gray-300 hover:text-white uppercase tracking-wider flex items-center gap-1"
                >
                  <span>Ver Todos</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">ID Pedido</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {orders.slice(0, 5).map(order => (
                      <tr key={order.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-white">#{order.id}</td>
                        <td className="py-4 px-4">
                          <div className="font-semibold text-white">{order.customerName}</div>
                          <div className="text-gray-400 text-[11px]">{order.customerEmail}</div>
                        </td>
                        <td className="py-4 px-4 font-bold text-white">{formatPrice(order.totalAmount)}</td>
                        <td className="py-4 px-4 text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            order.status === 'delivered' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            order.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS CRUD */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold uppercase tracking-wider text-white">
                Catálogo de Produtos ({products.length})
              </h2>
              <button
                onClick={handleOpenNewProduct}
                className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Novo Produto</span>
              </button>
            </div>

            <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider font-semibold bg-white/5">
                      <th className="py-4 px-4">Produto</th>
                      <th className="py-4 px-4">Categoria</th>
                      <th className="py-4 px-4">Preço</th>
                      <th className="py-4 px-4">Estoque</th>
                      <th className="py-4 px-4">Tag</th>
                      <th className="py-4 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {products.map(prod => (
                      <tr key={prod.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={prod.images?.[0] || ''}
                              alt={prod.name}
                              className="w-12 h-14 object-cover rounded-xl bg-black border border-white/10"
                            />
                            <div>
                              <div className="font-bold text-white text-sm">{prod.name}</div>
                              <div className="text-gray-400 text-[11px] line-clamp-1 max-w-xs">{prod.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-semibold text-gray-300">{prod.category}</td>
                        <td className="py-4 px-4 font-bold text-white text-sm">{formatPrice(prod.price)}</td>
                        <td className="py-4 px-4">
                          <span className={`font-semibold ${prod.stockCount <= 5 ? 'text-red-400' : 'text-gray-300'}`}>
                            {prod.stockCount} un.
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {prod.tag && (
                            <span className="bg-white/15 text-white px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase">
                              {prod.tag}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditProduct(prod)}
                              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                              title="Editar Produto"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                              title="Excluir Produto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CATEGORIAS (CATEGORIES CRUD) */}
        {activeTab === 'categories' && (
          <CategoryAdminPanel />
        )}

        {/* TAB 4: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold uppercase tracking-wider text-white">
              Gestão de Pedidos ({orders.length})
            </h2>

            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-4">
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-white">#{order.id}</span>
                        <span className="text-xs text-gray-400">• {new Date(order.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="text-xs text-gray-300 mt-1">
                        Cliente: <strong className="text-white">{order.customerName}</strong> ({order.customerEmail})
                      </div>
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Status:</span>
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                        className="bg-black text-white text-xs font-bold rounded-xl px-3 py-1.5 border border-white/20 focus:outline-none cursor-pointer uppercase"
                      >
                        <option value="pending">Pendente</option>
                        <option value="processing">Processando</option>
                        <option value="shipped">Enviado</option>
                        <option value="delivered">Entregue</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Itens do Pedido:</span>
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-black/40 p-2.5 rounded-2xl border border-white/5">
                          <img src={item.image} alt={item.productName} className="w-10 h-12 object-cover rounded-lg bg-black" />
                          <div className="flex-1 text-xs">
                            <div className="font-bold text-white line-clamp-1">{item.productName}</div>
                            <div className="text-gray-400 text-[11px]">
                              {item.quantity}x • Cor: {item.selectedColor} • Tam: {item.selectedSize}
                            </div>
                          </div>
                          <div className="font-bold text-white text-xs">
                            {formatPrice(item.price * item.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Shipping & Payment Summary */}
                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-xs space-y-2 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="text-gray-400">Endereço de Entrega:</div>
                        <div className="text-white font-medium">{order.shippingAddress}</div>
                        <div className="text-gray-400 pt-2">Método de Pagamento:</div>
                        <div className="text-white font-medium">{order.paymentMethod}</div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/10 font-bold text-sm">
                        <span>Total Pago:</span>
                        <span className="text-base text-white">{formatPrice(order.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: INVENTÁRIO (TOMATO INVENTORY) */}
        {activeTab === 'inventory' && (
          <InventoryPanel formatPrice={formatPrice} />
        )}

        {/* TAB 6: REST API LIVE CONSOLE */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
              <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-wider text-white">
                    Simulador & Tester da API TomatoPHP
                  </h3>
                  <p className="text-xs text-gray-400">
                    Teste as requisições REST da engine e verifique os payloads JSON retornados.
                  </p>
                </div>
              </div>

              {/* Endpoint Selector & Run Button */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <select
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  className="w-full sm:flex-1 bg-black text-white text-xs font-mono rounded-2xl px-4 py-3 border border-white/20 focus:outline-none"
                >
                  <option value="GET /api/products">GET /api/products (Listar Catálogo)</option>
                  <option value="GET /api/categories">GET /api/categories (Listar Categorias)</option>
                  <option value="GET /api/inventory">GET /api/inventory (Listar Estoque & Inventário)</option>
                  <option value="GET /api/orders">GET /api/orders (Listar Pedidos)</option>
                </select>
                <button
                  onClick={handleRunApiTest}
                  disabled={apiLoading}
                  className="w-full sm:w-auto px-6 py-3 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-2xl hover:bg-gray-200 transition-colors shrink-0 flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${apiLoading ? 'animate-spin' : ''}`} />
                  <span>Enviar Requisição</span>
                </button>
              </div>

              {/* Response Code Block */}
              {apiResponse && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
                    <span>Response Payload (JSON):</span>
                    <span className="text-green-400 font-bold">200 OK</span>
                  </div>
                  <pre className="bg-black/90 p-5 rounded-2xl border border-white/10 text-xs font-mono text-gray-200 overflow-x-auto max-h-96">
                    {apiResponse}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT PRODUCT */}
        {isProductModalOpen && editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#121216] border border-white/20 w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold uppercase tracking-wider text-white">
                  {editingProduct.id ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </h3>
                <button onClick={() => setIsProductModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Nome do Produto</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full bg-black border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">Categoria</label>
                    <select
                      value={editingProduct.categorySlug || 'tailoring'}
                      onChange={(e) => {
                        const cat = categories.find(c => c.slug === e.target.value);
                        setEditingProduct({
                          ...editingProduct,
                          categorySlug: e.target.value,
                          category: cat?.name || 'Alfaiataria'
                        });
                      }}
                      className="w-full bg-black border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none cursor-pointer"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.slug}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">Preço (R$)</label>
                    <input
                      type="number"
                      required
                      value={editingProduct.price || 0}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                      className="w-full bg-black border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">Estoque Disponível</label>
                    <input
                      type="number"
                      required
                      value={editingProduct.stockCount || 10}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stockCount: Number(e.target.value) })}
                      className="w-full bg-black border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">Tag / Selo</label>
                    <input
                      type="text"
                      value={editingProduct.tag || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, tag: e.target.value })}
                      placeholder="Ex: NOVO, BESTSELLER, LIMITED"
                      className="w-full bg-black border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-2">Imagens do Produto</label>
                  
                  {/* Image Upload Area */}
                  <div className="space-y-4">
                    {/* Current Images Preview */}
                    {editingProduct.images && editingProduct.images.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {editingProduct.images.map((img, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={img}
                              alt={`Imagem ${index + 1}`}
                              className="w-full h-28 object-cover rounded-xl border border-white/20"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            {index === 0 && (
                              <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 text-white text-[10px] font-bold rounded-full uppercase">
                                Principal
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload Button */}
                    <div
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all ${
                        uploading
                          ? 'border-white/10 bg-white/5 cursor-wait'
                          : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10 cursor-pointer'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      
                      {uploading ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                          <div className="w-full max-w-xs bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-white transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">Enviando... {uploadProgress}%</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 bg-white/10 rounded-2xl">
                            <Upload className="w-6 h-6 text-white" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-white font-semibold">
                              Clique para enviar imagem
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              JPEG, PNG, WebP ou GIF (máx. 10MB)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Upload Error */}
                    {uploadError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                        {uploadError}
                      </div>
                    )}

                    {/* Manual URL Input (fallback) */}
                    <div>
                      <label className="block text-gray-400 text-[11px] font-bold mb-1">
                        Ou insira uma URL de imagem
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={editingProduct.images?.[0] || ''}
                          onChange={(e) => setEditingProduct({ 
                            ...editingProduct, 
                            images: [e.target.value, ...(editingProduct.images || []).slice(1)].filter(Boolean)
                          })}
                          placeholder="https://exemplo.com/imagem.jpg"
                          className="flex-1 bg-black border border-white/20 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">Descrição Detalhada</label>
                  <textarea
                    rows={3}
                    required
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full bg-black border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-5 py-2.5 rounded-full bg-white/10 text-white font-bold hover:bg-white/20 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar Produto</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

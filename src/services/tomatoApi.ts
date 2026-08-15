import type { Product, Category, Coupon, Order, TomatoApiResponse } from '../types/ecommerce';

const API_BASE_URL = import.meta.env.VITE_TOMATO_API_URL || '/api';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Blazer Alfaiataria Minimal Noir',
    slug: 'blazer-alfaiataria-minimal-noir',
    price: 1890,
    originalPrice: 2400,
    category: 'Alfaiataria',
    categorySlug: 'tailoring',
    images: [
      'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
    ],
    description: 'Blazer estruturado em lã fria com corte sob medida, caimento impecável e acabamento acetinado interno.',
    details: [
      '100% Lã Fria Italiana 150s',
      'Botões gravados a laser',
      'Forro 100% Seda Pura',
      'Modelagem Slim Couture',
      'Produção limitada numerada'
    ],
    colors: [
      { name: 'Preto Puro', hex: '#000000' },
      { name: 'Cinza Carvão', hex: '#2b2b2b' },
      { name: 'Branco Giz', hex: '#f0f0f0' }
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    rating: 4.9,
    reviewsCount: 42,
    isNew: true,
    isFeatured: true,
    inStock: true,
    stockCount: 12,
    tag: 'ESSENTIAL'
  },
  {
    id: 'prod-2',
    name: 'Vestido de Seda Minimalist Runway',
    slug: 'vestido-seda-minimalist-runway',
    price: 2650,
    originalPrice: 3200,
    category: 'Vestidos',
    categorySlug: 'dresses',
    images: [
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80',
    ],
    description: 'Vestido longo em seda pura de caimento fluido com decote assimétrico e fenda lateral sutil.',
    details: [
      '100% Seda Mulberry natural',
      'Costura artesanal invisível',
      'Fecho com zíper oculto',
      'Resistente a vincos e leveza extrema'
    ],
    colors: [
      { name: 'Preto Ônix', hex: '#0a0a0a' },
      { name: 'Branco Pérola', hex: '#ffffff' },
      { name: 'Cinza Névoa', hex: '#9e9e9e' }
    ],
    sizes: ['S', 'M', 'L'],
    rating: 5.0,
    reviewsCount: 28,
    isNew: true,
    isFeatured: true,
    inStock: true,
    stockCount: 7,
    tag: 'NOVA COLEÇÃO'
  },
  {
    id: 'prod-3',
    name: 'Jaqueta Biker Couro Lambskin',
    slug: 'jaqueta-biker-couro-lambskin',
    price: 3400,
    originalPrice: 4100,
    category: 'Jaquetas',
    categorySlug: 'jackets',
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&w=800&q=80',
    ],
    description: 'Couro de cordeiro nobre amanteigado com aviamentos escurecidos em banho de ródio negro e forro térmico.',
    details: [
      '100% Pelica de Cordeiro Premium',
      'Zíperes industriais YKK Excella',
      'Tratamento impermeabilizante natural',
      'Bolsos internos para passaporte'
    ],
    colors: [
      { name: 'Preto Total', hex: '#050505' },
      { name: 'Grafite', hex: '#333333' }
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    rating: 4.8,
    reviewsCount: 56,
    isNew: false,
    isFeatured: true,
    inStock: true,
    stockCount: 15,
    tag: 'BESTSELLER'
  },
  {
    id: 'prod-4',
    name: 'Sobretudo Estruturado Cashmere',
    slug: 'sobretudo-estruturado-cashmere',
    price: 4200,
    originalPrice: 5000,
    category: 'Alfaiataria',
    categorySlug: 'tailoring',
    images: [
      'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80',
    ],
    description: 'Sobretudo longo em blend de lã virgem e cashmere mongol com lapela larga e martingale nas costas.',
    details: [
      '80% Lã Virgem, 20% Cashmere Puro',
      'Construção meia-tela clássica',
      'Forro acetinado respirável',
      'Comprimento abaixo do joelho'
    ],
    colors: [
      { name: 'Preto Profundo', hex: '#000000' },
      { name: 'Off-White', hex: '#eaeaea' }
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    rating: 4.9,
    reviewsCount: 19,
    isNew: true,
    isFeatured: false,
    inStock: true,
    stockCount: 5,
    tag: 'LIMITED'
  },
  {
    id: 'prod-5',
    name: 'Hoodie Oversized Heavyweight Cotton',
    slug: 'hoodie-oversized-heavyweight-cotton',
    price: 890,
    originalPrice: 1100,
    category: 'Streetwear',
    categorySlug: 'streetwear',
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=800&q=80',
    ],
    description: 'Moletom 500 GSM ultra pesado com corte boxy, capuz estruturado duplo e tingimento reativo minimalista.',
    details: [
      '100% Algodão Egípcio 500 GSM',
      'Sem cordões no capuz (design limpo)',
      'Punhos canelados reforçados',
      'Pré-encolhido industrialmente'
    ],
    colors: [
      { name: 'Preto Fosco', hex: '#111111' },
      { name: 'Branco Neve', hex: '#ffffff' },
      { name: 'Cinza Chumbo', hex: '#404040' }
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    rating: 4.7,
    reviewsCount: 88,
    isNew: false,
    isFeatured: true,
    inStock: true,
    stockCount: 30,
    tag: 'STREET'
  },
  {
    id: 'prod-6',
    name: 'Bolsa Estruturada em Couro Box',
    slug: 'bolsa-estruturada-couro-box',
    price: 1980,
    originalPrice: 2500,
    category: 'Acessórios',
    categorySlug: 'accessories',
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80',
    ],
    description: 'Bolsa tiracolo em couro rígido box com fecho magnético de precisão e alça ajustável destacável.',
    details: [
      'Couro Calfskin italiano',
      'Ferragens polidas em ródio',
      'Divisória interna para cartões e celular',
      'Gravação do logo em baixo relevo'
    ],
    colors: [
      { name: 'Preto Liso', hex: '#000000' },
      { name: 'Branco Giz', hex: '#f2f2f2' }
    ],
    sizes: ['Único'],
    rating: 4.9,
    reviewsCount: 35,
    isNew: true,
    isFeatured: false,
    inStock: true,
    stockCount: 8,
    tag: 'EXCLUSIVO'
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Alfaiataria',
    slug: 'tailoring',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
    itemCount: 14,
    description: 'Blazers, paletós e calças com corte sob medida e precisão milimétrica.'
  },
  {
    id: 'cat-2',
    name: 'Vestidos',
    slug: 'dresses',
    image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80',
    itemCount: 18,
    description: 'Seda pura, caimento fluido e silhuetas esculturais para ocasiões de destaque.'
  },
  {
    id: 'cat-3',
    name: 'Jaquetas & Casacos',
    slug: 'jackets',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
    itemCount: 12,
    description: 'Couro legítimo, sobretudos de lã e peças técnicas com design minimalista.'
  },
  {
    id: 'cat-4',
    name: 'Streetwear',
    slug: 'streetwear',
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
    itemCount: 22,
    description: 'Hoodies heavyweight, t-shirts essenciais e calças cargo de alta gramatura.'
  },
  {
    id: 'cat-5',
    name: 'Acessórios',
    slug: 'accessories',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
    itemCount: 19,
    description: 'Bolsas estruturadas, cintos em couro legítimo e peças minimalistas.'
  }
];

export const INITIAL_COUPONS: Record<string, Coupon> = {
  VITTA15: {
    code: 'VITTA15',
    discountPercentage: 15,
    description: '15% de desconto especial Vitta Collection'
  },
  TOMATO20: {
    code: 'TOMATO20',
    discountPercentage: 20,
    minAmount: 1000,
    description: '20% em compras acima de R$ 1.000 via Tomato API'
  },
  FREESHIP: {
    code: 'FREESHIP',
    discountFixed: 150,
    description: 'R$ 150 de desconto no frete expresso'
  }
};

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'VB-883921',
    customerName: 'Lucas Albuquerque',
    customerEmail: 'lucas.alb@email.com',
    items: [
      {
        productId: 'prod-1',
        productName: 'Blazer Alfaiataria Minimal Noir',
        price: 1890,
        quantity: 1,
        selectedColor: 'Preto Puro',
        selectedSize: 'M',
        image: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=800&q=80'
      }
    ],
    totalAmount: 1890,
    status: 'processing',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    paymentMethod: 'PIX Instantâneo',
    shippingAddress: 'Av. Paulista, 1000 - Bela Vista, SP',
    couponUsed: 'VITTA15'
  },
  {
    id: 'VB-774019',
    customerName: 'Beatriz Vasconcelos',
    customerEmail: 'beatriz.v@email.com',
    items: [
      {
        productId: 'prod-2',
        productName: 'Vestido de Seda Minimalist Runway',
        price: 2650,
        quantity: 1,
        selectedColor: 'Branco Pérola',
        selectedSize: 'S',
        image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80'
      },
      {
        productId: 'prod-5',
        productName: 'Hoodie Oversized Heavyweight Cotton',
        price: 890,
        quantity: 1,
        selectedColor: 'Preto Fosco',
        selectedSize: 'L',
        image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80'
      }
    ],
    totalAmount: 3540,
    status: 'shipped',
    createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    paymentMethod: 'Cartão de Crédito (3x)',
    shippingAddress: 'Rua Oscar Freire, 450 - Jardins, SP'
  },
  {
    id: 'VB-661042',
    customerName: 'Rafael Mendes',
    customerEmail: 'rafael.mendes@email.com',
    items: [
      {
        productId: 'prod-3',
        productName: 'Jaqueta Biker Couro Lambskin',
        price: 3400,
        quantity: 1,
        selectedColor: 'Preto Total',
        selectedSize: 'L',
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80'
      }
    ],
    totalAmount: 3400,
    status: 'delivered',
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    paymentMethod: 'PIX Instantâneo',
    shippingAddress: 'Rua Visconde de Pirajá, 200 - Ipanema, RJ'
  }
];

// Helper para persistência local
function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export const tomatoApi = {
  // --- PRODUTOS ---
  async getProducts(categorySlug?: string, search?: string, sort?: string): Promise<Product[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/products?category=${categorySlug || ''}&search=${search || ''}`);
      if (response.ok) {
        const json: TomatoApiResponse<Product[]> = await response.json();
        return json.data;
      }
    } catch {
      // fallback local
    }

    let products = getStored<Product[]>('tomato_products', INITIAL_PRODUCTS);

    if (categorySlug && categorySlug !== 'all') {
      products = products.filter(p => p.categorySlug === categorySlug);
    }

    if (search) {
      const query = search.toLowerCase();
      products = products.filter(
        p => p.name.toLowerCase().includes(query) ||
             p.description.toLowerCase().includes(query) ||
             p.category.toLowerCase().includes(query)
      );
    }

    if (sort === 'price-asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      products.sort((a, b) => b.rating - a.rating);
    }

    return products;
  },

  async getProductById(id: string | number): Promise<Product | null> {
    const products = getStored<Product[]>('tomato_products', INITIAL_PRODUCTS);
    return products.find(p => String(p.id) === String(id)) || null;
  },

  async saveProduct(product: Partial<Product>): Promise<Product> {
    const products = getStored<Product[]>('tomato_products', INITIAL_PRODUCTS);
    let saved: Product;

    if (product.id) {
      const index = products.findIndex(p => String(p.id) === String(product.id));
      if (index >= 0) {
        saved = { ...products[index], ...product } as Product;
        products[index] = saved;
      } else {
        saved = product as Product;
        products.push(saved);
      }
    } else {
      saved = {
        ...product,
        id: `prod-${Date.now()}`,
        slug: product.name ? product.name.toLowerCase().replace(/\s+/g, '-') : `prod-${Date.now()}`,
        rating: 5.0,
        reviewsCount: 0,
        inStock: true,
        stockCount: product.stockCount || 10,
        images: product.images && product.images.length > 0 ? product.images : [
          'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=800&q=80'
        ],
        colors: product.colors && product.colors.length > 0 ? product.colors : [
          { name: 'Preto', hex: '#000000' },
          { name: 'Branco', hex: '#ffffff' }
        ],
        sizes: product.sizes && product.sizes.length > 0 ? product.sizes : ['S', 'M', 'L']
      } as Product;
      products.unshift(saved);
    }

    setStored('tomato_products', products);
    return saved;
  },

  async deleteProduct(id: string | number): Promise<boolean> {
    let products = getStored<Product[]>('tomato_products', INITIAL_PRODUCTS);
    products = products.filter(p => String(p.id) !== String(id));
    setStored('tomato_products', products);
    return true;
  },

  // --- CATEGORIAS ---
  async getCategories(): Promise<Category[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);
      if (response.ok) {
        const json: TomatoApiResponse<Category[]> = await response.json();
        return json.data;
      }
    } catch {
      // fallback local
    }
    return getStored<Category[]>('tomato_categories', INITIAL_CATEGORIES);
  },

  async saveCategory(cat: Partial<Category>): Promise<Category> {
    const cats = getStored<Category[]>('tomato_categories', INITIAL_CATEGORIES);
    let saved: Category;
    if (cat.id) {
      const index = cats.findIndex(c => String(c.id) === String(cat.id));
      if (index >= 0) {
        saved = { ...cats[index], ...cat } as Category;
        cats[index] = saved;
      } else {
        saved = cat as Category;
        cats.push(saved);
      }
    } else {
      saved = {
        ...cat,
        id: `cat-${Date.now()}`,
        slug: cat.name ? cat.name.toLowerCase().replace(/\s+/g, '-') : `cat-${Date.now()}`,
        itemCount: 0
      } as Category;
      cats.push(saved);
    }
    setStored('tomato_categories', cats);
    return saved;
  },

  // --- PEDIDOS (ORDERS) ---
  async getOrders(): Promise<Order[]> {
    return getStored<Order[]>('tomato_orders', INITIAL_ORDERS);
  },

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<boolean> {
    const orders = getStored<Order[]>('tomato_orders', INITIAL_ORDERS);
    const index = orders.findIndex(o => o.id === orderId);
    if (index >= 0) {
      orders[index].status = status;
      setStored('tomato_orders', orders);
      return true;
    }
    return false;
  },

  async createOrder(orderPayload: Partial<Order>): Promise<{ success: boolean; orderId: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      if (response.ok) {
        const json = await response.json();
        return { success: true, orderId: json.orderId || `VB-${Math.floor(100000 + Math.random() * 900000)}` };
      }
    } catch {
      // fallback
    }

    const orderId = `VB-${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder: Order = {
      id: orderId,
      customerName: orderPayload.customerName || 'Cliente Vitta',
      customerEmail: orderPayload.customerEmail || 'cliente@vittabasics.com',
      items: orderPayload.items || [],
      totalAmount: orderPayload.totalAmount || 0,
      status: 'processing',
      createdAt: new Date().toISOString(),
      paymentMethod: orderPayload.paymentMethod || 'Cartão de Crédito',
      shippingAddress: orderPayload.shippingAddress || 'Endereço Principal',
      couponUsed: orderPayload.couponUsed
    };

    const orders = getStored<Order[]>('tomato_orders', INITIAL_ORDERS);
    orders.unshift(newOrder);
    setStored('tomato_orders', orders);

    return {
      success: true,
      orderId
    };
  },

  // --- CUPONS ---
  async getCoupons(): Promise<Record<string, Coupon>> {
    return getStored<Record<string, Coupon>>('tomato_coupons', INITIAL_COUPONS);
  },

  async applyCoupon(code: string): Promise<Coupon | null> {
    const cleanCode = code.trim().toUpperCase();
    const coupons = getStored<Record<string, Coupon>>('tomato_coupons', INITIAL_COUPONS);

    if (coupons[cleanCode]) {
      return coupons[cleanCode];
    }
    return null;
  },

  async saveCoupon(coupon: Coupon): Promise<Coupon> {
    const coupons = getStored<Record<string, Coupon>>('tomato_coupons', INITIAL_COUPONS);
    coupons[coupon.code.toUpperCase()] = {
      ...coupon,
      code: coupon.code.toUpperCase()
    };
    setStored('tomato_coupons', coupons);
    return coupon;
  },

  async deleteCoupon(code: string): Promise<boolean> {
    const coupons = getStored<Record<string, Coupon>>('tomato_coupons', INITIAL_COUPONS);
    delete coupons[code.toUpperCase()];
    setStored('tomato_coupons', coupons);
    return true;
  }
};

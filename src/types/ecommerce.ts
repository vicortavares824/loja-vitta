export type Currency = 'BRL' | 'USD' | 'EUR';

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  id: number | string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  category: string;
  categorySlug: string;
  images: string[];
  description: string;
  details?: string[];
  colors: ProductColor[];
  sizes: string[];
  rating: number;
  reviewsCount: number;
  isNew?: boolean;
  isFeatured?: boolean;
  inStock: boolean;
  stockCount: number;
  tag?: string;
}

export interface Category {
  id: number | string;
  name: string;
  slug: string;
  image: string;
  itemCount: number;
  description: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor: ProductColor;
  selectedSize: string;
}

export interface Coupon {
  code: string;
  discountPercentage?: number;
  discountFixed?: number;
  minAmount?: number;
  description: string;
}

export interface OrderItem {
  productId: string | number;
  productName: string;
  price: number;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
  image: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  paymentMethod: string;
  shippingAddress: string;
  couponUsed?: string;
}

export interface TomatoApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// === AUTH TYPES ===
export type UserRole = 'admin' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface AuthTokenPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  name: string;
  iat: number; // issued at (unix seconds)
  exp: number; // expiration (unix seconds)
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  name: string;
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

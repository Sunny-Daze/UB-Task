export type CartStatus = 'active' | 'checked_out';

export interface Cart {
  id: string;
  user_id: string;
  status: CartStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
}

export interface CartItemDetailed {
  product_id: string;
  name: string;
  price: number;
  image_uri: string | null;
  quantity: number;
  line_total: number;
}

export interface CartView {
  id: string | null;
  status: CartStatus | null;
  items: CartItemDetailed[];
  subtotal: number;
  item_count: number;
}
